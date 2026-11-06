import { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, ChevronDown, Check, X } from 'lucide-react';
import { getHunts } from '../../lib/api';
import { totalReward, type Hunt } from '../../lib/types';
import { HuntCard } from '../../components/HuntCard';
import { TabBar } from '../../components/TabBar';
import { AppBar, Block, Button, CardSkeleton, Chip, ChipRow, EmptyState, Input, Money, Panel, Sheet } from '../../ui';
import { useNow } from '../../lib/time';
import { Icon } from '../../components/Icon';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Live' },
  { key: 'upcoming', label: 'Upcoming' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

const ALL_AREAS = 'All areas';

/** Explore — pink hero: headline left, area picker right, stat row across the bottom. */
export default function HuntsPage() {
  const [hunts, setHunts] = useState<Hunt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [area, setArea] = useState<string>(ALL_AREAS);
  const [areaOpen, setAreaOpen] = useState(false);

  const [failed, setFailed] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const now = useNow(30_000);

  /* Real data only: an empty list or a failed call shows as such, never as demo hunts. */
  const [freshCount, setFreshCount] = useState(0);

  const load = () => {
    setLoading(true);
    setFailed(false);
    getHunts()
      .then((res) => {
        const list: Hunt[] = res.data.hunts || [];
        setHunts(list);
        // G2: count hunts that went live in the last 30 min (computed off-render, in this callback).
        const cutoff = Date.now() - 30 * 60_000;
        setFreshCount(list.filter((h) => h.status === 'active' && new Date(h.start_time).getTime() >= cutoff).length);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };

  // Initial load on mount; load() kicks off the fetch and manages its own state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  /** Areas come from the hunts already loaded — no extra lookup, no invented places. */
  const areas = useMemo(() => {
    const names = hunts.map((h) => h.location_name).filter((n): n is string => !!n);
    return [ALL_AREAS, ...Array.from(new Set(names))];
  }, [hunts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return hunts.filter((h) => {
      const matchSearch =
        !q ||
        h.title?.toLowerCase().includes(q) ||
        h.business_name?.toLowerCase().includes(q) ||
        h.location_name?.toLowerCase().includes(q);
      const matchArea = area === ALL_AREAS || h.location_name === area;
      // The server said "upcoming" when the list loaded; once its start time passes it is live.
      const status = h.status === 'upcoming' && new Date(h.start_time).getTime() <= now ? 'active' : h.status;
      return matchSearch && matchArea && (filter === 'all' || status === filter);
    });
  }, [hunts, search, filter, area, now]);

  /** The hero reflects whatever area is selected. */
  const live = useMemo(
    () =>
      filtered.filter((h) => h.status === 'active' || (h.status === 'upcoming' && new Date(h.start_time).getTime() <= now)),
    [filtered, now]
  );
  const liveValue = useMemo(() => live.reduce((s, h) => s + totalReward(h), 0), [live]);

  return (
    <>
      <div className="screen screen--tabbar">
        {/* Pink hero — headline left, area picker right, stat row across the bottom */}
        <div className="hero hero--pink">
          <AppBar
            tone="pink"
            action={
              areas.length > 1 && (
                <button
                  type="button"
                  className="btn btn--ink btn--sm"
                  style={{ maxWidth: 190 }}
                  onClick={() => setAreaOpen(true)}
                >
                  <MapPin size={15} strokeWidth={2.4} />
                  <span className="truncate">{area}</span>
                  <ChevronDown size={15} strokeWidth={2.4} />
                </button>
              )
            }
          />

          <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.045em', marginTop: 12 }}>
            Pick one
            <br />
            and go.
          </h1>

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 16,
              marginTop: 30,
            }}
          >
            <div>
              <span className="overline">Live right now</span>
              <div style={{ marginTop: 10 }}>
                <Money value={liveValue} size="hero" chip />
              </div>
            </div>

            {/* White tile lifts the count off the pink — the money stays bare so it still leads */}
            <div
              style={{
                flex: 'none',
                background: 'var(--paper)',
                borderRadius: 'var(--r-lg)',
                padding: '14px 16px',
                textAlign: 'center',
                minWidth: 98,
              }}
            >
              <div className="tnum" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.035em' }}>
                {live.length}
              </div>
              <div className="caption t-subtle" style={{ marginTop: 6 }}>
                {live.length === 1 ? 'hunt' : 'hunts'} live
              </div>
            </div>
          </div>
        </div>

        {/* Search + filters */}
        <div className="pad" style={{ marginTop: 24 }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={18}
              strokeWidth={2.2}
              style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ink-subtle)',
                pointerEvents: 'none',
              }}
            />
            <Input
              placeholder="Search hunts or places"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 46, background: 'var(--paper)' }}
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <ChipRow>
            {FILTERS.map((f) => (
              <Chip key={f.key} on={filter === f.key} onClick={() => setFilter(f.key)}>
                {f.label}
              </Chip>
            ))}
          </ChipRow>
        </div>

        {/* G2: "New hunt" banner when something went live recently. */}
        {freshCount > 0 && !bannerDismissed && (
          <div className="pad" style={{ marginTop: 16 }}>
            <div
              className="row"
              style={{ gap: 12, background: 'var(--pink-soft)', borderRadius: 'var(--r-lg)', padding: '12px 14px' }}
            >
              <Icon name="bell" set="objects" size={22} style={{ flex: 'none' }} />
              <span className="body-sm grow" style={{ fontWeight: 600 }}>
                {freshCount === 1 ? 'A new hunt just went live' : `${freshCount} new hunts just went live`}
              </span>
              <button
                type="button"
                onClick={() => setBannerDismissed(true)}
                aria-label="Dismiss"
                style={{ flex: 'none', background: 'none', padding: 4, color: 'var(--ink-subtle)' }}
              >
                <X size={16} strokeWidth={2.4} />
              </button>
            </div>
          </div>
        )}

        <div className="stack pad" style={{ marginTop: 24 }}>
          {loading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : failed ? (
            <EmptyState
              icon={<Icon name="compass" set="objects" size={26} />}
              title="Could not load hunts"
              body="Check your connection and try again."
              action={
                <Button variant="ink" size="md" onClick={load}>
                  Try again
                </Button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Icon name="compass" set="objects" size={26} />}
              title="Nothing here yet"
              body={
                area !== ALL_AREAS
                  ? `No hunts in ${area} right now. Try another area.`
                  : search || filter !== 'all'
                    ? 'No hunts match that. Try a different search.'
                    : 'No hunts are live right now. Check back soon.'
              }
            />
          ) : (
            <div className="stack stagger">
              {filtered.map((hunt) => (
                <HuntCard key={hunt.hunt_id} hunt={hunt} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Area picker */}
      <Sheet open={areaOpen} onClose={() => setAreaOpen(false)}>
        <span className="overline t-subtle">Where are you hunting?</span>
        <div style={{ marginTop: 14, marginLeft: -24, marginRight: -24 }}>
          <Panel inset={false} flush tone="paper">
            {areas.map((name) => (
              <Block key={name} tight style={{ padding: 0 }}>
                <button
                  type="button"
                  onClick={() => {
                    setArea(name);
                    setAreaOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '16px 24px',
                    textAlign: 'left',
                    background: area === name ? 'var(--pink-soft)' : 'transparent',
                  }}
                >
                  <span className="body" style={{ fontWeight: area === name ? 700 : 500 }}>
                    {name}
                  </span>
                  {area === name && <Check size={18} strokeWidth={2.6} />}
                </button>
              </Block>
            ))}
          </Panel>
        </div>
      </Sheet>

      <TabBar />
    </>
  );
}
