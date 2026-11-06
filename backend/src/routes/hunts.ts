import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { blockchainService } from '../services/blockchain';
import { recordReceipt } from '../services/hederaReceipts';
import { buildRubrics } from '../services/rubric';
import { requireAuth, isHuntOwner } from '../middleware/auth';

const router = Router();

/** Every hunt that leaves a public route goes through here: the QR secret never does (A2). */
function applyDynamicStatus(hunt: any) {
    delete hunt.qr_secret;
    if (hunt.status === 'active') {
        const now = new Date();
        const start = new Date(hunt.start_time);
        const end = new Date(hunt.end_time);
        if (now < start) {
            hunt.status = 'upcoming';
        } else if (now > end) {
            hunt.status = 'expired';
        }
    }
    return hunt;
}

/**
 * Tasks stay hidden until a hunter has checked in. The public hunt routes send only how many
 * tasks there are; the titles come back with the arrival payout (/scan) and from /progress.
 * The photo rubric (what the AI judges against) is never sent to a hunter at all.
 */
function hidePrivate(hunt: any) {
    hunt.task_count = Array.isArray(hunt.tasks) ? hunt.tasks.length : 0;
    delete hunt.tasks;
    return hunt;
}

/*
 * A3 lifecycle. Stored status: 'pending' (draft, not funded) -> 'active' (funded) -> 'ended' (withdrawn).
 * applyDynamicStatus turns 'active' into 'upcoming' / 'active' (live) / 'expired' from the clock.
 */
const HUNT_LIST_SQL = `SELECT h.*, v.business_name, v.wallet_address as vendor_wallet,
                    COALESCE(a.views, 0) as views,
                    COALESCE(a.qr_scans, 0) as qr_scans,
                    COALESCE(a.active_participants, 0) as active_participants,
                    COALESCE(a.rewards_distributed, 0) as rewards_distributed
       FROM hunts h
       JOIN vendors v ON h.vendor_id = v.vendor_id
       LEFT JOIN analytics a ON h.hunt_id = a.hunt_id`;

// GET /api/hunts — what hunters can join: funded hunts that are live or upcoming
router.get('/hunts', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(`${HUNT_LIST_SQL} WHERE h.status = 'active' ORDER BY h.start_time ASC`);
        const hunts = result.rows.map(applyDynamicStatus).filter((h: any) => h.status !== 'expired').map(hidePrivate);
        return res.json({ hunts });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to fetch hunts' });
    }
});

// GET /api/hunts/mine — every hunt of the signed-in vendor, drafts included
router.get('/hunts/mine', requireAuth, async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `${HUNT_LIST_SQL} WHERE v.wallet_address = $1 ORDER BY h.created_at DESC`,
            [(req as any).walletAddress]
        );
        return res.json({ hunts: result.rows.map(applyDynamicStatus) });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to fetch your hunts' });
    }
});

// GET /api/hunts/:id — hunt detail
router.get('/hunts/:id', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT h.*, v.business_name, v.wallet_address as vendor_wallet,
                    COALESCE(a.views, 0) as views,
                    COALESCE(a.qr_scans, 0) as qr_scans,
                    COALESCE(a.active_participants, 0) as active_participants,
                    COALESCE(a.rewards_distributed, 0) as rewards_distributed
       FROM hunts h 
       JOIN vendors v ON h.vendor_id = v.vendor_id 
       LEFT JOIN analytics a ON h.hunt_id = a.hunt_id
       WHERE h.hunt_id = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Hunt not found' });
        }

        // Increment views
        await pool.query(
            `INSERT INTO analytics (hunt_id, views) VALUES ($1, 1) 
       ON CONFLICT (hunt_id) DO UPDATE SET views = analytics.views + 1, updated_at = NOW()`,
            [req.params.id]
        );

        let hunt = hidePrivate(applyDynamicStatus(result.rows[0]));

        // Fetch remaining funds from smart contract if available
        if (hunt.contract_hunt_id !== null) {
            try {
                const chainDetails = await blockchainService.getHuntDetails(hunt.contract_hunt_id);
                if (chainDetails) {
                    hunt.remaining_funds = chainDetails.remainingFunds;
                }
            } catch (err: any) {
                console.error("Failed to fetch on-chain hunt details:", err.message);
            }
        }

        return res.json({ hunt });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to fetch hunt' });
    }
});

