import { Router, Request, Response } from 'express';
import pool from '../db/pool';

const router = Router();

// GET /api/hunts/:id/participants — list participants for a hunt
router.get('/hunts/:id/participants', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT * FROM participants WHERE hunt_id = $1 ORDER BY arrival_time DESC`,
            [req.params.id]
        );
        return res.json({ participants: result.rows });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to fetch participants' });
    }
});

export default router;
