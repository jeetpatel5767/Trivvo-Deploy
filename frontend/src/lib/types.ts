/** Shapes returned by the backend. Mirrors database/schema.sql plus the analytics join. */

export interface Hunt {
  hunt_id: string;
  vendor_id: string;
  title: string;
  description?: string | null;
  location_lat: string | number;
  location_lng: string | number;
  location_name?: string | null;
  start_time: string;
  end_time: string;
  arrival_reward: string | number;
  main_reward: string | number;
  radius_m?: number | null;
  qr_secret?: string;
  contract_hunt_id?: number | null;
  /** pending = draft (not funded); active = live; upcoming / expired are computed by the API */
  status: 'pending' | 'active' | 'upcoming' | 'ended' | 'expired';
  /** Only the vendor's own list carries the tasks; hunters get the count until they check in. */
  tasks?: HuntTask[];
  task_count?: number;
  created_at?: string;

  /* joined */
  business_name?: string;
  vendor_wallet?: string;
  views?: number;
  qr_scans?: number;
  active_participants?: number;
  rewards_distributed?: string | number;
}

export interface HuntTask {
  id?: string | number;
  title?: string;
  description?: string;
  [key: string]: unknown;
}

export interface Participant {
  participant_id: string;
  hunt_id: string;
  wallet_address: string;
  arrival_claimed?: boolean;
  task_completed?: boolean;
  main_claimed?: boolean;
  joined_at?: string;
  [key: string]: unknown;
}

/** Sum of both reward legs — the "earn up to" figure on a hunt card. */
export const totalReward = (h: Pick<Hunt, 'arrival_reward' | 'main_reward'>) =>
  Number(h.arrival_reward ?? 0) + Number(h.main_reward ?? 0);
