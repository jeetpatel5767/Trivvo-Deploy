import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { blockchainService } from '../services/blockchain';

const router = Router();

function applyDynamicStatus(hunt: any) {
    if (hunt.status === 'active') {
        const now = new Date();
        const start = new Date(hunt.start_time);
        const end = new Date(hunt.end_time);
        if (now < start) {
            hunt.status = 'upcoming';
        } else if (now > end) {
            hunt.status = 'expired';
        }
    }
    return hunt;
}

// GET /api/hunts — list all hunts
router.get('/hunts', async (_req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT h.*, v.business_name, v.wallet_address as vendor_wallet,
                    COALESCE(a.views, 0) as views,
                    COALESCE(a.qr_scans, 0) as qr_scans,
                    COALESCE(a.active_participants, 0) as active_participants,
                    COALESCE(a.rewards_distributed, 0) as rewards_distributed
       FROM hunts h 
       JOIN vendors v ON h.vendor_id = v.vendor_id 
       LEFT JOIN analytics a ON h.hunt_id = a.hunt_id
       ORDER BY h.created_at DESC`
        );
        const hunts = result.rows.map(applyDynamicStatus);
        return res.json({ hunts });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to fetch hunts' });
    }
});

// GET /api/hunts/:id — hunt detail
router.get('/hunts/:id', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(
            `SELECT h.*, v.business_name,
                    COALESCE(a.views, 0) as views,
                    COALESCE(a.qr_scans, 0) as qr_scans,
                    COALESCE(a.active_participants, 0) as active_participants,
                    COALESCE(a.rewards_distributed, 0) as rewards_distributed
       FROM hunts h 
       JOIN vendors v ON h.vendor_id = v.vendor_id 
       LEFT JOIN analytics a ON h.hunt_id = a.hunt_id
       WHERE h.hunt_id = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Hunt not found' });
        }

        // Increment views
        await pool.query(
            `INSERT INTO analytics (hunt_id, views) VALUES ($1, 1) 
       ON CONFLICT (hunt_id) DO UPDATE SET views = analytics.views + 1, updated_at = NOW()`,
            [req.params.id]
        );

        let hunt = applyDynamicStatus(result.rows[0]);

        // Fetch remaining funds from smart contract if available
        if (hunt.contract_hunt_id !== null) {
            try {
                const chainDetails = await blockchainService.getHuntDetails(hunt.contract_hunt_id);
                if (chainDetails) {
                    hunt.remaining_funds = chainDetails.remainingFunds;
                }
            } catch (err: any) {
                console.error("Failed to fetch on-chain hunt details:", err.message);
            }
        }

        return res.json({ hunt });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to fetch hunt' });
    }
});

// POST /api/hunts — create hunt
router.post('/hunts', async (req: Request, res: Response) => {
    try {
        const {
            vendorWallet, title, description,
            locationLat, locationLng, locationName,
            startTime, endTime,
            arrivalReward, mainReward, tasks
        } = req.body;

        // Find vendor
        const vendorResult = await pool.query(
            'SELECT vendor_id FROM vendors WHERE wallet_address = $1',
            [vendorWallet.toLowerCase()]
        );
        if (vendorResult.rows.length === 0) {
            return res.status(404).json({ error: 'Vendor not found. Please login first.' });
        }

        const vendorId = vendorResult.rows[0].vendor_id;
        const qrSecret = crypto.randomBytes(32).toString('hex');

        const result = await pool.query(
            `INSERT INTO hunts (vendor_id, title, description, location_lat, location_lng, location_name, start_time, end_time, arrival_reward, main_reward, qr_secret, tasks, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
       RETURNING *`,
            [vendorId, title, description, locationLat, locationLng, locationName, startTime, endTime, arrivalReward, mainReward, qrSecret, JSON.stringify(tasks || [])]
        );

        // Create analytics entry
        await pool.query(
            'INSERT INTO analytics (hunt_id) VALUES ($1)',
            [result.rows[0].hunt_id]
        );

        return res.json({ hunt: result.rows[0] });
    } catch (error: any) {
        console.error('Create hunt error:', error.message);
        return res.status(500).json({ error: 'Failed to create hunt' });
    }
});

// POST /api/hunts/fund — record funding transaction
router.post('/hunts/fund', async (req: Request, res: Response) => {
    try {
        const { huntId, contractHuntId, txHash } = req.body;

        await pool.query(
            `UPDATE hunts SET contract_hunt_id = $1, status = 'active' WHERE hunt_id = $2`,
            [contractHuntId, huntId]
        );

        return res.json({ success: true, txHash });
    } catch (error: any) {
        return res.status(500).json({ error: 'Failed to record funding' });
    }
});

// POST /api/hunts/:id/withdraw — record vendor withdrawal
router.post('/hunts/:id/withdraw', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { txHash } = req.body;

        await pool.query(
            `UPDATE hunts SET status = 'ended' WHERE hunt_id = $1`,
            [id]
        );

        return res.json({ success: true, txHash });
    } catch (error: any) {
        console.error('Withdrawal sync error:', error.message);
        return res.status(500).json({ error: 'Failed to record withdrawal' });
    }
});

export default router;
