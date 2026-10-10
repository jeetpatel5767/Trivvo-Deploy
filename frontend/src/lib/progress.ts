/* Progression derived from the stats the API already returns.
 *
 * There is no XP, level or badge table in the schema, so nothing here is stored or
 * invented per-session: every figure is computed from huntsCompleted, totalEarned,
 * currentStreak and the activity count. The thresholds below are the only judgement
 * calls — move them to the backend when progression becomes real. */

export interface ProfileStats {
  huntsCompleted: number;
  totalEarned: string | number;
  currentStreak: number;
}

const XP_PER_HUNT = 150;
const XP_PER_USDC = 10;
const XP_PER_LEVEL = 200;

const RANKS = ['Newcomer', 'Wanderer', 'Trailblazer', 'Pathfinder', 'Cartographer', 'Legend'];

export function progression(stats: ProfileStats) {
  const earned = Number(stats.totalEarned) || 0;
  const xp = Math.round(stats.huntsCompleted * XP_PER_HUNT + earned * XP_PER_USDC);

  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const nextAt = level * XP_PER_LEVEL;
  const floor = (level - 1) * XP_PER_LEVEL;
  const intoLevel = xp - floor;

  return {
    xp,
    level,
    nextAt,
    toNext: nextAt - xp,
    progress: intoLevel / XP_PER_LEVEL,
    rank: RANKS[Math.min(level - 1, RANKS.length - 1)],
  };
}

export interface Badge {
  id: string;
  label: string;
  earned: boolean;
}

/** Earned state comes from real counters; the thresholds are the invented part. */
export function badgesFor(stats: ProfileStats, spots: number): Badge[] {
  return [
    { id: 'first-hunt', label: 'First Hunt', earned: stats.huntsCompleted >= 1 },
    { id: 'curious-mind', label: 'Curious Mind', earned: spots >= 3 },
    { id: 'streak-starter', label: 'Streak Starter', earned: stats.currentStreak >= 2 },
  ];
}
