import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useDisconnect } from 'wagmi';
import { getProfile } from '../../lib/api';
import {
    Screen, TopBar, Button, Card, Money, Label, Skeleton, Empty, Badge,
} from '../components/UI';
import { TabBar } from '../components/TabBar';
import { Wallet, Trophy, Flame, Compass } from '../components/Icons';
import { shortAddress, shortDate } from '../lib/format';

interface Activity {
    title: string;
    reward: string;
    timestamp: string;
    status: string;
}

interface Stats {
    huntsCompleted: number;
    totalEarned: string;
    currentStreak: number;
}

export default function V2Profile() {
    const navigate = useNavigate();
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();

    const [stats, setStats] = useState<Stats | null>(null);
    const [activity, setActivity] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function fetchProfile() {
            if (!address) {
                if (!cancelled) setLoading(false);
                return;
            }
            try {
                const res = await getProfile(address);
                if (!cancelled) {
                    setStats(res.data.stats);
                    setActivity(res.data.recentActivity || []);
                }
            } catch {
                if (!cancelled) {
                    setStats({ huntsCompleted: 0, totalEarned: '0.00', currentStreak: 0 });
                    setActivity([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchProfile();
        return () => { cancelled = true; };
    }, [address]);

    if (!isConnected) {
        return (
            <>
                <Screen centered>
                    <Empty
                        icon={<Wallet />}
                        title="No wallet connected"
                        body="Connect a wallet to see your earnings and hunt history."
                        action={<Button onClick={() => navigate('/v2/login')}>Connect wallet</Button>}
                    />
                </Screen>
                <TabBar />
            </>
        );
    }

    return (
        <>
            <Screen>
                <TopBar title="Profile" />

                {/* Earnings — the headline number */}
                <Card style={{ marginBottom: 20, textAlign: 'center', padding: '28px 20px' }}>
                    <div
                        style={{
                            fontSize: 10.5,
                            fontWeight: 650,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: 'var(--v2-text-lo)',
                            marginBottom: 12,
                        }}
                    >
                        Total earned
                    </div>

                    {loading ? (
                        <div style={{ maxWidth: 180, margin: '0 auto' }}>
                            <Skeleton height={44} radius={12} />
                        </div>
                    ) : (
                        <Money amount={stats?.totalEarned ?? 0} size="hero" />
                    )}

                    <div
                        className="v2-row"
                        style={{
                            justifyContent: 'center',
                            gap: 8,
                            marginTop: 18,
                            paddingTop: 16,
                            borderTop: '1px solid var(--v2-hairline)',
                        }}
                    >
                        <Wallet className="v2-prof-wallet" />
                        <span
                            style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: 'var(--v2-text-mid)',
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            {shortAddress(address)}
                        </span>
                    </div>
                </Card>

                {/* Secondary stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
                    <StatTile
                        icon={<Trophy />}
                        value={loading ? '—' : String(stats?.huntsCompleted ?? 0)}
                        label="Hunts completed"
                    />
                    <StatTile
                        icon={<Flame />}
                        value={loading ? '—' : String(stats?.currentStreak ?? 0)}
                        label="Current streak"
                    />
                </div>

                {/* Activity */}
                <Label>Recent activity</Label>
                {loading ? (
                    <div className="v2-stack v2-stack--8">
                        <Skeleton height={68} radius={18} />
                        <Skeleton height={68} radius={18} />
                    </div>
                ) : activity.length === 0 ? (
                    <Empty
                        icon={<Compass />}
                        title="No hunts yet"
                        body="Your completed hunts and payouts will show up here."
                        action={<Button onClick={() => navigate('/v2/hunts')}>Find a hunt</Button>}
                    />
                ) : (
                    <div className="v2-stack v2-stack--8">
                        {activity.map((item, i) => {
                            const complete = item.status === 'completed';
                            return (
                                <Card key={i} variant="flat" style={{ padding: '15px 17px' }}>
                                    <div className="v2-row v2-row--between" style={{ gap: 12 }}>
                                        <div className="v2-grow">
                                            <div
                                                style={{
                                                    fontSize: 14.5,
                                                    fontWeight: 620,
                                                    marginBottom: 6,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {item.title}
                                            </div>
                                            <div className="v2-row" style={{ gap: 8 }}>
                                                <Badge tone={complete ? 'live' : 'warn'}>
                                                    {complete ? 'Completed' : 'In progress'}
                                                </Badge>
                                                {item.timestamp && (
                                                    <span style={{ fontSize: 12, color: 'var(--v2-text-lo)' }}>
                                                        {shortDate(item.timestamp)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ flexShrink: 0, color: complete ? undefined : 'var(--v2-text-lo)' }}>
                                            {complete ? (
                                                <Money amount={item.reward} size="md" showPlus />
                                            ) : (
                                                <Money amount={item.reward} size="md" neutral showPlus />
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Disconnect */}
                <Button
                    variant="ghost"
                    block
                    style={{ marginTop: 30 }}
                    onClick={() => {
                        disconnect();
                        navigate('/v2/login');
                    }}
                >
                    Disconnect wallet
                </Button>

                <style>{`.v2-prof-wallet { width: 15px; height: 15px; color: var(--v2-text-lo); }`}</style>
            </Screen>
            <TabBar />
        </>
    );
}

function StatTile({
    icon,
    value,
    label,
}: {
    icon: React.ReactNode;
    value: string;
    label: string;
}) {
    return (
        <div
            style={{
                background: 'var(--v2-surface-1)',
                border: '1px solid var(--v2-hairline)',
                borderRadius: 'var(--v2-r-lg)',
                padding: '18px 16px',
            }}
        >
            <span style={{ color: 'var(--v2-lime-dim)', display: 'flex', marginBottom: 12 }}>
                {icon}
            </span>
            <div
                style={{
                    fontSize: 25,
                    fontWeight: 760,
                    letterSpacing: '-0.035em',
                    lineHeight: 1,
                    marginBottom: 5,
                    fontVariantNumeric: 'tabular-nums',
                }}
            >
                {value}
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 550, color: 'var(--v2-text-lo)' }}>
                {label}
            </div>
        </div>
    );
}
