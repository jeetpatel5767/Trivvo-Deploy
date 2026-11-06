import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { blockchainService } from '../services/blockchain';
import { needsStrongCredential, isStrongCredential } from '../services/tier';
import { getHuntProgress } from '../services/taskProgress';
import { recordReceipt } from '../services/hederaReceipts';
import { sendStampToEvm } from '../hedera/hts';
import { isHederaConfigured } from '../hedera/hederaClient';
import { requireAuth } from '../middleware/auth';

const router = Router();

const CLAIM_ERRORS: Record<string, string> = {
    not_arrived: 'Check in at the venue before claiming the reward.',
    not_all_approved: 'Finish and pass every task first.',
    already_paid: 'You already received this reward.',
    strong_credential_required: 'This reward needs a stronger World ID check first.',
    hunt_not_found: 'That hunt no longer exists.',
    chain_error: 'The payout transaction failed on chain. Try again in a moment.',
};

/**
 * POST /api/reward/claim  (C5) — the hunter claims their own main reward.
 * Body: { huntId }. Wallet comes from the session token, never the body.
 *
 * The server is the only thing that can move money: it pays claimMainReward itself,
 * and only when EVERY task is approved (by 0G or the vendor) for this exact wallet+hunt.
 * Rewards over $5 also need a stronger World credential (the 'main' nullifier). This
 * replaces the old public /reward/main (vendor-triggered, wallet from the body) and the
 * public /task-complete, which let anyone pay any wallet (PLAN #1).
 */
router.post('/reward/claim', requireAuth, async (req: Request, res: Response) => {
    try {
        const { huntId } = req.body as { huntId?: string };
        const wallet = (req as any).walletAddress as string;
        if (!huntId) return res.status(400).json({ error: 'huntId is required', code: 'bad_request' });

        const huntRes = await pool.query('SELECT * FROM hunts WHERE hunt_id = $1', [huntId]);
        if (huntRes.rows.length === 0) return res.status(404).json({ error: CLAIM_ERRORS.hunt_not_found, code: 'hunt_not_found' });
        const hunt = huntRes.rows[0];

        // Gate 1: the hunter arrived and every task is approved.
        const progress = await getHuntProgress(huntId, wallet);
        if (!progress || !progress.arrived) return res.status(403).json({ error: CLAIM_ERRORS.not_arrived, code: 'not_arrived' });
        if (!progress.allApproved) return res.status(403).json({ error: CLAIM_ERRORS.not_all_approved, code: 'not_all_approved' });

        // Gate 2: not already paid.
        const participant = (await pool.query(
            'SELECT reward_tx_hash FROM participants WHERE hunt_id = $1 AND wallet_address = $2',
            [huntId, wallet]
        )).rows[0];
        if (participant?.reward_tx_hash) return res.status(409).json({ error: CLAIM_ERRORS.already_paid, code: 'already_paid' });

        // Gate 3: tier — a high-value main reward needs a stronger credential (the 'main' World check).
        if (needsStrongCredential(Number(hunt.main_reward))) {
            const strong = await pool.query(
                `SELECT verification_level FROM nullifiers WHERE hunt_id = $1 AND wallet_address = $2 AND action = 'main'`,
                [huntId, wallet]
            );
            const ok = strong.rows.some((r: any) => isStrongCredential(String(r.verification_level || '').toLowerCase()));
            if (!ok) return res.status(403).json({ error: CLAIM_ERRORS.strong_credential_required, code: 'strong_credential_required' });
        }

        // Pay on chain (demo mode returns a placeholder hash when no escrow is configured).
        let rewardTxHash = '';
        if (hunt.contract_hunt_id !== null) {
            try {
                rewardTxHash = await blockchainService.claimMainReward(hunt.contract_hunt_id, wallet);
            } catch (e: any) {
                console.error('Main reward chain error:', e.message);
                return res.status(502).json({ error: CLAIM_ERRORS.chain_error, code: 'chain_error' });
            }
        }

        await pool.query(
            `UPDATE participants SET reward_tx_hash = $1, task_completed = true WHERE hunt_id = $2 AND wallet_address = $3`,
            [rewardTxHash, huntId, wallet]
        );
        await pool.query(
            `UPDATE analytics SET rewards_distributed = rewards_distributed + $1, updated_at = NOW() WHERE hunt_id = $2`,
            [hunt.main_reward, huntId]
        );
        // F1: public receipt for the main payout (non-blocking Hedera publish).
        await recordReceipt({
            huntId, type: 'reward_paid', wallet, txHash: rewardTxHash,
            detail: { amount: hunt.main_reward },
        });

        // F2: send one HTS "stamp" to the hunter's EVM wallet on completion (non-blocking,
        // never fails the claim). The token id is 0.0.11307168 (HEDERA_TOKEN_ID).
        const tokenId = process.env.HEDERA_TOKEN_ID;
        if (isHederaConfigured() && tokenId) {
            sendStampToEvm(tokenId, wallet)
                .then((stampTxId) =>
                    recordReceipt({ huntId, type: 'stamp_sent', wallet, detail: { stampTxId, tokenId } })
                )
                .catch((e) => console.error('F2 stamp send failed:', e.message));
        }

        return res.json({
            success: true,
            mainReward: hunt.main_reward,
            rewardTxHash,
            explorerUrl: blockchainService.getExplorerUrl(rewardTxHash),
        });
    } catch (error: any) {
        console.error('Reward claim error:', error.message);
        return res.status(500).json({ error: 'Failed to release the reward', code: 'server_error' });
    }
});

export default router;
