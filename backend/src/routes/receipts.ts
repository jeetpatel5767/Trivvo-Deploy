import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { blockchainService } from '../services/blockchain';
import { hcsMessageUrl } from '../services/hederaReceipts';

const router = Router();
const MIRROR = process.env.HEDERA_MIRROR_URL || 'https://testnet.mirrornode.hedera.com';

const WORLD_ID_SCAN = 'https://world.org'; // nullifiers aren't individually browsable; shown as proof text
const ZG_LABEL = '0G Private Computer';

/** Shape one events row into a timeline line with the right outbound proof link. */
function toLine(e: any) {
    const links: Array<{ kind: string; label: string; url?: string; value?: string }> = [];
    if (e.hcs_topic_id && e.hcs_sequence != null) {
        links.push({ kind: 'hedera', label: 'Hedera receipt', url: hcsMessageUrl(e.hcs_topic_id, e.hcs_sequence) });
    }
    if (e.tx_hash && /^0x[0-9a-fA-F]{64}$/.test(e.tx_hash)) {
        links.push({ kind: 'worldchain', label: 'World Chain tx', url: blockchainService.getExplorerUrl(e.tx_hash) });
    }
    if (e.nullifier_hash) {
        links.push({ kind: 'world', label: 'World ID human', value: `${String(e.nullifier_hash).slice(0, 14)}…`, url: WORLD_ID_SCAN });
    }
    if (e.zg_request_id) {
        links.push({ kind: 'zg', label: ZG_LABEL, value: String(e.zg_request_id).slice(0, 18) });
    }
    return {
        type: e.type,
        wallet: e.wallet_address,
        at: e.created_at,
        hcsSequence: e.hcs_sequence != null ? Number(e.hcs_sequence) : null,
        links,
        detail: e.detail || {},
    };
}

/** GET /api/receipts/topic — decoded public receipt trail from Hedera HCS (T24). */
router.get('/receipts/topic', async (req: Request, res: Response) => {
    try {
        const topic = process.env.HEDERA_TOPIC_ID;
        if (!topic) return res.status(503).json({ error: 'Hedera topic not configured' });
        const limit = Math.min(Number(req.query.limit) || 25, 100);
        const r = await fetch(`${MIRROR}/api/v1/topics/${topic}/messages?limit=${limit}&order=desc`);
        if (!r.ok) return res.status(502).json({ error: 'Mirror node unavailable' });
        const data: any = await r.json();
        const messages = (data.messages || []).map((m: any) => {
            let body: unknown = null;
            try { body = JSON.parse(Buffer.from(m.message, 'base64').toString('utf8')); } catch { body = null; }
            return {
                sequenceNumber: m.sequence_number,
                consensusTimestamp: m.consensus_timestamp,
                body,
                explorerUrl: `https://hashscan.io/testnet/topic/${topic}/message/${m.sequence_number}`,
            };
        });
        return res.json({ topicId: topic, messages });
    } catch (error: any) {
        console.error('Receipt feed error:', error.message);
        return res.status(500).json({ error: 'Failed to load receipts' });
    }
});

/** GET /api/rewards?walletAddress=... — past hunts, rewards and proof links for one wallet (T25). */
router.get('/rewards', async (req: Request, res: Response) => {
    try {
        const wallet = String(req.query.walletAddress || '').toLowerCase();
        if (!wallet) return res.status(400).json({ error: 'walletAddress is required' });
        const rows = await pool.query(
            `SELECT h.hunt_id, h.title, h.arrival_reward, h.main_reward,
                    p.reward_tx_hash, p.task_completed, p.created_at
             FROM participants p JOIN hunts h ON h.hunt_id = p.hunt_id
             WHERE p.wallet_address = $1
             ORDER BY p.created_at DESC`, [wallet]);
        return res.json({
            walletAddress: wallet,
            rewards: rows.rows.map((r: any) => ({
                huntId: r.hunt_id,
                title: r.title,
                arrivalReward: r.arrival_reward,
                mainReward: r.main_reward,
                taskCompleted: r.task_completed,
                txHash: r.reward_tx_hash || null,
                explorerUrl: r.reward_tx_hash ? blockchainService.getExplorerUrl(r.reward_tx_hash) : null,
                date: r.created_at,
            })),
        });
    } catch (error: any) {
        console.error('Rewards list error:', error.message);
        return res.status(500).json({ error: 'Failed to load rewards' });
    }
});

/**
 * F3: GET /api/receipts/:huntId — public (no login) receipt trail for ONE hunt.
 * Reads our events table (hunt-scoped and reliable; Mirror Node can't filter by hunt)
 * and links each money line to HashScan + the World Chain explorer.
 */
