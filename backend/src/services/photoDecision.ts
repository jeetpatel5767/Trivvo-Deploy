/**
 * T14: the AI verdict decides the outcome.
 * - approved      : AI says the photo matches and confidence >= threshold -> auto-release
 * - retry         : AI says no match -> hunter sees the reason and can retry (max attempts)
 * - vendor_review : AI unsure, or 0G unavailable -> vendor decides (never a silent pass)
 */

export type ReviewStatus = 'approved' | 'retry' | 'vendor_review';

export interface AiResult {
    ok: boolean;          // AI says the photo matches the task
    confidence: number;   // 0..1
    reason: string;
    requestId: string;
} 

export const AUTO_RELEASE_CONFIDENCE = Number(process.env.AUTO_RELEASE_CONFIDENCE || 0.8);
export const MAX_PHOTO_ATTEMPTS = Number(process.env.MAX_PHOTO_ATTEMPTS || 5);

export interface Decision {
    status: ReviewStatus;
    reason: string;
    autoReleased: boolean;
}

export function decideOutcome(ai: AiResult | null, attemptsSoFar: number): Decision {
    // 0G down or unreadable: save the photo for the vendor. Not a fake pass.
    if (!ai) {
        return { status: 'vendor_review', reason: 'AI check unavailable. The vendor will review your photo.', autoReleased: false };
    }
    if (ai.ok && ai.confidence >= AUTO_RELEASE_CONFIDENCE) {
        return { status: 'approved', reason: ai.reason || 'Photo matches the task.', autoReleased: true };
    }
    if (!ai.ok && ai.confidence >= AUTO_RELEASE_CONFIDENCE) {
        // Confident it does not match: ask for a retake, unless attempts are used up.
        if (attemptsSoFar >= MAX_PHOTO_ATTEMPTS) {
            return { status: 'vendor_review', reason: 'Maximum attempts reached. The vendor will review.', autoReleased: false };
        }
        return { status: 'retry', reason: ai.reason || 'Photo does not match the task. Please retake.', autoReleased: false };
    }
    // Low confidence either way: vendor decides.
    return { status: 'vendor_review', reason: 'Not sure about this photo. The vendor will review it.', autoReleased: false };
}
