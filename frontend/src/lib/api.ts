import axios from 'axios';
import { DEMO_HUNTS, DEMO_PARTICIPANTS, DEMO_PROFILE, findDemoHunt } from './demoData';

/* ──────────────────────────────────────────────────────────────────────────
   OFFLINE = true  → the backend is unplugged. Every call below resolves
   locally from demoData.ts so you can click through every screen instantly.
   Set it to false to talk to the real API again. Nothing else needs changing.
   ────────────────────────────────────────────────────────────────────────── */
export const OFFLINE = true;

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
});

/** Resolves like an axios response, after a short beat so skeletons still show. */
const fake = <T,>(data: T, ms = 150): Promise<{ data: T }> =>
    new Promise((resolve) => setTimeout(() => resolve({ data }), ms));

const demoTx = () => '0xdemo' + Math.random().toString(16).slice(2, 14);
const explorer = (hash: string) => `https://snowtrace.io/tx/${hash}`;

// Auth
export const login = (walletAddress: string, role: string, businessName?: string) =>
    OFFLINE
        ? fake({ success: true }, 0)
        : api.post('/login', { walletAddress, role, businessName });

// Hunts
export const getHunts = () =>
    OFFLINE ? fake({ hunts: DEMO_HUNTS }) : api.get('/hunts');

export const getHunt = (id: string) =>
    OFFLINE ? fake({ hunt: findDemoHunt(id) || DEMO_HUNTS[0] }) : api.get(`/hunts/${id}`);

export const createHunt = (data: any) =>
    OFFLINE ? fake({ hunt: { ...DEMO_HUNTS[0], ...data, hunt_id: 'demo-1' } }, 500) : api.post('/hunts', data);

export const fundHunt = (data: any) =>
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

// Participants
export const getParticipants = (huntId: string) =>
    OFFLINE
        ? fake({ participants: DEMO_PARTICIPANTS.map((p) => ({ ...p, hunt_id: huntId })) })
        : api.get(`/hunts/${huntId}/participants`);

// Tasks
export const completeTask = (huntId: string, walletAddress: string) =>
    OFFLINE ? fake({ success: true }, 300) : api.post('/task-complete', { huntId, walletAddress });

// Rewards
export const claimMainReward = (huntId: string, walletAddress: string) => {
    if (!OFFLINE) return api.post('/reward/main', { huntId, walletAddress });
    const hunt = findDemoHunt(huntId) || DEMO_HUNTS[0];
    const txHash = demoTx();
    return fake({ mainReward: hunt.main_reward, rewardTxHash: txHash, explorerUrl: explorer(txHash) }, 600);
};

// Profile
export const getProfile = (walletAddress: string) =>
    OFFLINE ? fake(DEMO_PROFILE) : api.get(`/profile/${walletAddress}`);

export default api;