// GET /api/hunts/:id/qr — the QR secret, for the hunt's own vendor only (A2)
router.get('/hunts/:id/qr', requireAuth, async (req: Request, res: Response) => {
    try {
        if (!(await isHuntOwner(req.params.id, (req as any).walletAddress))) {
            return res.status(403).json({ error: 'Not the vendor of this hunt', code: 'not_owner' });
        }
        const r = await pool.query('SELECT qr_secret FROM hunts WHERE hunt_id = $1', [req.params.id]);
        return res.json({ huntId: req.params.id, qrSecret: r.rows[0].qr_secret });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to load QR code' });
    }
});

// POST /api/hunts/rubric-preview — D1: 0G writes a photo rubric per task title (before create).
router.post('/hunts/rubric-preview', requireAuth, async (req: Request, res: Response) => {
    try {
        const titles = (req.body?.titles as unknown[] | undefined) || [];
        if (!Array.isArray(titles)) return res.status(400).json({ error: 'titles must be an array' });
        const rubrics = await buildRubrics(titles.map((t) => String(t || '')));
        return res.json({ tasks: rubrics });
    } catch (error: any) {
        console.error('Rubric preview error:', error.message);
        return res.status(500).json({ error: 'Failed to generate rubrics' });
    }
});

// POST /api/hunts — create hunt
router.post('/hunts', requireAuth, async (req: Request, res: Response) => {
    try {
        const vendorWallet = (req as any).walletAddress as string;
        const {
            title, description,
            locationLat, locationLng, locationName,
            startTime, endTime,
            arrivalReward, mainReward, tasks, radiusM
        } = req.body;

        // Find vendor
        const vendorResult = await pool.query(
            'SELECT vendor_id FROM vendors WHERE wallet_address = $1',
            [vendorWallet.toLowerCase()]
        );
        if (vendorResult.rows.length === 0) {
            return res.status(404).json({ error: 'Vendor not found. Please login first.' });
        }

        const vendorId = vendorResult.rows[0].vendor_id;
        const qrSecret = crypto.randomBytes(32).toString('hex');

        // D1: normalise tasks to titles, then let 0G write a photo rubric for each.
        // If the vendor already sent rubric objects (edited on the create screen), keep them.
        const rawTasks: any[] = Array.isArray(tasks) ? tasks : [];
        const titles = rawTasks.map((t) => (typeof t === 'string' ? t : t?.title || ''));
        const needRubrics = rawTasks.some((t) => typeof t === 'string' || !t?.rubric);
        const rubrics = needRubrics ? await buildRubrics(titles) : null;
        const taskObjs = rawTasks.map((t, i) => {
            if (typeof t === 'object' && t?.rubric) return t; // vendor-provided rubric, keep as-is
            const r = rubrics?.[i];
            return {
                title: titles[i],
                rubric: r?.rubric || titles[i],
                rubricRequestId: r?.rubricRequestId ?? null,
                rubricByAi: r?.rubricByAi ?? false,
            };
        });

        const result = await pool.query(
            `INSERT INTO hunts (vendor_id, title, description, location_lat, location_lng, location_name, start_time, end_time, arrival_reward, main_reward, qr_secret, tasks, radius_m, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending')
       RETURNING *`,
            [vendorId, title, description, locationLat, locationLng, locationName, startTime, endTime, arrivalReward, mainReward, qrSecret, JSON.stringify(taskObjs), Number(radiusM) > 0 ? Math.round(Number(radiusM)) : 150]
        );

        // Create analytics entry
        await pool.query(
            'INSERT INTO analytics (hunt_id) VALUES ($1)',
            [result.rows[0].hunt_id]
        );

        return res.json({ hunt: result.rows[0] });
    } catch (error: any) {
        console.error('Create hunt error:', error.message);
        return res.status(500).json({ error: 'Failed to create hunt' });
    }
});

const FUND_ERRORS: Record<string, string> = {
    bad_tx_hash: 'That is not a transaction hash.',
    tx_not_found: 'That transaction is not on chain yet. Wait a few seconds and try again.',
    tx_failed: 'That transaction failed on chain.',
    not_a_funding_tx: 'That transaction did not fund a Tr!vvo hunt.',
    wrong_vendor: 'That escrow hunt belongs to a different wallet.',
    reward_mismatch: 'The rewards on chain do not match this hunt.',
    not_enough_funds: 'The escrow needs at least one arrival + one main reward before the hunt can go live.',
    already_linked: 'That escrow hunt is already linked to another hunt.',
};

/**
 * POST /api/hunts/fund — B4: the hunt goes live only after the chain confirms the funding.
 * Body: { huntId, txHash } where txHash is the vendor's fundHunt transaction.
 * The escrow hunt id, vendor, rewards and times are read from the chain, not from the request.
 */
