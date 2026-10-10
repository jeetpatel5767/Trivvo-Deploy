/* placeholder: fabricated demo data, shown when the API returns nothing.
   Design system section 5 and 13 forbid displaying values that are not real — this file
   exists only so the UI demos well before the backend is populated.
   Delete this file and every `demoData` import to become spec-compliant. */

import type { Hunt } from './types';

/* placeholder: stand-in wallet used while OFFLINE, so wallet-gated screens open. */
export const DEMO_ADDRESS = '0x5aC1b0f7E92d34Ae81cB6072d4f5A3e9D8b17C40' as `0x${string}`;

// Relative so the demo always reads as a live hunt, whenever it is opened.
function iso(hoursAgo: number) {
  return new Date(Date.now() + hoursAgo * 3_600_000).toISOString();
}

const DEMO_START = new Date(Date.now() - 2 * 86_400_000).toISOString();
const DEMO_END = new Date(Date.now() + 11 * 86_400_000).toISOString();

export const DEMO_HUNTS: Hunt[] = [
  {
    hunt_id: 'demo-1',
    vendor_id: 'demo-vendor-1',
    vendor_wallet: DEMO_ADDRESS,
    title: 'Coffee Quest at Brew Lab',
    business_name: 'Brew Lab Café',
    arrival_reward: 0.5,
    main_reward: 5,
    status: 'active',
    location_name: 'Downtown',
    location_lat: 40.7128,
    location_lng: -74.006,
    description: 'Visit Brew Lab and discover their secret menu.',
    tasks: [
      { id: 1, title: 'Find the hidden menu board' },
      { id: 2, title: 'Order a special item' },
      { id: 3, title: 'Take a photo with the barista' },
    ],
    start_time: DEMO_START,
    end_time: DEMO_END,
    active_participants: 24,
    views: 412,
    qr_scans: 86,
    rewards_distributed: 148.5,
  },
  {
    hunt_id: 'demo-2',
    vendor_id: 'demo-vendor-2',
    vendor_wallet: DEMO_ADDRESS,
    title: 'Sneaker Hunt Challenge',
    business_name: 'Urban Kicks',
    arrival_reward: 1,
    main_reward: 10,
    status: 'active',
    location_name: 'Fashion District',
    location_lat: 40.7193,
    location_lng: -73.998,
    description: 'Find our limited edition sneaker display.',
    tasks: [
      { id: 1, title: 'Find the golden sneaker display' },
      { id: 2, title: 'Answer 3 trivia questions' },
      { id: 3, title: 'Share on social media' },
    ],
    start_time: DEMO_START,
    end_time: DEMO_END,
    active_participants: 11,
    views: 237,
    qr_scans: 41,
    rewards_distributed: 93.0,
  },
  {
    hunt_id: 'demo-3',
    vendor_id: 'demo-vendor-3',
    vendor_wallet: DEMO_ADDRESS,
    title: 'Art Gallery Adventure',
    business_name: 'Modern Art Space',
    arrival_reward: 0.75,
    main_reward: 7.5,
    status: 'active',
    location_name: 'Arts Quarter',
    location_lat: 40.7306,
    location_lng: -73.9866,
    description: 'Explore contemporary art and earn rewards.',
    tasks: [
      { id: 1, title: 'Visit 3 exhibits' },
      { id: 2, title: 'Take photos' },
      { id: 3, title: 'Write a short review' },
    ],
    start_time: DEMO_START,
    end_time: DEMO_END,
    active_participants: 7,
    views: 128,
    qr_scans: 19,
    rewards_distributed: 41.25,
  },
];

export const findDemoHunt = (id?: string) => DEMO_HUNTS.find((h) => h.hunt_id === id);

/* placeholder: fabricated participants, used by the offline API stub. */
export const DEMO_PARTICIPANTS = [
  { participant_id: 'p1', hunt_id: 'demo-1', wallet_address: '0x1f9a4c77b3e2d8104a6b', arrival_time: iso(-6), task_completed: true, arrival_tx_hash: '0xabc123', reward_tx_hash: '0xdef456' },
  { participant_id: 'p2', hunt_id: 'demo-1', wallet_address: '0x7c23e81db40f95a2c1de', arrival_time: iso(-18), task_completed: true, arrival_tx_hash: '0x111aaa', reward_tx_hash: '0x222bbb' },
  { participant_id: 'p3', hunt_id: 'demo-1', wallet_address: '0x4d80b1fa6e37c95208af', arrival_time: iso(-27), task_completed: true, arrival_tx_hash: '0x333ccc', reward_tx_hash: null },
  { participant_id: 'p4', hunt_id: 'demo-1', wallet_address: '0xb612079ce4a8df3315bc', arrival_time: iso(-44), task_completed: false, arrival_tx_hash: '0x444ddd', reward_tx_hash: null },
  { participant_id: 'p5', hunt_id: 'demo-1', wallet_address: '0x9e35ca70128bf6d4a07e', arrival_time: iso(-61), task_completed: false, arrival_tx_hash: '0x555eee', reward_tx_hash: null },
];

/* placeholder: fabricated profile stats and activity. */
export const DEMO_PROFILE = {
  stats: { huntsCompleted: 4, totalEarned: '23.75', currentStreak: 2 },
  recentActivity: [
    { title: 'Coffee Quest at Brew Lab', reward: '5.50', timestamp: iso(-6), status: 'completed' },
    { title: 'Sneaker Hunt Challenge', reward: '11.00', timestamp: iso(-30), status: 'completed' },
    { title: 'Art Gallery Adventure', reward: '0.75', timestamp: iso(-52), status: 'in-progress' },
  ],
};
