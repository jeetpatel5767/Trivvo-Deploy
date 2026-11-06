import { Router, Request, Response } from 'express';
import pool from '../db/pool';
import { checkSignIn, createSession, requireAuth } from '../middleware/auth';

const router = Router();

// POST /api/auth/session — exchange a signed sign-in message for a session token (A1)
router.post('/auth/session', (req: Request, res: Response) => {
    const { message, signature } = req.body as { message?: string; signature?: string };
    if (!message || !signature) {
        return res.status(400).json({ error: 'message and signature are required', code: 'bad_request' });
    }
    const check = checkSignIn(message, signature);
    if (!check.wallet) {
        return res.status(401).json({ error: 'Sign-in was not accepted. Try again.', code: check.code });
    }
    return res.json({ walletAddress: check.wallet, ...createSession(check.wallet) });
});

// POST /api/login — registers the signed-in wallet as a user or vendor
router.post('/login', requireAuth, async (req: Request, res: Response) => {
    try {
        const { role, businessName } = req.body;
        const normalizedAddress = (req as any).walletAddress as string;

        if (role === 'vendor') {
            // Upsert vendor. A real name is saved; with no name given we never overwrite one already set.
            const name = typeof businessName === 'string' ? businessName.trim().slice(0, 60) : '';
            const result = await pool.query(
                `INSERT INTO vendors (wallet_address, business_name) 
         VALUES ($1, $2) 
         ON CONFLICT (wallet_address) DO UPDATE SET business_name = CASE WHEN $3::boolean THEN $2 ELSE vendors.business_name END
         RETURNING *`,
                [normalizedAddress, name || 'My Business', name.length > 0]
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

// GET /api/vendors/me — the signed-in vendor's saved business name (null until one is set)
router.get('/vendors/me', requireAuth, async (req: Request, res: Response) => {
    try {
        const r = await pool.query('SELECT business_name FROM vendors WHERE wallet_address = $1', [(req as any).walletAddress]);
        const name = r.rows[0]?.business_name as string | undefined;
        // 'My Business' is only the placeholder the server used to write; it is not a real name.
        return res.json({ businessName: name && name !== 'My Business' ? name : null });
    } catch (error: any) {
        console.error('Vendor name read error:', error.message);
        return res.status(500).json({ error: 'Failed to load your business name' });
    }
});

// PATCH /api/vendors/me — save the business name hunters see on every one of this vendor's hunts
router.patch('/vendors/me', requireAuth, async (req: Request, res: Response) => {
    try {
        const name = typeof req.body?.businessName === 'string' ? req.body.businessName.trim().slice(0, 60) : '';
        if (!name) return res.status(400).json({ error: 'Enter your business name.', code: 'bad_request' });
        await pool.query(
            `INSERT INTO vendors (wallet_address, business_name) VALUES ($1, $2)
             ON CONFLICT (wallet_address) DO UPDATE SET business_name = $2`,
            [(req as any).walletAddress, name]
        );
        return res.json({ success: true, businessName: name });
    } catch (error: any) {
        console.error('Vendor name save error:', error.message);
        return res.status(500).json({ error: 'Failed to save your business name' });
    }
});

export default router;
