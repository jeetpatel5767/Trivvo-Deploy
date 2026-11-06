import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { verifyWorldResult, createRpSignature, isWorldConfigured } from '../services/worldId';
import { credentialIdOf } from '../services/tier';
import { recordReceipt } from '../services/hederaReceipts';
import { requireAuth } from '../middleware/auth';
import { ensureHuntAction, kindOfAction, type WorldCheckKind } from '../services/worldActions';

const router = Router();

/**
 * POST /api/verify/world/signature  (T09 support)
 * Body: { huntId, kind: 'arrival' | 'main' } -> this hunt's own World action (created on first
 * use) and the RP signature the frontend passes to IDKit for it.
 */
router.post('/verify/world/signature', async (req: Request, res: Response) => {
    const { huntId, kind } = req.body as { huntId?: string; kind?: WorldCheckKind };
    if (!huntId || (kind !== 'arrival' && kind !== 'main')) {
        return res.status(400).json({ error: 'huntId and kind (arrival|main) are required', code: 'bad_request' });
    }
    try {
        const hunt = (await pool.query('SELECT title FROM hunts WHERE hunt_id = $1', [huntId])).rows[0];
        if (!hunt) return res.status(404).json({ error: 'Hunt not found', code: 'hunt_not_found' });
        const action = await ensureHuntAction(huntId, kind, hunt.title);
        return res.json({ action, ...createRpSignature(action) });
    } catch (err: any) {
        console.error('World signature error:', err.message);
        return res.status(503).json({ error: 'The human check is not available right now. Try again.', code: 'not_configured' });
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
        // The proof must be for THIS hunt's action, or one proof could be replayed on other hunts.
        const kind = kindOfAction(action, huntId);
        if (!kind || (result.action !== undefined && result.action !== action)) {
            return res.status(400).json({ success: false, code: 'bad_action', error: 'That check was not for this hunt.' });
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
                [huntId, check.nullifier, wallet, kind, credentialIdOf(result)]
            );
        } catch (dbErr: any) {
            if (dbErr.code === '23505') {
                // Same human, same hunt, same check. Same wallet = a harmless repeat (refresh, coming back);
                // a different wallet = one person trying to claim twice.
                const prior = await pool.query(
                    `SELECT wallet_address FROM nullifiers WHERE hunt_id = $1 AND nullifier_hash = $2 AND action = $3`,
                    [huntId, check.nullifier, kind]
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
            detail: { action: kind },
        });

        return res.json({ success: true, action, nullifierHash: check.nullifier });
    } catch (error: any) {
        console.error('World verify error:', error.message);
        return res.status(500).json({ success: false, code: 'server_error', error: 'Human verification failed' });
    }
});

export default router;
