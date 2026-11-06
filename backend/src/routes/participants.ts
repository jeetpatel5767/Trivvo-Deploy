import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { requireAuth, isHuntOwner } from '../middleware/auth';

const router = Router();

// GET /api/hunts/:id/participants — list participants for a hunt (owner only: it lists wallets)
router.get('/hunts/:id/participants', requireAuth, async (req: Request, res: Response) => {
    try {
        if (!(await isHuntOwner(req.params.id, (req as any).walletAddress))) {
            return res.status(403).json({ error: 'Not the vendor of this hunt', code: 'not_owner' });
        }
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
