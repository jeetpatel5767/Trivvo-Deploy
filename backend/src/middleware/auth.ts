import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import pool from '../db/pool';

/**
 * A1: wallet sign-in.
 * The wallet signs a plain message once; we return an HMAC token for that wallet.
 * Every write route reads the wallet from the token, never from the request body.
 */

const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) console.log('⚠️ SESSION_SECRET not set: sessions reset on every restart');

const SESSION_TTL_S = 7 * 24 * 3600;
const MESSAGE_MAX_AGE_MS = 10 * 60 * 1000;

const hmac = (data: string) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url');

export function createSession(wallet: string): { token: string; expiresAt: number } {
    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_S;
    const body = `${wallet.toLowerCase()}.${expiresAt}`;
    return { token: `${body}.${hmac(body)}`, expiresAt };
}

/** Returns the lowercase wallet for a valid token, or null. */
export function readSession(token: string): string | null {
    const [wallet, exp, sig] = token.split('.');
    if (!wallet || !exp || !sig) return null;
    const expected = hmac(`${wallet}.${exp}`);
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    if (Number(exp) < Date.now() / 1000) return null;
    return wallet;
}

/**
 * Checks a signed sign-in message:
 *   Sign in to Tr!vvo
 *   Wallet: 0x...
 *   Issued: <ISO time>
 * Returns the wallet that signed it, or an error code.
 *
 * A normal wallet (MetaMask) signs with its own key. A World App wallet is a Safe smart
 * account on World Chain, signed by its owner key, so it is checked against the contract
 * itself (ERC-1271 isValidSignature, or the Safe's checkSignatures). Every path proves the
 * named wallet signed this exact message.
 */
export async function checkSignIn(message: string, signature: string): Promise<{ wallet?: string; code?: string }> {
    const wallet = /^Wallet: (0x[0-9a-fA-F]{40})$/m.exec(message)?.[1]?.toLowerCase();
    const issued = Date.parse(/^Issued: (.+)$/m.exec(message)?.[1] ?? '');
    if (!message.startsWith('Sign in to Tr!vvo') || !wallet) return { code: 'bad_message' };
    if (!(Math.abs(Date.now() - issued) <= MESSAGE_MAX_AGE_MS)) return { code: 'message_expired' };

    let signer = '';
    try {
        signer = ethers.verifyMessage(message, signature).toLowerCase();
    } catch {
        /* not a plain key signature: may still be a smart-account one */
    }
    if (signer === wallet) return { wallet };
    if (await isSmartAccountSignature(wallet, message, signature)) return { wallet };
    return { code: signer ? 'bad_message' : 'bad_signature' };
}

// World App wallets live on World Chain mainnet (480), whatever chain the escrow uses.
const SMART_ACCOUNT_RPC = process.env.WORLDCHAIN_MAINNET_RPC_URL || 'https://worldchain-mainnet.g.alchemy.com/public';
const ERC1271_MAGIC = '0x1626ba7e';
const SMART_ACCOUNT_ABI = [
    'function isValidSignature(bytes32 hash, bytes signature) view returns (bytes4)',
    'function getThreshold() view returns (uint256)',
    'function checkSignatures(bytes32 dataHash, bytes data, bytes signatures) view',
];

async function isSmartAccountSignature(wallet: string, message: string, signature: string): Promise<boolean> {
    try {
        const provider = new ethers.JsonRpcProvider(SMART_ACCOUNT_RPC);
        if ((await provider.getCode(wallet)) === '0x') return false; // not a contract
        const account = new ethers.Contract(wallet, SMART_ACCOUNT_ABI, provider);
        const hash = ethers.hashMessage(message);
        const magic = await account.isValidSignature(hash, signature).catch(() => null);
        if (magic === ERC1271_MAGIC) return true;
        // Safe's checkSignatures reverts unless the owners signed this hash. Only ask a real Safe:
        // any contract with a catch-all fallback (e.g. WETH) would otherwise "succeed" here.
        const threshold = await account.getThreshold().catch(() => 0n);
        if (!(threshold > 0n)) return false;
        return await account.checkSignatures(hash, '0x', signature).then(() => true, () => false);
    } catch {
        return false;
    }
}

/** Requires `Authorization: Bearer <token>`; sets (req as any).walletAddress. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    const wallet = token ? readSession(token) : null;
    if (!wallet) {
        return res.status(401).json({ error: 'Please sign in with your wallet.', code: 'auth_required' });
    }
    (req as any).walletAddress = wallet;
    next();
}

/** True when `wallet` is the vendor who owns `huntId`. */
export async function isHuntOwner(huntId: string, wallet: string): Promise<boolean> {
    const r = await pool.query(
        `SELECT 1 FROM hunts h JOIN vendors v ON v.vendor_id = h.vendor_id
         WHERE h.hunt_id = $1 AND v.wallet_address = $2`,
        [huntId, wallet]
    );
    return r.rows.length > 0;
}
