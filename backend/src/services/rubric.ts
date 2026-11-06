import axios from 'axios';
import { ZG_MODEL, isZgConfigured, zgHeaders } from './zgCompute';

/**
 * D1: 0G writes a short "what the photo must show" rubric for each task when a hunt is
 * created. The vendor can edit it; the rubric is then used as the instruction in the
 * photo-verification prompt (so 0G judges against the vendor's real intent, not just the
 * task title). This is the SECOND load-bearing 0G use (the first is judging photos).
 *
 * If 0G is unavailable (no key, or no TEE provider right now), we fall back to the task
 * title as its own rubric — the hunt still works, the prompt is just less specific.
 */

const BASE = process.env.ZG_BASE_URL || 'https://router-api.0g.ai/v1';

export interface TaskRubric {
    title: string;
    rubric: string;         // the "what the photo must show" instruction
    rubricRequestId?: string | null;   // 0G completion id, shown on the create screen (D1)
    rubricByAi: boolean;    // true if 0G wrote it, false if we fell back to the title
}

/** Generate a rubric for one task title. Never throws — falls back to the title. */
async function rubricForTask(title: string): Promise<TaskRubric> {
    const fallback: TaskRubric = { title, rubric: title, rubricRequestId: null, rubricByAi: false };
    if (!isZgConfigured() || !title.trim()) return fallback;

    try {
        const prompt =
            `A shop runs a location hunt. For the task below, write ONE short sentence (max 20 words) ` +
            `describing exactly what a hunter's photo must clearly show to count as proof. No preamble.\n` +
            `Task: "${title}"`;
        const res = await axios.post(
            `${BASE}/chat/completions`,
            { model: ZG_MODEL, temperature: 0.2, max_tokens: 80, messages: [{ role: 'user', content: prompt }] },
            { headers: zgHeaders(), timeout: 30000, validateStatus: () => true }
        );
        if (res.status < 200 || res.status >= 300) return fallback;
        const text = String(res.data?.choices?.[0]?.message?.content ?? '').trim().replace(/^["']|["']$/g, '');
        if (!text) return fallback;
        return { title, rubric: text.slice(0, 240), rubricRequestId: res.data?.id || null, rubricByAi: true };
    } catch {
        return fallback;
    }
}

/**
 * Build rubrics for a list of task titles (what POST /hunts receives).
 * Runs them in parallel; each one independently falls back on failure.
 */
export async function buildRubrics(titles: string[]): Promise<TaskRubric[]> {
    return Promise.all(titles.map((t) => rubricForTask(String(t || ''))));
}

/** The instruction to judge a photo against: the vendor's rubric if set, else the title. */
export function promptForTask(task: { title?: string; rubric?: string } | string): string {
    if (typeof task === 'string') return task;
    return (task.rubric && task.rubric.trim()) || task.title || '';
}
