import axios from 'axios';
import { signRequest } from '@worldcoin/idkit-core/signing';

/**
 * World ID 4.0 server-side helpers.
 * - signRequest: creates the RP signature the frontend needs to start a proof request.
 * - verifyWorldResult: forwards the full IDKit result to POST /api/v4/verify/{rp_id}.
 * The client result is never trusted; the RP signing key never leaves the server.
 */

const RP_ID = process.env.RP_ID || '';
const RP_SIGNING_KEY = process.env.RP_SIGNING_KEY || '';
const VERIFY_BASE = process.env.WORLD_VERIFY_URL || 'https://developer.world.org/api/v4/verify';

export function isWorldConfigured(): boolean {
    return RP_ID.startsWith('rp_') && RP_SIGNING_KEY.length > 0;
}

export function createRpSignature(action: string) {
    if (!isWorldConfigured()) {
        throw new Error('World ID is not configured (RP_ID / RP_SIGNING_KEY)');
    }
    const { sig, nonce, createdAt, expiresAt } = signRequest({
        signingKeyHex: RP_SIGNING_KEY,
        action,
    });
    return { rp_id: RP_ID, sig, nonce, created_at: createdAt, expires_at: expiresAt };
}

export interface WorldVerifyResult {
    success: boolean;
    code?: string;
    detail?: string;
    nullifier?: string;
}

export async function verifyWorldResult(idkitResult: unknown): Promise<WorldVerifyResult> {
    if (!isWorldConfigured()) {
        return { success: false, code: 'not_configured', detail: 'World ID is not configured on the server' };
    }
    try {
        const res = await axios.post(`${VERIFY_BASE}/${RP_ID}`, idkitResult, {
            headers: { 'Content-Type': 'application/json' },
            validateStatus: () => true,
            timeout: 15000,
        });
        const data = res.data || {};
        if (res.status >= 200 && res.status < 300 && data.success === true) {
            const first = Array.isArray(data.results) ? data.results.find((r: any) => r.success) : undefined;
            return { success: true, nullifier: data.nullifier ?? first?.nullifier };
        }
        return { success: false, code: data.code, detail: data.detail || data.message };
    } catch (err: any) {
        return { success: false, code: 'network_error', detail: err.message };
    }
}
