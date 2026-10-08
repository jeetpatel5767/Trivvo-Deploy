import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Screen, Button, Card, Money, Label, Empty } from '../components/UI';
import type { ScanState } from '../lib/types';
import {
    Check, ExternalLink, Unlock, ArrowRight, Compass, Trophy,
} from '../components/Icons';

/**
 * v2 arrival reward — the moment the product pays out. Treated as the
 * emotional peak of the flow: the amount is the largest element on screen,
 * and the unlocked tasks reveal underneath it.
 */
export default function V2ArrivalReward() {
    const navigate = useNavigate();
    const location = useLocation();
    const state = (location.state ?? null) as ScanState | null;

    const [revealed, setRevealed] = useState(false);
    const [tasksIn, setTasksIn] = useState(false);

    useEffect(() => {
        const t1 = setTimeout(() => setRevealed(true), 180);
        const t2 = setTimeout(() => setTasksIn(true), 620);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    if (!state) {
        return (
            <Screen centered>
                <Empty
                    icon={<Compass />}
                    title="No reward to show"
                    body="This screen appears right after a successful check-in."
                    action={<Button onClick={() => navigate('/v2/hunts')}>Back to explore</Button>}
                />
            </Screen>
        );
    }

    const tasks: string[] = Array.isArray(state.tasks) ? state.tasks : [];

    return (
        <Screen style={{ paddingBottom: 44 }}>
            {/* Payout */}
            <div
                style={{
                    textAlign: 'center',
                    paddingTop: 34,
                    opacity: revealed ? 1 : 0,
                    transform: revealed ? 'none' : 'scale(.9)',
                    transition: 'opacity .5s var(--v2-ease), transform .65s var(--v2-spring)',
                }}
            >
                {/* Confirmation mark */}
                <div
                    style={{
                        width: 62,
                        height: 62,
                        margin: '0 auto 26px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--v2-lime)',
                        borderRadius: 999,
                        color: '#0C0B0E',
                        boxShadow: '0 0 0 1px rgba(204,255,77,.4), 0 14px 44px rgba(204,255,77,.3)',
                    }}
                >
                    <Check className="v2-reward-check" />
                </div>

                <div
                    style={{
                        fontSize: 11,
                        fontWeight: 650,
                        letterSpacing: '0.11em',
                        textTransform: 'uppercase',
                        color: 'var(--v2-text-lo)',
                        marginBottom: 14,
                    }}
                >
                    Checked in
                </div>

                <div style={{ marginBottom: 12 }}>
                    <Money amount={state.arrivalReward} size="hero" showPlus />
                </div>

                <p
                    style={{
                        fontSize: 15,
                        fontWeight: 500,
                        color: 'var(--v2-text-mid)',
                        margin: '0 0 26px',
                        lineHeight: 1.5,
                    }}
                >
                    Sent to your wallet
                    {state.businessName && (
                        <>
                            {' '}by{' '}
                            <strong style={{ color: 'var(--v2-text-hi)', fontWeight: 650 }}>
                                {state.businessName}
                            </strong>
                        </>
                    )}
                </p>

                {state.explorerUrl && (
                    <a
                        href={state.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="v2-btn v2-btn--ghost v2-btn--sm"
                        style={{ marginBottom: 6 }}
                    >
                        <ExternalLink />
                        View transaction
                    </a>
                )}
            </div>

            {/* Unlocked tasks */}
            {tasks.length > 0 && (
                <div
                    style={{
                        marginTop: 40,
                        opacity: tasksIn ? 1 : 0,
                        transform: tasksIn ? 'none' : 'translateY(16px)',
                        transition: 'all .6s var(--v2-ease)',
                    }}
                >
                    <div className="v2-row" style={{ gap: 9, marginBottom: 14 }}>
                        <span style={{ color: 'var(--v2-lime)', display: 'flex' }}>
                            <Unlock className="v2-ic-md" />
                        </span>
                        <Label>{tasks.length} tasks unlocked</Label>
                    </div>

                    <Card>
                        <div className="v2-stack v2-stack--8">
                            {tasks.map((task, i) => (
                                <div
                                    key={i}
                                    className="v2-row"
                                    style={{
                                        gap: 13,
                                        padding: '13px 14px',
                                        background: 'var(--v2-surface-2)',
                                        borderRadius: 'var(--v2-r-sm)',
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 23,
                                            height: 23,
                                            flexShrink: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: 'var(--v2-surface-3)',
                                            borderRadius: 999,
                                            fontSize: 11.5,
                                            fontWeight: 700,
                                            color: 'var(--v2-text-mid)',
                                            fontVariantNumeric: 'tabular-nums',
                                        }}
                                    >
                                        {i + 1}
                                    </span>
                                    <span style={{ fontSize: 14, fontWeight: 550, lineHeight: 1.4 }}>
                                        {task}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {state.mainReward != null && (
                            <div
                                className="v2-row v2-row--between"
                                style={{
                                    marginTop: 18,
                                    paddingTop: 16,
                                    borderTop: '1px solid var(--v2-hairline)',
                                }}
                            >
                                <div className="v2-row" style={{ gap: 9 }}>
                                    <span style={{ color: 'var(--v2-lime-dim)', display: 'flex' }}>
                                        <Trophy className="v2-ic-md" />
                                    </span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--v2-text-mid)' }}>
                                        Finish all to earn
                                    </span>
                                </div>
                                <Money amount={state.mainReward} size="md" />
                            </div>
                        )}
                    </Card>

                    <Button
                        size="lg"
                        block
                        style={{ marginTop: 18 }}
                        onClick={() => navigate(`/v2/tasks/${state.huntId}`, { state })}
                    >
                        Start tasks
                        <ArrowRight />
                    </Button>
                </div>
            )}

            {tasks.length === 0 && (
                <Button
                    size="lg"
                    block
                    style={{ marginTop: 40 }}
                    onClick={() => navigate('/v2/hunts')}
                >
                    Back to explore
                </Button>
            )}

            <style>{`.v2-reward-check { width: 29px; height: 29px; }`}</style>
        </Screen>
    );
}
