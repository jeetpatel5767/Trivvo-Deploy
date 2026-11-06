import { useEffect, useState } from 'react';

/**
 * Time wording shared by the hunter and business screens, so both sides tell the same story:
 * a hunt that has not opened yet says "Starts in 2m" (not a countdown to its end), and the exact
 * window is always available as plain text.
 */

/** "2d 5h", "1h 59m", "12m": the two largest units, so a 1h 59m run doesn't read as "1h". */
export function span(ms: number): string {
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (days >= 1) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours >= 1) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  return `${Math.max(1, mins)}m`;
}

/** "Starts in 2m" while a hunt has not opened yet, otherwise null. */
export function startsIn(startsAt?: string | null): string | null {
  if (!startsAt) return null;
  const ms = new Date(startsAt).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return null;
  return `Starts in ${span(ms)}`;
}

const clock = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
const day = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/** "6 Nov, 4:55 PM to 5:55 PM · 1h": the exact window, so nobody has to guess from a countdown. */
export function formatWindow(startsAt?: string | null, endsAt?: string | null): string | null {
  if (!startsAt || !endsAt) return null;
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  const sameDay = s.toDateString() === e.toDateString();
  const to = sameDay ? clock(e) : `${day(e)}, ${clock(e)}`;
  return `${day(s)}, ${clock(s)} to ${to} · ${span(e.getTime() - s.getTime())}`;
}

/** Re-render every `ms` so countdowns and Upcoming/Live badges move without a page reload. */
export function useNow(ms = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
