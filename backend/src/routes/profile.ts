import { Router, Request, Response } from 'express';
import pool from '../db/pool';

const router = Router();

// GET /api/profile/:wallet — get user profile stats and recent activity
router.get('/profile/:wallet', async (req: Request, res: Response) => {
    try {
        const wallet = req.params.wallet.toLowerCase();

        const result = await pool.query(
            `SELECT p.*, h.title, h.arrival_reward, h.main_reward 
             FROM participants p
             JOIN hunts h ON p.hunt_id = h.hunt_id
             WHERE p.wallet_address = $1
             ORDER BY p.arrival_time DESC`,
            [wallet]
        );

        let huntsCompleted = 0;
        let totalEarned = 0;
        const recentActivity = [];

        for (const row of result.rows) {
            let rewardNum = 0;
            let status = 'in-progress';

            if (row.arrival_tx_hash) {
                rewardNum += Number(row.arrival_reward);
            }
            if (row.reward_tx_hash) {
                rewardNum += Number(row.main_reward);
                status = 'completed';
                huntsCompleted++;
            }

            totalEarned += rewardNum;

            recentActivity.push({
                title: row.title,
                reward: rewardNum.toFixed(2),
                timestamp: row.arrival_time,
                status
            });
        }

        return res.json({
            stats: {
                huntsCompleted,
                totalEarned: totalEarned.toFixed(2),
                currentStreak: huntsCompleted > 0 ? 1 : 0
            },
            recentActivity
        });

    } catch (error: any) {
        console.error('Profile fetch error:', error.message);
        return res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

export default router;
