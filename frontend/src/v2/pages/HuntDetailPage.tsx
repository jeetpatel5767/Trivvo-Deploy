import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getHunt } from '../../lib/api';
import {
    Screen, TopBar, Button, Card, Money, StatusBadge, Meta, Label, Skeleton, Empty,
} from '../components/UI';
import { TabBar } from '../components/TabBar';
import {
    MapPin, Clock, Lock, Scan, Compass, AlertCircle, User, Zap, Trophy,
} from '../components/Icons';
import { findDemoHunt } from '../lib/demoHunts';
import type { Hunt } from '../lib/types';
import { timeRemaining, timeUntil, totalReward } from '../lib/format';

export default function V2HuntDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [hunt, setHunt] = useState<Hunt | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function fetchHunt() {
            try {
                const res = await getHunt(id!);
                if (!cancelled) setHunt(res.data.hunt);
            } catch {
                if (!cancelled) setHunt(findDemoHunt(id));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchHunt();
        return () => { cancelled = true; };
    }, [id]);

    if (loading) {
        return (
            <Screen>
                <TopBar onBack={() => navigate(-1)} />
                <div className="v2-stack v2-stack--16">
                    <Skeleton height={210} />
                    <Skeleton height={120} />
                    <Skeleton height={88} />
                </div>
            </Screen>
        );
    }

    if (!hunt) {
        return (
            <Screen>
                <TopBar onBack={() => navigate('/v2/hunts')} />
                <Empty
                    icon={<Compass />}
                    title="Hunt not found"
                    body="This hunt may have ended or been removed."
                    action={
                        <Button onClick={() => navigate('/v2/hunts')}>Back to explore</Button>
                    }
                />
            </Screen>
        );
    }

    const status = (hunt.status || '').toLowerCase();
    const isActive = status === 'active';
    const clock = status === 'upcoming'
        ? timeUntil(hunt.start_time)
        : timeRemaining(hunt.end_time);
    const tasks: string[] = Array.isArray(hunt.tasks) ? hunt.tasks : [];
    const participants = Number(hunt.active_participants) || 0;

    return (
        <>
            <Screen>
                <TopBar eyebrow={hunt.business_name} title="Hunt details" onBack={() => navigate(-1)} />

                {/* Hero: title, status, and the payout split */}
                <Card style={{ marginBottom: 20 }}>
                    <div className="v2-row v2-row--between" style={{ marginBottom: 15 }}>
                        <StatusBadge status={hunt.status} />
                        {clock && <Meta icon={<Clock />}>{clock}</Meta>}
                    </div>

                    <h2
                        style={{
                            fontSize: 27,
                            fontWeight: 760,
                            letterSpacing: '-0.035em',
                            lineHeight: 1.14,
                            margin: '0 0 20px',
                        }}
                    >
                        {hunt.title}
                    </h2>

                    {/* Total payout, then how it breaks down */}
                    <div
                        style={{
                            background: 'var(--v2-lime-soft)',
                            border: '1px solid rgba(204,255,77,.2)',
                            borderRadius: 'var(--v2-r-md)',
                            padding: '18px 18px 16px',
                        }}
                    >
                        <div
                            style={{
                                fontSize: 10.5,
                                fontWeight: 650,
                                letterSpacing: '0.09em',
                                textTransform: 'uppercase',
                                color: 'var(--v2-lime-dim)',
                                marginBottom: 7,
                            }}
                        >
                            Total payout
                        </div>
                        <Money amount={totalReward(hunt)} size="lg" />

                        <div
                            className="v2-row"
                            style={{
                                gap: 0,
                                marginTop: 16,
                                paddingTop: 14,
                                borderTop: '1px solid rgba(204,255,77,.16)',
                            }}
                        >
                            <div className="v2-grow">
                                <div className="v2-row" style={{ gap: 6, marginBottom: 4 }}>
                                    <Zap className="v2-mini" />
                                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--v2-text-mid)' }}>
                                        On arrival
                                    </span>
                                </div>
                                <Money amount={hunt.arrival_reward} size="sm" neutral />
                            </div>
                            <div className="v2-grow">
                                <div className="v2-row" style={{ gap: 6, marginBottom: 4 }}>
                                    <Trophy className="v2-mini" />
                                    <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--v2-text-mid)' }}>
                                        On completion
                                    </span>
                                </div>
                                <Money amount={hunt.main_reward} size="sm" neutral />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Description */}
                {hunt.description && (
                    <div style={{ marginBottom: 24 }}>
                        <Label>About this hunt</Label>
                        <p
                            style={{
                                fontSize: 14.5,
                                lineHeight: 1.62,
                                color: 'var(--v2-text-mid)',
                                margin: 0,
                            }}
                        >
                            {hunt.description}
                        </p>
                    </div>
                )}

                {/* Where + who */}
                <div style={{ marginBottom: 24 }}>
                    <Label>Location</Label>
                    <Card variant="flat">
                        <div className="v2-row v2-row--between">
                            <Meta icon={<MapPin />} truncate>
                                {hunt.location_name || 'Location shared on arrival'}
                            </Meta>
                            {participants > 0 && (
                                <Meta icon={<User />}>{participants} joined</Meta>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Locked tasks — tell them what's behind the QR without revealing it */}
                <div style={{ marginBottom: 28 }}>
                    <Label>
                        {tasks.length > 0 ? `${tasks.length} tasks · locked` : 'Tasks · locked'}
                    </Label>
                    <Card variant="flat">
                        <div className="v2-row" style={{ gap: 14 }}>
                            <span
                                style={{
                                    width: 42,
                                    height: 42,
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'var(--v2-surface-3)',
                                    borderRadius: 999,
                                    color: 'var(--v2-text-lo)',
                                }}
                            >
                                <Lock className="v2-ic-lg" />
                            </span>
                            <div className="v2-grow">
                                <div style={{ fontSize: 14.5, fontWeight: 620, marginBottom: 3 }}>
                                    Scan at the venue to unlock
                                </div>
                                <div style={{ fontSize: 12.5, color: 'var(--v2-text-lo)', lineHeight: 1.45 }}>
                                    Your arrival reward pays out the moment you scan.
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Actions */}
                {isActive ? (
                    <div className="v2-stack v2-stack--12">
                        <Button size="lg" block onClick={() => navigate('/v2/scan', { state: { hunt } })}>
                            <Scan />
                            Scan QR to start
                        </Button>
                        <Button
                            variant="secondary"
                            size="lg"
                            block
                            onClick={() => navigate(`/v2/map/${hunt.hunt_id}`)}
                        >
                            <MapPin />
                            Get directions
                        </Button>
                    </div>
                ) : (
                    <Card
                        variant="flat"
                        style={{
                            borderColor: status === 'upcoming'
                                ? 'rgba(255,179,64,.26)'
                                : 'rgba(255,107,90,.26)',
                        }}
                    >
                        <div className="v2-row" style={{ gap: 12 }}>
                            <span
                                style={{
                                    color: status === 'upcoming' ? 'var(--v2-amber)' : 'var(--v2-coral)',
                                    display: 'flex',
                                }}
                            >
                                <AlertCircle className="v2-ic-lg" />
                            </span>
                            <div>
                                <div style={{ fontSize: 14.5, fontWeight: 620, marginBottom: 2 }}>
                                    {status === 'upcoming' ? 'Not open yet' : 'This hunt has ended'}
                                </div>
                                <div style={{ fontSize: 12.5, color: 'var(--v2-text-lo)' }}>
                                    {status === 'upcoming'
                                        ? clock || 'Check back soon.'
                                        : 'Rewards are no longer claimable.'}
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                <style>{`.v2-mini { width: 13px; height: 13px; color: var(--v2-lime-dim); }`}</style>
            </Screen>
            <TabBar />
        </>
    );
}
