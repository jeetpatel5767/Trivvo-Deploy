import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { blockchainService } from '../services/blockchain';

const router = Router();

/**
 * POST /api/scan — QR scan verification + auto arrival reward
 * 
 * Flow:
 * 1. Verify hunt exists, is active, QR secret valid, user not already scanned
 * 2. Call smart contract claimArrivalReward()
 * 3. Store arrival_tx_hash in participants table
 * 4. Return tasks (now unlocked) + tx hash
 */
router.post('/scan', async (req: Request, res: Response) => {
    try {
        const { huntId, qrSecret, walletAddress } = req.body;

        if (!huntId || !qrSecret || !walletAddress) {
            return res.status(400).json({ error: 'Missing required fields: huntId, qrSecret, walletAddress' });
        }

        const normalizedWallet = walletAddress.toLowerCase();

        // 1. Verify hunt exists and is active
        const huntResult = await pool.query(
            `SELECT h.*, v.business_name FROM hunts h 
       JOIN vendors v ON h.vendor_id = v.vendor_id 
       WHERE h.hunt_id = $1`,
            [huntId]
        );

        if (huntResult.rows.length === 0) {
            return res.status(404).json({ error: 'Hunt not found' });
        }

        const hunt = huntResult.rows[0];

        if (hunt.status !== 'active') {
            return res.status(400).json({ error: 'Hunt is not active' });
        }

        // 2. Verify QR secret
        if (hunt.qr_secret !== qrSecret) {
            return res.status(400).json({ error: 'Invalid QR code' });
        }

        // 3. Check if user already scanned
        const existingParticipant = await pool.query(
            'SELECT * FROM participants WHERE hunt_id = $1 AND wallet_address = $2',
            [huntId, normalizedWallet]
        );

        if (existingParticipant.rows.length > 0) {
            return res.status(400).json({ error: 'You have already scanned this hunt QR code' });
        }

        let arrivalTxHash = '';
        if (hunt.contract_hunt_id !== null) {
            try {
                arrivalTxHash = await blockchainService.claimArrivalReward(
                    hunt.contract_hunt_id,
                    normalizedWallet
                );
            } catch (blockchainError: any) {
                console.error('Blockchain arrival reward error:', blockchainError.message);
                return res.status(500).json({ error: 'Smart contract transaction failed: ' + (blockchainError.reason || blockchainError.message) });
            }
        }

        // 5. Record participant with arrival tx hash
        await pool.query(
            `INSERT INTO participants (hunt_id, wallet_address, arrival_tx_hash)
       VALUES ($1, $2, $3)`,
            [huntId, normalizedWallet, arrivalTxHash]
        );

        // 6. Update analytics
        await pool.query(
            `UPDATE analytics SET qr_scans = qr_scans + 1, active_participants = active_participants + 1, updated_at = NOW()
       WHERE hunt_id = $1`,
            [huntId]
        );

        // 7. Return success with tasks unlocked
        return res.json({
            success: true,
            arrivalReward: hunt.arrival_reward,
            arrivalTxHash,
            explorerUrl: blockchainService.getExplorerUrl(arrivalTxHash),
            tasks: hunt.tasks || [],
            huntTitle: hunt.title,
            businessName: hunt.business_name,
        });
    } catch (error: any) {
        console.error('QR scan error:', error.message);
        return res.status(500).json({ error: 'QR verification failed' });
    }
});

export default router;
