import pool from '../db/pool';
import { publishReceipt } from '../hedera/hcs';
import { isHederaConfigured } from '../hedera/hederaClient';

/**
 * F1: public, tamper-proof receipt trail on Hedera (HCS).
 *
 * Every money/trust moment is written to our events table AND published as one HCS
 * message. The HCS write is NON-BLOCKING: the hunter is already paid on World Chain by
 * the time this runs, so a Hedera hiccup must never fail the request. We publish after
 * the row exists, then stamp the row with the consensus sequence number so the receipt
 * page (F3) and timeline (G1) can link straight to HashScan.
 */

export type ReceiptType =
    | 'hunt_funded'
    | 'human_verified'
    | 'arrival_paid'
    | 'photo_approved'
    | 'reward_paid'
    | 'stamp_sent'
    | 'hunt_withdrawn';

export interface ReceiptInput {
    huntId: string;
    type: ReceiptType;
    wallet?: string | null;
    txHash?: string | null;
    nullifierHash?: string | null;
    zgRequestId?: string | null;
    detail?: Record<string, unknown>;
}

/**
 * Record an event row and (best-effort) publish it to Hedera HCS.
 * Returns the new events row id. Never throws for Hedera reasons.
 */
export async function recordReceipt(input: ReceiptInput): Promise<string | null> {
    const { huntId, type, wallet = null, txHash = null, nullifierHash = null, zgRequestId = null, detail = {} } = input;

    // 1) Always write the local row first (source of truth for the receipt page / timeline).
    let eventId: string | null = null;
    try {
        const r = await pool.query(
            `INSERT INTO events (hunt_id, wallet_address, type, tx_hash, nullifier_hash, zg_request_id, detail)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
            [huntId, wallet, type, txHash, nullifierHash, zgRequestId, JSON.stringify(detail)]
        );
        eventId = r.rows[0].id;
    } catch (e: any) {
        console.error('recordReceipt: events insert failed:', e.message);
        return null; // if we can't even store locally, skip Hedera too
    }

    // 2) Publish to Hedera HCS, non-blocking. Stamp the row with the sequence on success.
    if (isHederaConfigured() && process.env.HEDERA_TOPIC_ID) {
        publishReceipt({
            t: type,
            hunt: huntId,
            wallet: wallet || undefined,
            tx: txHash || undefined,
            nullifier: nullifierHash || undefined,
            zg: zgRequestId || undefined,
            at: new Date().toISOString(),
            ...detail,
        })
            .then(async ({ topicId, sequenceNumber }) => {
                await pool.query(
                    `UPDATE events SET hcs_topic_id = $1, hcs_sequence = $2 WHERE id = $3`,
                    [topicId, sequenceNumber ? Number(sequenceNumber) : null, eventId]
                ).catch(() => { /* row stamping is best-effort */ });
            })
            .catch((e) => console.error(`recordReceipt: HCS publish failed for ${type}:`, e.message));
    }

    return eventId;
}

/** HashScan link for one HCS message (used by the receipt page / timeline). */
export function hcsMessageUrl(topicId: string, sequence: number | string): string {
    return `https://hashscan.io/testnet/topic/${topicId}/message/${sequence}`;
}