router.post('/hunts/fund', requireAuth, async (req: Request, res: Response) => {
    try {
        const { huntId, txHash } = req.body as { huntId?: string; txHash?: string };
        const wallet = (req as any).walletAddress as string;
        if (!huntId || !txHash) return res.status(400).json({ error: 'huntId and txHash are required', code: 'bad_request' });
        if (!(await isHuntOwner(huntId, wallet))) {
            return res.status(403).json({ error: 'Not the vendor of this hunt', code: 'not_owner' });
        }
        const hunt = (await pool.query('SELECT * FROM hunts WHERE hunt_id = $1', [huntId])).rows[0];

        // No chain configured (local dev without a deployed escrow): go live without on-chain money.
        if (!blockchainService.configured) {
            console.log(`⚠️ Demo mode: hunt ${huntId} marked live without an escrow`);
            await pool.query(`UPDATE hunts SET status = 'active' WHERE hunt_id = $1`, [huntId]);
            return res.json({ success: true, demo: true });
        }

        const { hunt: chain, code } = await blockchainService.readFunding(txHash);
        let fail = code;
        if (!fail && chain!.vendor !== wallet) fail = 'wrong_vendor';
        if (!fail && (Number(chain!.arrivalReward) !== Number(hunt.arrival_reward) || Number(chain!.mainReward) !== Number(hunt.main_reward))) fail = 'reward_mismatch';
        if (!fail && !chain!.active) fail = 'not_enough_funds';
        if (!fail) {
            const other = await pool.query('SELECT 1 FROM hunts WHERE contract_hunt_id = $1 AND hunt_id <> $2', [chain!.contractHuntId, huntId]);
            if (other.rows.length) fail = 'already_linked';
        }
        if (fail) return res.status(400).json({ error: FUND_ERRORS[fail] || 'Funding could not be checked.', code: fail });

        // The chain is the source of truth for the hunt window (createHunt needs a future start).
        await pool.query(
            `UPDATE hunts SET contract_hunt_id = $1, status = 'active', start_time = to_timestamp($2), end_time = to_timestamp($3)
             WHERE hunt_id = $4`,
            [chain!.contractHuntId, chain!.startTime, chain!.endTime, huntId]
        );
        await recordReceipt({
            huntId, type: 'hunt_funded', wallet, txHash,
            detail: { contractHuntId: chain!.contractHuntId },
        });

        return res.json({
            success: true,
            contractHuntId: chain!.contractHuntId,
            txHash,
            explorerUrl: blockchainService.getExplorerUrl(txHash),
        });
    } catch (error: any) {
        console.error('Fund sync error:', error.message);
        return res.status(500).json({ error: 'Failed to record funding' });
    }
});

// PATCH /api/hunts/:id/tasks — D1: the vendor edits the 0G-written rubrics (owner only).
router.patch('/hunts/:id/tasks', requireAuth, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { tasks } = req.body as { tasks?: any[] };
        if (!Array.isArray(tasks)) return res.status(400).json({ error: 'tasks must be an array' });
        if (!(await isHuntOwner(id, (req as any).walletAddress))) {
            return res.status(403).json({ error: 'Not the vendor of this hunt', code: 'not_owner' });
        }
        // Keep the task shape { title, rubric, rubricRequestId, rubricByAi }; mark edited rubrics.
        const clean = tasks.map((t: any) => ({
            title: String(t?.title || ''),
            rubric: String(t?.rubric || t?.title || '').slice(0, 240),
            rubricRequestId: t?.rubricRequestId ?? null,
            rubricByAi: t?.rubricByAi === true,
        }));
        await pool.query(`UPDATE hunts SET tasks = $1 WHERE hunt_id = $2`, [JSON.stringify(clean), id]);
        return res.json({ success: true, tasks: clean });
    } catch (error: any) {
        console.error('Update tasks error:', error.message);
        return res.status(500).json({ error: 'Failed to update tasks' });
    }
});

// POST /api/hunts/:id/withdraw — record vendor withdrawal
router.post('/hunts/:id/withdraw', requireAuth, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { txHash } = req.body;
        if (!(await isHuntOwner(id, (req as any).walletAddress))) {
            return res.status(403).json({ error: 'Not the vendor of this hunt', code: 'not_owner' });
        }

        await pool.query(
            `UPDATE hunts SET status = 'ended' WHERE hunt_id = $1`,
            [id]
        );
        await recordReceipt({ huntId: id, type: 'hunt_withdrawn', wallet: (req as any).walletAddress, txHash });

        return res.json({ success: true, txHash });
    } catch (error: any) {
        console.error('Withdrawal sync error:', error.message);
        return res.status(500).json({ error: 'Failed to record withdrawal' });
    }
});

export default router;