router.get('/receipts/:huntId', async (req: Request, res: Response) => {
    try {
        const huntId = req.params.huntId;
        const hunt = (await pool.query(
            `SELECT h.hunt_id, h.title, v.business_name
             FROM hunts h JOIN vendors v ON v.vendor_id = h.vendor_id WHERE h.hunt_id = $1`,
            [huntId]
        )).rows[0];
        if (!hunt) return res.status(404).json({ error: 'Hunt not found', code: 'hunt_not_found' });

        const rows = (await pool.query(
            `SELECT type, wallet_address, tx_hash, nullifier_hash, zg_request_id, hcs_topic_id, hcs_sequence, detail, created_at
             FROM events WHERE hunt_id = $1 ORDER BY created_at ASC`,
            [huntId]
        )).rows;

        const verifiedOnHedera = rows.filter((r) => r.hcs_sequence != null).length;
        return res.json({
            huntId,
            title: hunt.title,
            businessName: hunt.business_name,
            topicId: process.env.HEDERA_TOPIC_ID || null,
            verifiedOnHedera,
            lines: rows.map(toLine),
        });
    } catch (error: any) {
        console.error('Receipt page error:', error.message);
        return res.status(500).json({ error: 'Failed to load the receipt' });
    }
});

/**
 * F5: GET /api/stamps/:wallet — the hunter's TVSTAMP count from the Hedera Mirror Node.
 * Mirror Node accepts the EVM address directly (proven in S2), so this is one fetch.
 */
router.get('/stamps/:wallet', async (req: Request, res: Response) => {
    try {
        const wallet = String(req.params.wallet || '');
        const tokenId = process.env.HEDERA_TOKEN_ID;
        if (!tokenId) return res.json({ wallet, stamps: 0, tokenId: null });
        const r = await fetch(`${MIRROR}/api/v1/accounts/${wallet}/tokens?token.id=${tokenId}`);
        if (!r.ok) return res.json({ wallet, stamps: 0, tokenId });
        const data: any = await r.json();
        const row = (data.tokens || []).find((t: any) => t.token_id === tokenId);
        return res.json({
            wallet,
            stamps: row ? Number(row.balance) || 0 : 0,
            tokenId,
            explorerUrl: `https://hashscan.io/testnet/token/${tokenId}`,
        });
    } catch (error: any) {
        console.error('Stamps fetch error:', error.message);
        return res.json({ wallet: req.params.wallet, stamps: 0, tokenId: process.env.HEDERA_TOKEN_ID || null });
    }
});

/**
 * F4: GET /api/vendors/:wallet/trust — "N payouts verified on Hedera" for a vendor.
 * Counts paid events (arrival/main) across the vendor's hunts that carry an HCS sequence.
 */
router.get('/vendors/:wallet/trust', async (req: Request, res: Response) => {
    try {
        const wallet = String(req.params.wallet || '').toLowerCase();
        const r = await pool.query(
            `SELECT COUNT(*)::int AS verified
             FROM events e
             JOIN hunts h ON h.hunt_id = e.hunt_id
             JOIN vendors v ON v.vendor_id = h.vendor_id
             WHERE v.wallet_address = $1
               AND e.type IN ('arrival_paid','reward_paid')
               AND e.hcs_sequence IS NOT NULL`,
            [wallet]
        );
        return res.json({ wallet, verifiedPayouts: r.rows[0].verified, topicId: process.env.HEDERA_TOPIC_ID || null });
    } catch (error: any) {
        console.error('Vendor trust error:', error.message);
        return res.status(500).json({ error: 'Failed to load vendor trust' });
    }
});

/**
 * G1: GET /api/hunts/:huntId/timeline?wallet=... — one hunter's trust timeline for a hunt.
 * Each step carries the proofs from all four sponsors (World nullifier, 0G request id,
 * Hedera HCS message, World Chain tx). Public: it's a proof trail, no secrets.
 */
router.get('/hunts/:huntId/timeline', async (req: Request, res: Response) => {
    try {
        const huntId = req.params.huntId;
        const wallet = String(req.query.wallet || '').toLowerCase();
        if (!wallet) return res.status(400).json({ error: 'wallet is required' });

        const rows = (await pool.query(
            `SELECT type, wallet_address, tx_hash, nullifier_hash, zg_request_id, hcs_topic_id, hcs_sequence, detail, created_at
             FROM events WHERE hunt_id = $1 AND (wallet_address = $2 OR type = 'hunt_funded')
             ORDER BY created_at ASC`,
            [huntId, wallet]
        )).rows;

        return res.json({ huntId, wallet, steps: rows.map(toLine) });
    } catch (error: any) {
        console.error('Timeline error:', error.message);
        return res.status(500).json({ error: 'Failed to load the timeline' });
    }
});

export default router;
