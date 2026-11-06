import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { verifyWorldResult, createRpSignature, isWorldConfigured } from '../services/worldId';
import { credentialIdOf } from '../services/tier';
import { recordReceipt } from '../services/hederaReceipts';
import { requireAuth } from '../middleware/auth';

const router = Router();
const ACTIONS = ['tr-vvo-arrival', 'tr-vvo-main'];

/**
 * POST /api/verify/world/signature  (T09 support)
 * Body: { action }  -> returns the RP signature the frontend passes to IDKit.
 */
router.post('/verify/world/signature', (req: Request, res: Response) => {
    const { action } = req.body as { action?: string };
    if (!action || !ACTIONS.includes(action)) {
        return res.status(400).json({ error: 'action must be tr-vvo-arrival or tr-vvo-main' });
    }
    try {
        return res.json(createRpSignature(action));
    } catch (err: any) {
        return res.status(503).json({ error: err.message, code: 'not_configured' });
    }
});

/**
 * POST /api/verify/world  (T08)
 * Body: { huntId, walletAddress, action, result }  where result is the full IDKit result.
 * Validates on World ID, then stores the nullifier once per hunt.
 */
router.post('/verify/world', requireAuth, async (req: Request, res: Response) => {
    try {
        const { huntId, action, result } = req.body as { huntId?: string; action?: string; result?: any };
        const walletAddress = (req as any).walletAddress as string;

        if (!huntId || !action || !result) {
            return res.status(400).json({ success: false, code: 'bad_request', error: 'Missing huntId, action or result' });
        }
        if (!ACTIONS.includes(action)) {
            return res.status(400).json({ success: false, code: 'bad_action', error: 'Unknown action' });
        }
        if (!isWorldConfigured()) {
            return res.status(503).json({ success: false, code: 'not_configured', error: 'World ID is not configured on the server' });
        }

        const wallet = walletAddress.toLowerCase();
        const hunt = await pool.query('SELECT hunt_id FROM hunts WHERE hunt_id = $1', [huntId]);
        if (hunt.rows.length === 0) {
            return res.status(404).json({ success: false, code: 'hunt_not_found', error: 'Hunt not found' });
        }

        // Validate on the World ID backend (never trust the client)
        const check = await verifyWorldResult(result);
        if (!check.success || !check.nullifier) {
            return res.status(400).json({
                success: false,
                code: check.code || 'verification_failed',
                error: 'Human verification was not completed. Reward is locked.',
                detail: check.detail,
            });
        }

        // One human = one claim per hunt
        try {
            await pool.query(
                `INSERT INTO nullifiers (hunt_id, nullifier_hash, wallet_address, action, verification_level)
                 VALUES ($1, $2, $3, $4, $5)`,
                [huntId, check.nullifier, wallet, action.replace('tr-vvo-', ''), credentialIdOf(result)]
            );
        } catch (dbErr: any) {
            if (dbErr.code === '23505') {
                // Same human, same hunt, same check. Same wallet = a harmless repeat (refresh, coming back);
                // a different wallet = one person trying to claim twice.
                const prior = await pool.query(
                    `SELECT wallet_address FROM nullifiers WHERE hunt_id = $1 AND nullifier_hash = $2 AND action = $3`,
                    [huntId, check.nullifier, action.replace('tr-vvo-', '')]
                );
                if (prior.rows[0]?.wallet_address === wallet) {
                    return res.json({ success: true, action, nullifierHash: check.nullifier, alreadyVerified: true });
                }
                return res.status(409).json({ success: false, code: 'duplicate_human', error: 'This verified human has already claimed in this hunt.' });
            }
            throw dbErr;
        }

        // F1: public receipt that a unique human was verified (no personal data, just the nullifier).
        await recordReceipt({
            huntId, type: 'human_verified', wallet, nullifierHash: check.nullifier,
            detail: { action: action.replace('tr-vvo-', '') },
        });

        return res.json({ success: true, action, nullifierHash: check.nullifier });
    } catch (error: any) {
        console.error('World verify error:', error.message);
        return res.status(500).json({ success: false, code: 'server_error', error: 'Human verification failed' });
    }
});

export default router;
