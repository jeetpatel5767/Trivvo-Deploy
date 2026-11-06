/**
 * T12: tiered human-check policy.
 * - Small main reward: the arrival human check (same wallet + hunt) is enough. No second check.
 * - Main reward above STRONG_THRESHOLD_USD: a stronger credential is required on the main claim.
 * The accepted strong identifiers come from env because World's v4 identifier names must be
 * confirmed with a live proof (see tasks.json T12 notes).
 */

export const STRONG_THRESHOLD_USD = Number(process.env.STRONG_THRESHOLD_USD || 5);

// World ID 4.0 credential identifiers (S1): proof_of_human (weakest), selfie, passport, mnc.
// Legacy preset names kept so older proofs still count.
const STRONG_IDS = (process.env.STRONG_CREDENTIAL_IDS || 'passport,selfie,mnc,secure_document,document')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

/** Identifier of the credential used in an IDKit result (e.g. 'orb', 'document'). */
export function credentialIdOf(result: any): string {
    const first = Array.isArray(result?.responses) ? result.responses[0] : undefined;
    return String(first?.identifier ?? result?.identifier ?? '').toLowerCase();
}

export function needsStrongCredential(mainRewardUsd: number): boolean {
    return mainRewardUsd > STRONG_THRESHOLD_USD;
}

export function isStrongCredential(identifier: string): boolean {
    return STRONG_IDS.includes(identifier);
}
