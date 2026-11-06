import { Request, Response, NextFunction } from 'express';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const walletAddress = req.headers['x-wallet-address'] as string;

    if (!walletAddress) {
        return res.status(401).json({ error: 'Wallet address required in x-wallet-address header' });
    }

    (req as any).walletAddress = walletAddress.toLowerCase();
    next();
}
