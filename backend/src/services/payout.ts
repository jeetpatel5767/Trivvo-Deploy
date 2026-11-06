import pool from '../db/pool';
import { blockchainService } from './blockchain';
import { needsStrongCredential, isStrongCredential } from './tier';
import { getHuntProgress } from './taskProgress';
import { recordReceipt } from './hederaReceipts';
import { sendStampToEvm } from '../hedera/hts';
import { isHederaConfigured } from '../hedera/hederaClient';

/**
 * C5: the one place the main reward is paid. Called when the hunter taps Claim AND
 * automatically the moment the last task is approved (by 0G or the vendor), so the
 * verdict itself moves the money.
 *
 * participants.task_completed is the payout lock: it is flipped false -> true in a single
 * UPDATE before the chain call, so two callers (auto-pay and a Claim tap) can never both pay.
 * A failed chain call flips it back so the payout can be retried.
 */

export const PAYOUT_ERRORS: Record<string, string> = {
    not_arrived: 'Check in at the venue before claiming the reward.',
    not_all_approved: 'Finish and pass every task first.',
    already_paid: 'You already received this reward.',
    paying: 'Your reward is being sent right now.',
    strong_credential_required: 'This reward needs a stronger World ID check first.',
    hunt_not_found: 'That hunt no longer exists.',
    chain_error: 'The payout transaction failed on chain. Try again in a moment.',
};

const STATUS: Record<string, number> = {
    not_arrived: 403, not_all_approved: 403, strong_credential_required: 403,
    already_paid: 409, paying: 202, hunt_not_found: 404, chain_error: 502,
};

export interface PayoutResult {
    ok: boolean;
    status: number;
    code?: string;
    mainReward?: string;
    rewardTxHash?: string;
    explorerUrl?: string;
}

const fail = (code: string, extra: Partial<PayoutResult> = {}): PayoutResult => ({ ok: false, status: STATUS[code] || 400, code, ...extra });

export async function payMainReward(huntId: string, wallet: string): Promise<PayoutResult> {
    const hunt = (await pool.query('SELECT * FROM hunts WHERE hunt_id = $1', [huntId])).rows[0];
    if (!hunt) return fail('hunt_not_found');

    // Gate 1: the hunter arrived and every task is approved.
    const progress = await getHuntProgress(huntId, wallet);
    if (!progress || !progress.arrived) return fail('not_arrived');
    if (!progress.allApproved) return fail('not_all_approved');

    // Gate 2: a high-value main reward needs a stronger credential (the 'main' World check).
    if (needsStrongCredential(Number(hunt.main_reward))) {
        const strong = await pool.query(
            `SELECT verification_level FROM nullifiers WHERE hunt_id = $1 AND wallet_address = $2 AND action = 'main'`,
            [huntId, wallet]
        );
        if (!strong.rows.some((r: any) => isStrongCredential(String(r.verification_level || '').toLowerCase()))) {
            return fail('strong_credential_required');
        }
    }

    // Gate 3: take the payout lock, or report what already happened.
    const locked = await pool.query(
        `UPDATE participants SET task_completed = true
         WHERE hunt_id = $1 AND wallet_address = $2 AND task_completed = false RETURNING 1`,
        [huntId, wallet]
    );
    if (locked.rows.length === 0) {
        const paid = (await pool.query(
            'SELECT reward_tx_hash FROM participants WHERE hunt_id = $1 AND wallet_address = $2',
            [huntId, wallet]
        )).rows[0]?.reward_tx_hash;
        if (!paid) return fail('paying');
        return fail('already_paid', {
            mainReward: hunt.main_reward, rewardTxHash: paid, explorerUrl: blockchainService.getExplorerUrl(paid),
        });
    }

    // Pay on chain (demo mode returns a placeholder hash when no escrow is configured).
    let rewardTxHash = '';
    try {
        rewardTxHash = hunt.contract_hunt_id !== null
            ? await blockchainService.claimMainReward(hunt.contract_hunt_id, wallet)
            : `0xdemo_main_${Date.now()}`;
    } catch (e: any) {
        console.error('Main reward chain error:', e.message);
        await pool.query('UPDATE participants SET task_completed = false WHERE hunt_id = $1 AND wallet_address = $2', [huntId, wallet]);
        return fail('chain_error');
    }

    await pool.query(
        `UPDATE participants SET reward_tx_hash = $1 WHERE hunt_id = $2 AND wallet_address = $3`,
        [rewardTxHash, huntId, wallet]
    );
    await pool.query(
        `UPDATE analytics SET rewards_distributed = rewards_distributed + $1, updated_at = NOW() WHERE hunt_id = $2`,
        [hunt.main_reward, huntId]
    );
    // F1: public receipt for the main payout (non-blocking Hedera publish).
    await recordReceipt({ huntId, type: 'reward_paid', wallet, txHash: rewardTxHash, detail: { amount: hunt.main_reward } });

    // F2: one HTS "stamp" to the hunter's EVM wallet on completion (never fails the payout).
    const tokenId = process.env.HEDERA_TOKEN_ID;
    if (isHederaConfigured() && tokenId) {
        sendStampToEvm(tokenId, wallet)
            .then((stampTxId) => recordReceipt({ huntId, type: 'stamp_sent', wallet, detail: { stampTxId, tokenId } }))
            .catch((e) => console.error('F2 stamp send failed:', e.message));
    }

    return {
        ok: true, status: 200, mainReward: hunt.main_reward, rewardTxHash,
        explorerUrl: blockchainService.getExplorerUrl(rewardTxHash),
    };
}

/** Fire-and-forget auto payout after an approval; a hunter tap on Claim covers any case it skips. */
export function autoPayIfComplete(huntId: string, wallet: string): void {
    payMainReward(huntId, wallet)
        .then((r) => { if (r.ok) console.log(`[payout] auto-paid hunt=${huntId} wallet=${wallet} tx=${r.rewardTxHash}`); })
        .catch((e) => console.error('[payout] auto-pay failed:', e.message));
}
