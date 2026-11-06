import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { verifyPhotoWithZg, isZgConfigured } from '../services/zgCompute';
import { decideOutcome, MAX_PHOTO_ATTEMPTS, AiResult } from '../services/photoDecision';
import { getHuntProgress } from '../services/taskProgress';
import { promptForTask } from '../services/rubric';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * GET /api/hunts/:id/progress  (C4)
 * Per-task status for the signed-in hunter, derived from task_proofs (+ arrival), via the
 * shared getHuntProgress helper so this and the auto main-reward claim agree on "approved".
 */
router.get('/hunts/:id/progress', requireAuth, async (req: Request, res: Response) => {
    try {
        const progress = await getHuntProgress(req.params.id, (req as any).walletAddress as string);
        if (!progress) return res.status(404).json({ error: 'Hunt not found' });
        return res.json(progress);
    } catch (error: any) {
        console.error('Progress error:', error.message);
        return res.status(500).json({ error: 'Failed to load progress' });
    }
});

/**
 * POST /api/photo-check  (T14 wiring, T17 queue)
 * Body: { huntId, walletAddress, taskIndex, taskText, imageDataUrl }
 * Returns the outcome. The AI verdict decides; 0G down -> vendor_review, never a silent pass.
 */
router.post('/photo-check', requireAuth, async (req: Request, res: Response) => {
    try {
        const { huntId, taskIndex, taskText, imageDataUrl } = req.body as {
            huntId?: string; taskIndex?: number; taskText?: string; imageDataUrl?: string;
        };
        if (!huntId || taskIndex === undefined || !taskText || !imageDataUrl) {
            return res.status(400).json({ error: 'Missing huntId, taskIndex, taskText or imageDataUrl' });
        }
        if (!imageDataUrl.startsWith('data:image/')) {
            return res.status(400).json({ error: 'imageDataUrl must be a data:image/... URL' });
        }
        const wallet = (req as any).walletAddress as string;

        // D1: judge against the hunt's stored rubric for this task (server-side, not the client's text).
        const huntRow = (await pool.query('SELECT tasks FROM hunts WHERE hunt_id = $1', [huntId])).rows[0];
        const storedTasks = Array.isArray(huntRow?.tasks) ? huntRow.tasks : [];
        const storedTask = storedTasks[taskIndex as number];
        const judgeText = storedTask ? promptForTask(storedTask) : taskText;

        // Attempts used so far for this task
        const used = await pool.query(
            'SELECT COUNT(*)::int AS n FROM task_proofs WHERE hunt_id=$1 AND wallet_address=$2 AND task_index=$3',
            [huntId, wallet, taskIndex]
        );
        const attemptsSoFar = used.rows[0].n;
        if (attemptsSoFar >= MAX_PHOTO_ATTEMPTS) {
            // Out of retries: vendor reviews
        }

        // Ask 0G (null when unavailable). D3: any failure -> ai stays null -> vendor_review.
        let ai: AiResult | null = null;
        let aiModel: string | null = null;
        let aiVerifiable = false;
        let zgError: string | null = null;
        if (isZgConfigured()) {
            try {
                const v = await verifyPhotoWithZg(judgeText, imageDataUrl);
                ai = { ok: v.ok, confidence: v.confidence, reason: v.reason, requestId: v.requestId };
                aiModel = v.model;
                aiVerifiable = v.verifiable;
            } catch (e: any) {
                zgError = e.message;
            }
        } else {
            zgError = 'ZG_API_KEY not set';
        }

        const decision = decideOutcome(ai, attemptsSoFar);
        const attempt = attemptsSoFar + 1;

        // D3: log the 0G request id (or the failure reason) so we can trace every verdict.
        console.log(
            `[0G] hunt=${huntId} task=${taskIndex} attempt=${attempt} -> ${decision.status}` +
            (ai ? ` reqId=${ai.requestId} conf=${ai.confidence}` : ` (ai unavailable: ${zgError || 'n/a'})`)
        );

        await pool.query(
            `INSERT INTO task_proofs (hunt_id, wallet_address, task_index, attempt, review_status, ai_match, ai_confidence, ai_reason, zg_request_id, image)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [huntId, wallet, taskIndex, attempt, decision.status,
             ai ? ai.ok : null, ai ? ai.confidence : null, decision.reason, ai ? ai.requestId : null, imageDataUrl]
        );

        return res.json({
            status: decision.status,
            reason: decision.reason,
            autoReleased: decision.autoReleased,
            attempt,
            attemptsLeft: Math.max(0, MAX_PHOTO_ATTEMPTS - attempt),
            confidence: ai ? ai.confidence : null,
            zgRequestId: ai ? ai.requestId : null,
            model: aiModel,
            verifiable: aiVerifiable,
            aiAvailable: ai !== null,
            // Shown to the team in logs only; never to the hunter
            zgError: zgError ? 'unavailable' : null,
        });
    } catch (error: any) {
        console.error('Photo check error:', error.message);
        return res.status(500).json({ error: 'Photo check failed' });
    }
});

export default router;
