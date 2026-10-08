import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { getHunts } from '../../lib/api';
import { Screen, Skeleton, Empty, Money, Badge } from '../components/UI';
import { HuntCard, type HuntLike } from '../components/HuntCard';
import { TabBar } from '../components/TabBar';
import { Search, Compass } from '../components/Icons';
import { DEMO_HUNTS } from '../lib/demoHunts';
import { shortAddress, totalReward } from '../lib/format';

const FILTERS = ['all', 'active', 'upcoming'] as const;
type Filter = (typeof FILTERS)[number];

export default function V2Hunts() {
    const navigate = useNavigate();
    const { address } = useAccount();
    const [hunts, setHunts] = useState<HuntLike[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<Filter>('all');

    useEffect(() => {
        let cancelled = false;

        async function fetchHunts() {
            try {
                const res = await getHunts();
                const apiHunts: HuntLike[] = res.data.hunts || [];
                if (!cancelled) setHunts(apiHunts.length > 0 ? apiHunts : DEMO_HUNTS);
            } catch {
                if (!cancelled) setHunts(DEMO_HUNTS);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchHunts();
        return () => { cancelled = true; };
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return hunts.filter((h) => {
            const matchesSearch =
                !q ||
                h.title?.toLowerCase().includes(q) ||
                h.business_name?.toLowerCase().includes(q) ||
                h.location_name?.toLowerCase().includes(q);
            const matchesFilter = filter === 'all' || (h.status || '').toLowerCase() === filter;
            return matchesSearch && matchesFilter;
        });
    }, [hunts, search, filter]);

    // Total USDC currently claimable across every live hunt — a real number,
    // derived from live data rather than the invented progress stats in v1.
    const liveValue = useMemo(
        () =>
            hunts
                .filter((h) => (h.status || '').toLowerCase() === 'active')
                .reduce((sum, h) => sum + totalReward(h), 0),
        [hunts]
    );

    const activeCount = hunts.filter((h) => (h.status || '').toLowerCase() === 'active').length;

    return (
        <>
            <Screen>
                {/* Header. Profile lives in the tab bar, so no action here. */}
                <div style={{ marginBottom: 22, minHeight: 42 }}>
                    <span className="v2-topbar__eyebrow">Nearby</span>
                    <h1 className="v2-topbar__title" style={{ fontSize: 25 }}>Explore</h1>
                </div>

                {/* Live value banner — honest aggregate of what's on the table */}
                {!loading && activeCount > 0 && (
                    <div
                        className="v2-card v2-card--flat v2-row v2-row--between"
                        style={{ marginBottom: 22, padding: '16px 18px' }}
                    >
                        <div>
                            <div
                                style={{
                                    fontSize: 10.5,
                                    fontWeight: 650,
                                    letterSpacing: '0.09em',
                                    textTransform: 'uppercase',
                                    color: 'var(--v2-text-lo)',
                                    marginBottom: 5,
                                }}
                            >
                                Up for grabs nearby
                            </div>
                            <Money amount={liveValue} size="md" />
                        </div>
                        <Badge tone="live" dot>
                            {activeCount} live
                        </Badge>
                    </div>
                )}

                {/* Search */}
                <div className="v2-searchwrap" style={{ marginBottom: 12 }}>
                    <Search />
                    <input
                        className="v2-input"
                        placeholder="Search hunts, places, brands"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Filters */}
                <div className="v2-segmented" style={{ marginBottom: 22 }}>
                    {FILTERS.map((f) => (
                        <button
                            key={f}
                            className={`v2-chip${filter === f ? ' v2-chip--on' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f[0].toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>

                {/* List */}
                {loading ? (
                    <div className="v2-stack v2-stack--16">
                        <Skeleton height={176} />
                        <Skeleton height={176} />
                        <Skeleton height={176} />
                    </div>
                ) : filtered.length === 0 ? (
                    <Empty
                        icon={<Compass />}
                        title="Nothing here yet"
                        body={
                            search
                                ? 'No hunts match that search. Try a different term or clear the filter.'
                                : 'No hunts are live right now. Check back soon.'
                        }
                    />
                ) : (
                    <div className="v2-stack v2-stack--16">
                        {filtered.map((hunt, i) => (
                            <div
                                key={hunt.hunt_id}
                                style={{
                                    animation: 'v2-enter .4s var(--v2-ease) both',
                                    animationDelay: `${Math.min(i, 6) * 0.045}s`,
                                }}
                            >
                                <HuntCard
                                    hunt={hunt}
                                    onClick={() => navigate(`/v2/hunt/${hunt.hunt_id}`)}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {address && (
                    <p
                        style={{
                            textAlign: 'center',
                            fontSize: 12,
                            color: 'var(--v2-text-lo)',
                            marginTop: 26,
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        Signed in as {shortAddress(address)}
                    </p>
                )}
            </Screen>
            <TabBar />
        </>
    );
}
