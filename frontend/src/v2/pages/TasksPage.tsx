import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Screen, TopBar, Card, Money, Progress, Label, Badge } from '../components/UI';
import { TabBar } from '../components/TabBar';
import type { ScanState } from '../lib/types';
import { Check, Trophy, Store } from '../components/Icons';

/**
 * v2 task checklist.
 *
 * As in v1, ticking a task is a local progress aid only — the vendor is the
 * one who verifies completion on their own device, which is what actually
 * releases the main reward on-chain.
 */
export default function V2Tasks() {
    const navigate = useNavigate();
    const location = useLocation();
    const state = (location.state ?? null) as ScanState | null;

    const tasks: string[] = state?.tasks?.length
        ? state.tasks
        : ['Complete the assigned task', 'Get verified by the vendor'];

    const [done, setDone] = useState<boolean[]>(() => tasks.map(() => false));

    const toggle = (i: number) =>
        setDone((prev) => prev.map((v, idx) => (idx === i ? !v : v)));

    const doneCount = done.filter(Boolean).length;
    const allDone = doneCount === tasks.length;
    const pct = (doneCount / tasks.length) * 100;

    return (
        <>
            <Screen>
                <TopBar
                    eyebrow={state?.huntTitle}
                    title="Your tasks"
                    onBack={() => navigate('/v2/hunts')}
                />

                {/* Progress */}
                <Card variant="flat" style={{ marginBottom: 24 }}>
                    <div className="v2-row v2-row--between" style={{ marginBottom: 13 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--v2-text-mid)' }}>
                            Progress
                        </span>
                        <span
                            style={{
                                fontSize: 13.5,
                                fontWeight: 700,
                                color: allDone ? 'var(--v2-lime)' : 'var(--v2-text-hi)',
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            {doneCount} / {tasks.length}
                        </span>
                    </div>
                    <Progress value={pct} />
                </Card>

                {/* Checklist */}
                <Label>Checklist</Label>
                <div className="v2-stack v2-stack--8" style={{ marginBottom: 26 }}>
                    {tasks.map((task, i) => {
                        const on = done[i];
                        return (
                            <button
                                key={i}
                                onClick={() => toggle(i)}
                                className="v2-row"
                                style={{
                                    gap: 14,
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '15px 16px',
                                    background: on ? 'var(--v2-lime-soft)' : 'var(--v2-surface-1)',
                                    border: `1px solid ${on ? 'rgba(204,255,77,.26)' : 'var(--v2-hairline)'}`,
                                    borderRadius: 'var(--v2-r-md)',
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                    transition: 'background .25s, border-color .25s',
                                }}
                            >
                                <span
                                    style={{
                                        width: 25,
                                        height: 25,
                                        flexShrink: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: on ? 'var(--v2-lime)' : 'transparent',
                                        border: on ? 'none' : '1.8px solid var(--v2-hairline-strong)',
                                        borderRadius: 999,
                                        color: '#0C0B0E',
                                        transition: 'all .2s var(--v2-spring)',
                                    }}
                                >
                                    {on && <Check className="v2-task-check" />}
                                </span>
                                <span
                                    style={{
                                        flex: 1,
                                        fontSize: 14.5,
                                        fontWeight: 550,
                                        lineHeight: 1.42,
                                        color: on ? 'var(--v2-text-mid)' : 'var(--v2-text-hi)',
                                        textDecoration: on ? 'line-through' : 'none',
                                    }}
                                >
                                    {task}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Payout pending vendor verification */}
                <Card>
                    <div className="v2-row v2-row--between" style={{ marginBottom: 15 }}>
                        <div className="v2-row" style={{ gap: 10 }}>
                            <span style={{ color: 'var(--v2-lime-dim)', display: 'flex' }}>
                                <Trophy className="v2-ic-md" />
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 650, letterSpacing: '0.02em' }}>
                                Final reward
                            </span>
                        </div>
                        <Money amount={state?.mainReward ?? 5} size="md" />
                    </div>

                    <div
                        className="v2-row"
                        style={{
                            gap: 12,
                            padding: '14px 15px',
                            background: 'var(--v2-surface-2)',
                            borderRadius: 'var(--v2-r-sm)',
                        }}
                    >
                        <span style={{ color: 'var(--v2-text-lo)', display: 'flex', flexShrink: 0 }}>
                            <Store className="v2-ic-md" />
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--v2-text-mid)', lineHeight: 1.5 }}>
                            {allDone
                                ? 'All done. Show this screen to the vendor to get verified and paid.'
                                : 'Once every task is ticked, show this screen to the vendor. They verify, and the reward lands in your wallet.'}
                        </span>
                    </div>

                    {allDone && (
                        <div style={{ marginTop: 15, textAlign: 'center' }}>
                            <Badge tone="live" dot>Ready for verification</Badge>
                        </div>
                    )}
                </Card>

                <style>{`.v2-task-check { width: 15px; height: 15px; }`}</style>
            </Screen>
            <TabBar />
        </>
    );
}
