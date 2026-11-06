import axios from 'axios';
import { DEMO_HUNTS, DEMO_PARTICIPANTS, DEMO_PROFILE, findDemoHunt } from './demoData';
import { explorerTx } from './wagmi';

/* ──────────────────────────────────────────────────────────────────────────
   OFFLINE = true  → the backend is unplugged. Every call below resolves
   locally from demoData.ts so you can click through every screen instantly.
   Set it to false to talk to the real API again. Nothing else needs changing.
   ────────────────────────────────────────────────────────────────────────── */
export const OFFLINE = false;

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
});

/* ── Wallet session (A1) ─────────────────────────────────────────────────────
   The wallet signs one message; the backend returns a token for that wallet.
   Writes (and owner-only reads) wait for a token, asking for the signature once. */

type Signer = (message: string) => Promise<string>;
let session: { address: string; sign: Signer } | null = null;
let pending: Promise<string> | null = null;

const storeKey = (address: string) => `trivvo.session.${address.toLowerCase()}`;

/** Called by SessionBridge whenever the connected wallet changes. */
export function setSessionSigner(address: string | undefined, sign: Signer | null) {
    session = address && sign ? { address, sign } : null;
}

function storedToken(address: string): string | null {
    try {
        const s = JSON.parse(localStorage.getItem(storeKey(address)) || 'null');
        return s && s.expiresAt * 1000 > Date.now() + 60_000 ? s.token : null;
    } catch {
        return null;
    }
}

async function ensureToken(): Promise<string | null> {
    if (!session) return null;
    const cached = storedToken(session.address);
    if (cached) return cached;
    if (!pending) {
        const { address, sign } = session;
        const message = `Sign in to Tr!vvo\nWallet: ${address}\nIssued: ${new Date().toISOString()}`;
        pending = sign(message)
            .then((signature) => axios.post(`${API_BASE}/auth/session`, { message, signature }))
            .then(({ data }) => {
                localStorage.setItem(storeKey(address), JSON.stringify({ token: data.token, expiresAt: data.expiresAt }));
                return data.token as string;
            })
            .finally(() => { pending = null; });
    }
    return pending;
}

const NEEDS_SESSION_GET = [/^\/reviews/, /\/participants$/, /\/qr$/, /^\/hunts\/mine$/, /\/progress$/, /^\/vendors\/me$/];

