/* A readable name for a hunter.
 *
 * The schema has no username — participants are only a wallet_address — so the default
 * is derived deterministically from that address rather than invented: the same wallet
 * always yields the same name. A name the user types is kept per-viewer in localStorage.
 * When the backend gains a real name field, read it here and drop the rest. */

const ADJECTIVES = [
  'Swift', 'Quiet', 'Bright', 'Lucky', 'Bold', 'Keen', 'Early', 'Sharp',
  'Calm', 'Wild', 'True', 'Fleet', 'Clever', 'Steady', 'Brave', 'Nimble',
];

const NOUNS = [
  'Fox', 'Falcon', 'Otter', 'Heron', 'Marten', 'Badger', 'Lynx', 'Crane',
  'Hare', 'Wren', 'Stag', 'Ibis', 'Magpie', 'Owl', 'Pike', 'Finch',
];

const STORE_KEY = 'trivvo.displayName';

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return h;
}

/** Same wallet, same name, every time. */
export function deriveName(address?: string | null): string {
  if (!address) return 'Hunter';
  const h = hash(address.toLowerCase());
  return `${ADJECTIVES[h % ADJECTIVES.length]} ${NOUNS[(h >>> 8) % NOUNS.length]}`;
}

export function storedName(): string | null {
  try {
    return localStorage.getItem(STORE_KEY);
  } catch {
    return null;
  }
}

export function storeName(name: string) {
  try {
    if (name.trim()) localStorage.setItem(STORE_KEY, name.trim());
    else localStorage.removeItem(STORE_KEY);
  } catch {
    /* storage blocked — the derived name still works */
  }
}

/** Two letters for the avatar, taken from whatever name is in use. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/* ── Vendor shopfront ─────────────────────────────────────────────────────── */

const BUSINESS_KEY = 'trivvo.businessName';

/** What the backend registers a vendor as until a real field exists. */
export const DEFAULT_BUSINESS = 'Brew Lab Café';

export function businessName(): string {
  try {
    return localStorage.getItem(BUSINESS_KEY) || DEFAULT_BUSINESS;
  } catch {
    return DEFAULT_BUSINESS;
  }
}

export function storeBusinessName(name: string) {
  try {
    if (name.trim()) localStorage.setItem(BUSINESS_KEY, name.trim());
    else localStorage.removeItem(BUSINESS_KEY);
  } catch {
    /* storage blocked — the default still works */
  }
}
