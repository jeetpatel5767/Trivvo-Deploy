import { Router, Request, Response } from 'express';
import pool from '../db/pool';

const router = Router();

// POST /api/login — wallet-based login/registration
router.post('/login', async (req: Request, res: Response) => {
    try {
        const { walletAddress, role, businessName } = req.body;

        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address required' });
        }

        const normalizedAddress = walletAddress.toLowerCase();

        if (role === 'vendor') {
            // Upsert vendor
            const result = await pool.query(
                `INSERT INTO vendors (wallet_address, business_name) 
         VALUES ($1, $2) 
         ON CONFLICT (wallet_address) DO UPDATE SET wallet_address = $1
         RETURNING *`,
                [normalizedAddress, businessName || 'My Business']
            );
            return res.json({ user: result.rows[0], role: 'vendor' });
        }

        // Upsert user
        const result = await pool.query(
            `INSERT INTO users (wallet_address) 
       VALUES ($1) 
       ON CONFLICT (wallet_address) DO UPDATE SET wallet_address = $1
       RETURNING *`,
            [normalizedAddress]
        );
        return res.json({ user: result.rows[0], role: 'user' });
    } catch (error: any) {
        console.error('Login error:', error.message);
        return res.status(500).json({ error: 'Login failed' });
    }
});

export default router;
