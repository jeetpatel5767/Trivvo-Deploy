import pool from '../db/pool';
import { MAX_PHOTO_ATTEMPTS } from './photoDecision';

/**
 * Shared task-progress logic (C4/C5). One definition of "a task is approved" so the
 * hunter's screen (GET /hunts/:id/progress) and the auto main-reward claim agree.
 *
 * A task is approved when its newest attempt is AI-approved, OR a vendor_review the
 * vendor approved. All approved (and the hunter arrived) is the gate for the main reward.
 */

export type TaskStatus = 'todo' | 'approved' | 'vendor_review' | 'retry' | 'blocked';

export interface TaskRow {
    taskIndex: number;
    /** Task title; only filled in once the hunter has arrived (tasks are hidden before that). */
    title: string | null;
    status: TaskStatus;
    attemptsUsed: number;
    attemptsLeft: number;
    reason: string | null;
    confidence: number | null;
    zgRequestId: string | null;
}

export interface HuntProgress {
    arrived: boolean;
    totalTasks: number;
    approvedCount: number;
    allApproved: boolean;
    maxAttempts: number;
    tasks: TaskRow[];
}

export async function getHuntProgress(huntId: string, wallet: string): Promise<HuntProgress | null> {
    const huntRes = await pool.query('SELECT tasks FROM hunts WHERE hunt_id = $1', [huntId]);
    if (huntRes.rows.length === 0) return null;
    const tasks = Array.isArray(huntRes.rows[0].tasks) ? huntRes.rows[0].tasks : [];

    const arrived = (await pool.query(
        'SELECT 1 FROM participants WHERE hunt_id = $1 AND wallet_address = $2',
        [huntId, wallet]
    )).rows.length > 0;

    const proofs = (await pool.query(
        `SELECT task_index, attempt, review_status, vendor_decision, ai_confidence, ai_reason, zg_request_id
         FROM task_proofs WHERE hunt_id = $1 AND wallet_address = $2
         ORDER BY task_index ASC, attempt DESC`,
        [huntId, wallet]
    )).rows;

    const perTask: TaskRow[] = tasks.map((t: unknown, i: number) => {
        const rawTitle = typeof t === 'string' ? t : (t as { title?: string } | null)?.title || '';
        const attempts = proofs.filter((p) => p.task_index === i);
        const used = attempts.length;
        const latest = attempts[0];
        const attemptsLeft = Math.max(0, MAX_PHOTO_ATTEMPTS - used);

        let status: TaskStatus = 'todo';
        if (latest) {
            if (latest.review_status === 'approved') status = 'approved';
            else if (latest.review_status === 'vendor_review') {
                status = latest.vendor_decision === 'approve' ? 'approved'
                    : latest.vendor_decision === 'reject' ? (attemptsLeft > 0 ? 'retry' : 'blocked')
                        : 'vendor_review';
            } else {
                status = attemptsLeft > 0 ? 'retry' : 'blocked';
            }
        }

        return {
            taskIndex: i,
            title: arrived ? rawTitle : null,
            status,
            attemptsUsed: used,
            attemptsLeft,
            reason: latest?.ai_reason ?? null,
            confidence: latest?.ai_confidence != null ? Number(latest.ai_confidence) : null,
            zgRequestId: latest?.zg_request_id ?? null,
        };
    });

    const approvedCount = perTask.filter((t) => t.status === 'approved').length;
    return {
        arrived,
        totalTasks: tasks.length,
        approvedCount,
        allApproved: tasks.length > 0 && approvedCount === tasks.length,
        maxAttempts: MAX_PHOTO_ATTEMPTS,
        tasks: perTask,
    };
}
