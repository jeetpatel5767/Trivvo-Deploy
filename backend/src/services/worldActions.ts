/**
 * One World ID action per hunt.
 *
 * World ID 4.0 lets a person verify only once per action, ever. With one shared action
 * ('tr-vvo-arrival') a hunter could verify for their first hunt and never again. World's
 * guidance is "separate actions for separate one-time operations", so each hunt gets its own
 * pair: tr-vvo-<huntId>-arrival and tr-vvo-<huntId>-main, created through the Developer Portal
 * API the first time a hunter needs one (max_verifications 1 = one claim per person per hunt).
 *
 * Without WORLD_PORTAL_API_KEY the old shared actions are used, so local setups keep working.
 */

export type WorldCheckKind = 'arrival' | 'main';

const PORTAL = (process.env.WORLD_PORTAL_URL || 'https://developer.world.org').replace(/\/$/, '');
const APP_ID = process.env.WORLD_APP_ID || '';
const PORTAL_KEY = process.env.WORLD_PORTAL_API_KEY || '';

export const perHuntActionsEnabled = () => APP_ID.startsWith('app_') && PORTAL_KEY.length > 0;

const legacyAction = (kind: WorldCheckKind) => `tr-vvo-${kind}`;
const huntAction = (huntId: string, kind: WorldCheckKind) => `tr-vvo-${huntId}-${kind}`;

// Actions we know exist (created now or earlier); avoids a portal call on every check.
const known = new Set<string>();

/** The action a hunter must verify with for this hunt, created in the portal if needed. */
export async function ensureHuntAction(huntId: string, kind: WorldCheckKind, huntTitle: string): Promise<string> {
    if (!perHuntActionsEnabled()) return legacyAction(kind);
    const action = huntAction(huntId, kind);
    if (known.has(action)) return action;

    const res = await fetch(`${PORTAL}/api/v2/create-action/${APP_ID}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${PORTAL_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action,
            name: `${huntTitle || 'Hunt'} (${kind})`.slice(0, 100),
            description: kind === 'arrival' ? 'Unique human check before the arrival reward' : 'Stronger check before a main reward above $5',
            max_verifications: 1,
        }),
    });
    const body: any = await res.json().catch(() => ({}));
    // 400 constraint-violation = it already exists, which is what we want.
    if (res.ok || body?.code === 'constraint-violation') {
        known.add(action);
        return action;
    }
    throw new Error(`World action could not be created (${res.status} ${body?.code || ''})`);
}

/** Which check an action string is for this hunt (its own action, or the old shared one); null if neither. */
export function kindOfAction(action: string, huntId: string): WorldCheckKind | null {
    for (const kind of ['arrival', 'main'] as const) {
        if (action === huntAction(huntId, kind)) return kind;
        // Shared actions only while per-hunt actions are off (otherwise one old proof could cover any hunt).
        if (!perHuntActionsEnabled() && action === legacyAction(kind)) return kind;
    }
    return null;
}
