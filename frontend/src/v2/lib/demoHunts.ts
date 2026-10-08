import type { HuntLike } from '../components/HuntCard';

/**
 * Fallback hunts shown when the backend is unreachable, so the UI is always
 * demonstrable.
 *
 * v1 hardcoded absolute dates (2026-03-01 → 2026-04-01) in two separate files,
 * which means its fallback hunts now render as expired. These are generated
 * relative to the current time instead, so they stay active.
 */

const HOUR = 3600_000;
const DAY = 24 * HOUR;

function window(startOffset: number, endOffset: number) {
    return {
        start_time: new Date(Date.now() + startOffset).toISOString(),
        end_time: new Date(Date.now() + endOffset).toISOString(),
    };
}

export interface DemoHunt extends HuntLike {
    location_lat: number;
    location_lng: number;
    tasks: string[];
}

export const DEMO_HUNTS: DemoHunt[] = [
    {
        hunt_id: 'demo-1',
        title: 'Coffee Quest at Brew Lab',
        business_name: 'Brew Lab Café',
        arrival_reward: 0.5,
        main_reward: 5,
        status: 'active',
        location_name: 'Downtown',
        location_lat: 40.7128,
        location_lng: -74.006,
        description:
            'Visit Brew Lab and discover their secret menu. Find hidden items, complete challenges, and earn USDC rewards.',
        tasks: ['Find the hidden menu board', 'Order a special item', 'Take a photo with the barista'],
        active_participants: 24,
        ...window(-2 * DAY, 12 * DAY),
    },
    {
        hunt_id: 'demo-2',
        title: 'Sneaker Hunt Challenge',
        business_name: 'Urban Kicks',
        arrival_reward: 1,
        main_reward: 10,
        status: 'active',
        location_name: 'Fashion District',
        location_lat: 40.7193,
        location_lng: -73.998,
        description:
            'Find our limited edition sneaker display, answer 3 trivia questions about sneaker history, and win big USDC rewards.',
        tasks: ['Find the golden sneaker display', 'Answer 3 trivia questions', 'Share on social media'],
        active_participants: 8,
        ...window(-6 * HOUR, 3 * DAY),
    },
    {
        hunt_id: 'demo-3',
        title: 'Art Gallery Adventure',
        business_name: 'Modern Art Space',
        arrival_reward: 0.75,
        main_reward: 7.5,
        status: 'upcoming',
        location_name: 'Arts Quarter',
        location_lat: 40.7306,
        location_lng: -73.9866,
        description:
            'Explore contemporary art and earn rewards. Visit exhibits, take photos, and write a short review.',
        tasks: ['Visit 3 exhibits', 'Take photos', 'Write a short review'],
        active_participants: 0,
        ...window(2 * DAY, 20 * DAY),
    },
];

export function findDemoHunt(id?: string): DemoHunt {
    return DEMO_HUNTS.find((h) => h.hunt_id === id) ?? DEMO_HUNTS[0];
}