api.interceptors.request.use(async (config) => {
    const isWrite = (config.method || 'get').toLowerCase() !== 'get';
    const ownerRead = NEEDS_SESSION_GET.some((re) => re.test(config.url || ''));
    const token = isWrite || ownerRead
        ? await ensureToken()
        : session && storedToken(session.address);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

/** A rejected token (e.g. server secret changed): drop it so the next call signs again. */
api.interceptors.response.use(undefined, (error) => {
    if (error.response?.data?.code === 'auth_required' && session) localStorage.removeItem(storeKey(session.address));
    return Promise.reject(error);
});

/** Resolves like an axios response, after a short beat so skeletons still show. */
const fake = <T,>(data: T, ms = 150): Promise<{ data: T }> =>
    new Promise((resolve) => setTimeout(() => resolve({ data }), ms));

const demoTx = () => '0xdemo' + Math.random().toString(16).slice(2, 14);
const explorer = explorerTx;

// Auth
export const login = (walletAddress: string, role: string, businessName?: string) =>
    OFFLINE
        ? fake({ success: true }, 0)
        : api.post('/login', { walletAddress, role, businessName });

// Vendor profile — the business name hunters see on every one of the vendor's hunts
export const getMyVendor = () =>
    OFFLINE ? fake({ businessName: null as string | null }, 0) : api.get('/vendors/me');

export const saveBusinessName = (businessName: string) =>
    OFFLINE ? fake({ success: true, businessName }, 0) : api.patch('/vendors/me', { businessName });

// Hunts
export const getHunts = () =>
    OFFLINE ? fake({ hunts: DEMO_HUNTS }) : api.get('/hunts');

export const getHunt = (id: string) =>
    OFFLINE ? fake({ hunt: findDemoHunt(id) || DEMO_HUNTS[0] }) : api.get(`/hunts/${id}`);

/** The signed-in vendor's own hunts, drafts included. */
export const getMyHunts = () =>
    OFFLINE ? fake({ hunts: DEMO_HUNTS }) : api.get('/hunts/mine');

/** Owner-only: the secret printed in the store QR (never in public hunt data). */
export const getHuntQr = (id: string) =>
    OFFLINE ? fake({ huntId: id, qrSecret: `demo_secret_${id}` }) : api.get(`/hunts/${id}/qr`);

export const createHunt = (data: Record<string, unknown>) =>
    OFFLINE ? fake({ hunt: { ...DEMO_HUNTS[0], ...data, hunt_id: 'demo-1' } }, 500) : api.post('/hunts', data);

export const fundHunt = (data: Record<string, unknown>) =>
    OFFLINE ? fake({ success: true, txHash: demoTx() }, 400) : api.post('/hunts/fund', data);

export const withdrawHunt = (huntId: string, txHash: string) =>
    OFFLINE ? fake({ success: true, txHash }, 400) : api.post(`/hunts/${huntId}/withdraw`, { txHash });

// QR Scan
export const scanQR = (huntId: string, qrSecret: string, walletAddress: string) => {
    if (!OFFLINE) return api.post('/scan', { huntId, qrSecret, walletAddress });
    const hunt = findDemoHunt(huntId) || DEMO_HUNTS[0];
    const txHash = demoTx();
    return fake(
        {
            success: true,
            arrivalReward: hunt.arrival_reward,
            arrivalTxHash: txHash,
            explorerUrl: explorer(txHash),
            tasks: hunt.tasks,
            huntTitle: hunt.title,
            businessName: hunt.business_name,
            mainReward: hunt.main_reward,
        },
        600
    );
};

// Reviews (E2) — vendor-only (owner). The interceptor signs in for these GETs.
export const getReviews = (huntId: string) =>
    OFFLINE ? fake({ reviews: [] }) : api.get('/reviews', { params: { huntId } });

export const decideReview = (id: string, decision: 'approve' | 'reject') =>
    OFFLINE ? fake({ success: true, decision }, 300) : api.post(`/reviews/${id}/decision`, { decision });

// D1: save vendor-edited task rubrics.
export const updateHuntTasks = (huntId: string, tasks: unknown[]) =>
    OFFLINE ? fake({ success: true }, 200) : api.patch(`/hunts/${huntId}/tasks`, { tasks });

/** D1: 0G writes a photo rubric for each task title, before the hunt is created. */
export const previewRubrics = (titles: string[]) =>
    OFFLINE
        ? fake({ tasks: titles.map((t) => ({ title: t, rubric: t, rubricRequestId: 'demo-req', rubricByAi: true })) }, 400)
        : api.post('/hunts/rubric-preview', { titles });

// Participants
export const getParticipants = (huntId: string) =>
    OFFLINE
        ? fake({ participants: DEMO_PARTICIPANTS.map((p) => ({ ...p, hunt_id: huntId })) })
        : api.get(`/hunts/${huntId}/participants`);

// Tasks
/** C4: per-task server progress for the signed-in hunter (so a refresh keeps state). */
export const getProgress = (huntId: string) => {
    if (!OFFLINE) return api.get(`/hunts/${huntId}/progress`);
    const hunt = findDemoHunt(huntId) || DEMO_HUNTS[0];
    const tasks = (hunt.tasks || []).map((_t, i) => ({ taskIndex: i, status: 'todo', attemptsUsed: 0, attemptsLeft: 5, reason: null, confidence: null, zgRequestId: null }));
    return fake({ arrived: true, totalTasks: tasks.length, approvedCount: 0, allApproved: false, maxAttempts: 5, tasks });
};

/** C4: submit a task photo (downscaled data URL) for the 0G verdict. */
export const photoCheck = (huntId: string, taskIndex: number, taskText: string, imageDataUrl: string) => {
    if (!OFFLINE) return api.post('/photo-check', { huntId, taskIndex, taskText, imageDataUrl });
    return fake({ status: 'approved', reason: 'Looks good (demo).', autoReleased: true, attempt: 1, attemptsLeft: 4, confidence: 0.95, zgRequestId: 'demo-req', model: 'demo', verifiable: true, aiAvailable: true, zgError: null }, 700);
};

// Rewards — C5: the hunter claims their own main reward; the server pays only when all tasks are approved.
export const claimMainReward = (huntId: string) => {
    if (!OFFLINE) return api.post('/reward/claim', { huntId });
    const hunt = findDemoHunt(huntId) || DEMO_HUNTS[0];
    const txHash = demoTx();
    return fake({ success: true, mainReward: hunt.main_reward, rewardTxHash: txHash, explorerUrl: explorer(txHash) }, 600);
};

// Profile
export const getProfile = (walletAddress: string) =>
    OFFLINE ? fake(DEMO_PROFILE) : api.get(`/profile/${walletAddress}`);

// Hedera trust layer (F3/F4/G1) — all public reads
/** F3: the public receipt trail for one hunt (every money/trust line + HashScan links). */
export const getReceipt = (huntId: string) =>
    OFFLINE
        ? fake({ huntId, title: 'Demo hunt', businessName: 'Demo', topicId: '0.0.11307164', verifiedOnHedera: 0, lines: [] })
        : api.get(`/receipts/${huntId}`);

/** F4: "N payouts verified on Hedera" for a vendor. */
export const getVendorTrust = (wallet: string) =>
    OFFLINE ? fake({ wallet, verifiedPayouts: 0, topicId: null }) : api.get(`/vendors/${wallet}/trust`);

/** G1: one hunter's trust timeline for a hunt (4-sponsor proof links per step). */
export const getTimeline = (huntId: string, wallet: string) =>
    OFFLINE ? fake({ huntId, wallet, steps: [] }) : api.get(`/hunts/${huntId}/timeline`, { params: { wallet } });

/** F5: the hunter's Hedera stamp count (Mirror Node token balance by EVM address). */
export const getStamps = (wallet: string) =>
    OFFLINE ? fake({ wallet, stamps: 3, tokenId: '0.0.11307168', explorerUrl: 'https://hashscan.io/testnet/token/0.0.11307168' }) : api.get(`/stamps/${wallet}`);

export default api;
