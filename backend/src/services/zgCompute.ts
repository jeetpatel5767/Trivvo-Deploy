import axios from 'axios';

/**
 * 0G Private Computer client (T13).
 * OpenAI-compatible Router: https://router-api.0g.ai/v1/chat/completions
 * Used for the photo-proof check. Backend only: the API key never reaches the browser.
 */

const BASE = process.env.ZG_BASE_URL || 'https://router-api.0g.ai/v1';
const KEY = process.env.ZG_API_KEY || '';
export const ZG_MODEL = process.env.ZG_MODEL || '0gm-1.0-35b-a3b';

/**
 * 0G routing trust mode, sent as X-0G-Provider-Trust-Mode. It must match the API key's
 * default (set in the PC dashboard) or the router refuses with trust_mode_mismatch.
 *   standard: any provider, not attested · verified: attested (TeeTLS/TeeML) · private: TeeML enclave only
 */
export const ZG_TRUST_MODE = (process.env.ZG_TRUST_MODE || 'private').toLowerCase();

/** Headers for every 0G call. Only verified/private runs are attested, so only they count as verifiable. */
export const zgHeaders = () => ({
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    'X-0G-Provider-Trust-Mode': ZG_TRUST_MODE,
});
export const ZG_VERIFIABLE = ZG_TRUST_MODE === 'verified' || ZG_TRUST_MODE === 'private';

export interface PhotoVerdict {
    ok: boolean;
    confidence: number;      // 0..1
    reason: string;
    requestId: string;       // 0G / Router completion id, shown to the user and stored
    model: string;
    verifiable: boolean;     // true only when routed in verified/private (attested) mode
}

export function isZgConfigured(): boolean {
    return KEY.length > 0;
}

/**
 * Ask the vision model whether the photo shows the task.
 * imageDataUrl: "data:image/jpeg;base64,...."
 */
export async function verifyPhotoWithZg(taskText: string, imageDataUrl: string): Promise<PhotoVerdict> {
    if (!isZgConfigured()) throw new Error('ZG_API_KEY is not set');

    const prompt =
        `You check a hunter's photo proof for a location task.\n` +
        `Task: "${taskText}"\n` +
        `Reply ONLY with JSON: {"match": true|false, "confidence": 0-1, "reason": "one short sentence"}.`;

    const res = await axios.post(
        `${BASE}/chat/completions`,
        {
            model: ZG_MODEL,
            temperature: 0,
            max_tokens: 200,
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: imageDataUrl } },
                ],
            }],
        },
        {
            headers: zgHeaders(),
            timeout: 60000,
            validateStatus: () => true,
        }
    );

    if (res.status < 200 || res.status >= 300) {
        throw new Error(`0G PC error ${res.status}: ${JSON.stringify(res.data?.error ?? res.data).slice(0, 200)}`);
    }

    const requestId: string = res.data?.id || res.headers['x-request-id'] || 'unknown';
    const raw: string = res.data?.choices?.[0]?.message?.content ?? '';
    const parsed = parseVerdict(raw);

    return {
        ok: parsed.match,
        confidence: parsed.confidence,
        reason: parsed.reason,
        requestId,
        model: ZG_MODEL,
        verifiable: ZG_VERIFIABLE,
    };
}

/** Tolerant JSON parse: models sometimes wrap JSON in text or code fences. */
export function parseVerdict(raw: string): { match: boolean; confidence: number; reason: string } {
    const m = raw.match(/\{[\s\S]*\}/);
    try {
        const j = JSON.parse(m ? m[0] : raw);
        const confidence = Math.max(0, Math.min(1, Number(j.confidence) || 0));
        return { match: j.match === true, confidence, reason: String(j.reason || '').slice(0, 300) };
    } catch {
        return { match: false, confidence: 0, reason: 'Could not read the AI verdict. Please retry.' };
    }
}
