import { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, ChevronDown, Check } from 'lucide-react';
import { getHunts } from '../../lib/api';
import { DEMO_HUNTS } from '../../lib/demoData';
import { totalReward, type Hunt } from '../../lib/types';
import { HuntCard } from '../../components/HuntCard';
import { TabBar } from '../../components/TabBar';
import { AppBar, Block, CardSkeleton, Chip, ChipRow, EmptyState, Input, Money, Panel, Sheet } from '../../ui';
import { Icon } from '../../components/Icon';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Live' },
  { key: 'pending', label: 'Upcoming' },
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

  useEffect(() => {
    getHunts()
      .then((res) => {
        const apiHunts: Hunt[] = res.data.hunts || [];
        setHunts(apiHunts.length > 0 ? apiHunts : DEMO_HUNTS);
      })
      .catch(() => setHunts(DEMO_HUNTS))
      .finally(() => setLoading(false));
  }, []);

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
      return matchSearch && matchArea && (filter === 'all' || h.status === filter);
    });
  }, [hunts, search, filter, area]);

  /** The hero reflects whatever area is selected. */
  const live = useMemo(
    () => filtered.filter((h) => h.status === 'active'),
    [filtered]
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

        <div className="stack pad" style={{ marginTop: 24 }}>
          {loading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
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
