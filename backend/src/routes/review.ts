import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { recordReceipt } from '../services/hederaReceipts';
import { requireAuth, isHuntOwner } from '../middleware/auth';

const router = Router();

/**
 * GET /api/reviews?huntId=...   (T17)
 * Lists photos the AI sent to the vendor (review_status = vendor_review, not yet decided).
 * Only the hunt's own vendor (signed-in wallet) can see them.
 */
router.get('/reviews', requireAuth, async (req: Request, res: Response) => {
    try {
        const huntId = String(req.query.huntId || '');
        if (!huntId) return res.status(400).json({ error: 'huntId is required' });
        if (!(await isHuntOwner(huntId, (req as any).walletAddress))) {
            return res.status(403).json({ error: 'Not the vendor of this hunt', code: 'not_owner' });
        }

        const rows = await pool.query(
            `SELECT id, wallet_address, task_index, attempt, ai_match, ai_confidence, ai_reason, zg_request_id, image, created_at
             FROM task_proofs
             WHERE hunt_id = $1 AND review_status = 'vendor_review' AND vendor_decision IS NULL
             ORDER BY created_at ASC`, [huntId]);
        // D2: include the task title/rubric so the vendor sees what the photo was meant to show.
        const tasks = (await pool.query('SELECT tasks FROM hunts WHERE hunt_id = $1', [huntId])).rows[0]?.tasks || [];
        const taskTitle = (i: number) => {
            const t = Array.isArray(tasks) ? tasks[i] : undefined;
            return typeof t === 'string' ? t : t?.title || `Task ${i + 1}`;
        };
        return res.json({
            reviews: rows.rows.map((r: any) => ({ ...r, task_title: taskTitle(r.task_index), model: process.env.ZG_MODEL || null })),
        });
    } catch (error: any) {
        console.error('Review list error:', error.message);
        return res.status(500).json({ error: 'Failed to load reviews' });
    }
});

/**
 * POST /api/reviews/:id/decision   (T17)
 * Body: { decision: 'approve' | 'reject' }
 * Records the vendor decision once. Only the hunt's own vendor can decide.
 */
router.post('/reviews/:id/decision', requireAuth, async (req: Request, res: Response) => {
    try {
        const { decision } = req.body as { decision?: string };
        if (!['approve', 'reject'].includes(String(decision))) {
            return res.status(400).json({ error: 'decision (approve|reject) is required' });
        }
        const wallet = (req as any).walletAddress as string;

        const row = await pool.query(
            `SELECT p.id, p.vendor_decision, p.wallet_address, p.task_index, p.zg_request_id, h.hunt_id, v.wallet_address AS owner
             FROM task_proofs p
             JOIN hunts h ON h.hunt_id = p.hunt_id
             JOIN vendors v ON v.vendor_id = h.vendor_id
             WHERE p.id = $1 AND p.review_status = 'vendor_review'`, [req.params.id]);
        if (row.rows.length === 0) return res.status(404).json({ error: 'Review not found' });
        const proof = row.rows[0];
        if (proof.owner !== wallet) return res.status(403).json({ error: 'Not the vendor of this hunt', code: 'not_owner' });
        if (proof.vendor_decision) return res.status(409).json({ error: 'Already decided' });

        await pool.query(
            `UPDATE task_proofs SET vendor_decision = $1, reviewed_at = NOW() WHERE id = $2`,
            [decision, req.params.id]);

        // F1: a vendor approval is a trust moment on the timeline.
        if (decision === 'approve') {
            await recordReceipt({
                huntId: proof.hunt_id, type: 'photo_approved', wallet: proof.wallet_address,
                zgRequestId: proof.zg_request_id, detail: { taskIndex: proof.task_index, by: 'vendor' },
            });
        }

        return res.json({ success: true, decision });
    } catch (error: any) {
        console.error('Review decision error:', error.message);
        return res.status(500).json({ error: 'Failed to record decision' });
    }
});

export default router;
