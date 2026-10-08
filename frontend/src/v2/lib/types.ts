/** Shared types for the v2 customer flow. */

/** A hunt as returned by GET /api/hunts and GET /api/hunts/:id. */
export interface Hunt {
    hunt_id: string;
    title: string;
    business_name?: string;
    arrival_reward: number | string;
    main_reward: number | string;
    status?: string;
    description?: string;
    location_name?: string;
    location_lat?: number | string;
    location_lng?: number | string;
    start_time?: string;
    end_time?: string;
    tasks?: string[];
    active_participants?: number;
    remaining_funds?: string;
}

/**
 * Router state carried from the scan screen through the reward and task
 * screens. Everything is optional because a user can land on those routes
 * directly, with no state at all.
 */
export interface ScanState {
    huntId?: string;
    huntTitle?: string;
    businessName?: string;
    arrivalReward?: number | string;
    mainReward?: number | string;
    txHash?: string;
    explorerUrl?: string;
    tasks?: string[];
}

/** Router state carried into the scan screen from a hunt. */
export interface HuntNavState {
    hunt?: Hunt;
}

/** Shape of an axios error body this app actually reads. */
export interface ApiError {
    response?: { data?: { error?: string } };
}

export function apiErrorMessage(err: unknown, fallback: string): string {
    return (err as ApiError)?.response?.data?.error || fallback;
}
