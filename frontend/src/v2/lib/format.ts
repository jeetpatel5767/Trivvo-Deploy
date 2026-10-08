/**
 * Formatting helpers for v2.
 *
 * v1 displayed several invented values (a hardcoded "2.4 KM" distance and a
 * "Myths Found" count derived from `title.length * 7`). v2 shows only values
 * that are actually real, so everything here derives from live data.
 */

/** Short wallet form: 0x1234…abcd */
export function shortAddress(address?: string | null): string {
    if (!address || address.length < 10) return '—';
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Human time remaining until `end`. Returns null when there is no usable date,
 * so callers can omit the row entirely rather than render a placeholder.
 */
export function timeRemaining(end?: string | null): string | null {
    if (!end) return null;
    const endMs = new Date(end).getTime();
    if (!Number.isFinite(endMs)) return null;

    const diff = endMs - Date.now();
    if (diff <= 0) return 'Ended';

    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m left`;

    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h left`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d left`;

    return `${Math.floor(days / 30)}mo left`;
}

/** Time until a hunt opens, for upcoming hunts. */
export function timeUntil(start?: string | null): string | null {
    if (!start) return null;
    const startMs = new Date(start).getTime();
    if (!Number.isFinite(startMs)) return null;

    const diff = startMs - Date.now();
    if (diff <= 0) return null;

    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `Opens in ${mins}m`;

    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Opens in ${hours}h`;

    return `Opens in ${Math.floor(hours / 24)}d`;
}

/** Total payout for a hunt: arrival + main. */
export function totalReward(hunt?: { arrival_reward?: unknown; main_reward?: unknown } | null): number {
    if (!hunt) return 0;
    const a = Number(hunt.arrival_reward) || 0;
    const m = Number(hunt.main_reward) || 0;
    return a + m;
}

/** Friendly date for activity rows. */
export function shortDate(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
