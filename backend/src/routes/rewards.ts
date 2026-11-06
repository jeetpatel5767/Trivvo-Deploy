import { Router, Request, Response } from 'express';
import { payMainReward, PAYOUT_ERRORS } from '../services/payout';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * POST /api/reward/claim  (C5) — the hunter claims their own main reward.
 * Body: { huntId }. Wallet comes from the session token, never the body.
 *
 * The server is the only thing that can move money: payMainReward pays claimMainReward
 * itself, and only when EVERY task is approved (by 0G or the vendor) for this exact
 * wallet+hunt. It usually already ran on its own when the last task was approved; then
 * this returns already_paid with the real transaction, or paying while it is in flight.
 */
router.post('/reward/claim', requireAuth, async (req: Request, res: Response) => {
    try {
        const { huntId } = req.body as { huntId?: string };
        const wallet = (req as any).walletAddress as string;
        if (!huntId) return res.status(400).json({ error: 'huntId is required', code: 'bad_request' });

        const r = await payMainReward(huntId, wallet);
        if (r.ok) {
            return res.json({ success: true, mainReward: r.mainReward, rewardTxHash: r.rewardTxHash, explorerUrl: r.explorerUrl });
        }
        return res.status(r.status).json({
            error: PAYOUT_ERRORS[r.code || ''] || 'The reward could not be released.',
            code: r.code,
            mainReward: r.mainReward,
            rewardTxHash: r.rewardTxHash,
            explorerUrl: r.explorerUrl,
        });
    } catch (error: any) {
        console.error('Reward claim error:', error.message);
        return res.status(500).json({ error: 'Failed to release the reward', code: 'server_error' });
    }
});

export default router;
