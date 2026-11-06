import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { verifyPhotoWithZg, isZgConfigured } from '../services/zgCompute';
import { decideOutcome, MAX_PHOTO_ATTEMPTS, AiResult } from '../services/photoDecision';
import { getHuntProgress } from '../services/taskProgress';
import { promptForTask } from '../services/rubric';
import { recordReceipt } from '../services/hederaReceipts';
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

        // Every attempt is a paid 0G call, so only a checked-in hunter, on a real task, still open, gets one.
        const progress = await getHuntProgress(huntId, wallet);
        if (!progress) return res.status(404).json({ error: 'Hunt not found', code: 'hunt_not_found' });
        if (!progress.arrived) return res.status(403).json({ error: 'Check in at the venue first.', code: 'not_arrived' });
        const task = Number.isInteger(taskIndex) ? progress.tasks[taskIndex as number] : undefined;
        if (!task) return res.status(400).json({ error: 'That task does not exist.', code: 'bad_task' });
        if (task.status === 'approved') return res.status(409).json({ error: 'This task is already done.', code: 'already_approved' });
        if (task.status === 'vendor_review') return res.status(409).json({ error: 'The vendor is reviewing this photo.', code: 'in_review' });
        if (task.attemptsLeft <= 0) return res.status(429).json({ error: 'No tries left for this task.', code: 'no_attempts_left' });

        // D1: judge against the hunt's stored rubric for this task (server-side, not the client's text).
        const huntRow = (await pool.query('SELECT tasks FROM hunts WHERE hunt_id = $1', [huntId])).rows[0];
        const storedTask = (Array.isArray(huntRow?.tasks) ? huntRow.tasks : [])[taskIndex as number];
        const judgeText = storedTask ? promptForTask(storedTask) : taskText;
        const attemptsSoFar = task.attemptsUsed;

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

        // F1: an AI approval is the main 0G trust moment, so it goes on the public Hedera trail too.
        if (decision.status === 'approved' && ai) {
            await recordReceipt({
                huntId, type: 'photo_approved', wallet, zgRequestId: ai.requestId,
                detail: { taskIndex, by: '0g', model: aiModel, confidence: ai.confidence },
            });
        }

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
