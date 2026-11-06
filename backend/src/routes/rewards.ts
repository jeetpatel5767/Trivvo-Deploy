import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { blockchainService } from '../services/blockchain';

const router = Router();

// POST /api/reward/main — vendor triggers main reward after task verification
router.post('/reward/main', async (req: Request, res: Response) => {
    try {
        const { huntId, walletAddress } = req.body;

        if (!huntId || !walletAddress) {
            return res.status(400).json({ error: 'Missing huntId or walletAddress' });
        }

        const normalizedWallet = walletAddress.toLowerCase();

        // Verify participant exists and task is completed
        const participant = await pool.query(
            'SELECT * FROM participants WHERE hunt_id = $1 AND wallet_address = $2',
            [huntId, normalizedWallet]
        );

        if (participant.rows.length === 0) {
            return res.status(404).json({ error: 'Participant not found' });
        }

        if (!participant.rows[0].task_completed) {
            return res.status(400).json({ error: 'Task not yet completed' });
        }

        if (participant.rows[0].reward_tx_hash) {
            return res.status(400).json({ error: 'Main reward already distributed' });
        }

        // Get hunt details
        const huntResult = await pool.query('SELECT * FROM hunts WHERE hunt_id = $1', [huntId]);
        const hunt = huntResult.rows[0];

        // Trigger main reward on blockchain
        let rewardTxHash = '';
        if (hunt.contract_hunt_id !== null) {
            try {
                rewardTxHash = await blockchainService.claimMainReward(
                    hunt.contract_hunt_id,
                    normalizedWallet
                );
            } catch (blockchainError: any) {
                console.error('Blockchain main reward error:', blockchainError.message);
                return res.status(500).json({ error: 'Smart contract transaction failed: ' + (blockchainError.reason || blockchainError.message) });
            }
        }

        // Update participant with reward tx hash
        await pool.query(
            `UPDATE participants SET reward_tx_hash = $1 WHERE hunt_id = $2 AND wallet_address = $3`,
            [rewardTxHash, huntId, normalizedWallet]
        );

        // Update analytics
        await pool.query(
            `UPDATE analytics SET rewards_distributed = rewards_distributed + $1, updated_at = NOW()
       WHERE hunt_id = $2`,
            [hunt.main_reward, huntId]
        );

        return res.json({
            success: true,
            mainReward: hunt.main_reward,
            rewardTxHash,
            explorerUrl: blockchainService.getExplorerUrl(rewardTxHash),
        });
    } catch (error: any) {
        console.error('Main reward error:', error.message);
        return res.status(500).json({ error: 'Failed to distribute main reward' });
    }
});

export default router;
