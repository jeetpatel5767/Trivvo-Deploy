import { Router, Request, Response } from 'express';
import pool from '../db/pool';

const router = Router();

// POST /api/task-complete — vendor marks task as completed
router.post('/task-complete', async (req: Request, res: Response) => {
    try {
        const { huntId, walletAddress } = req.body;

        if (!huntId || !walletAddress) {
            return res.status(400).json({ error: 'Missing huntId or walletAddress' });
        }

        const normalizedWallet = walletAddress.toLowerCase();

        // Verify participant exists and has arrived
        const participant = await pool.query(
            'SELECT * FROM participants WHERE hunt_id = $1 AND wallet_address = $2',
            [huntId, normalizedWallet]
        );

        if (participant.rows.length === 0) {
            return res.status(404).json({ error: 'Participant not found for this hunt' });
        }

        if (participant.rows[0].task_completed) {
            return res.status(400).json({ error: 'Task already completed' });
        }

        // Mark task as completed
        await pool.query(
            `UPDATE participants SET task_completed = true WHERE hunt_id = $1 AND wallet_address = $2`,
            [huntId, normalizedWallet]
        );

        return res.json({ success: true, message: 'Task marked as completed' });
    } catch (error: any) {
        console.error('Task complete error:', error.message);
        return res.status(500).json({ error: 'Failed to complete task' });
    }
});

export default router;
