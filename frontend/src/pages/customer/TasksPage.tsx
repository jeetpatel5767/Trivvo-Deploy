import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Check, Camera, RotateCcw, Clock, AlertCircle, ShieldCheck } from 'lucide-react';
import { getProgress, photoCheck } from '../../lib/api';
import { downscalePhoto } from '../../lib/photo';
import { AppBar, Block, Button, Money, Panel, SectionLabel, Skeleton } from '../../ui';

const taskLabel = (t: unknown, i: number) =>
  typeof t === 'string' ? t : ((t as { title?: string })?.title ?? `Task ${i + 1}`);

interface TaskProgress {
  taskIndex: number;
  /** Task name from the server; only sent to a hunter who has checked in. */
  title?: string | null;
  status: 'todo' | 'approved' | 'vendor_review' | 'retry' | 'blocked';
  attemptsUsed: number;
  attemptsLeft: number;
  reason: string | null;
  confidence: number | null;
  zgRequestId: string | null;
  model?: string | null;
  verifiable?: boolean;
}

interface NavState {
  tasks?: unknown[];
  huntTitle?: string;
  businessName?: string;
  mainReward?: string | number;
}

/** pink-soft at nothing done, full pink at everything approved. */
const SOFT = [255, 232, 244];
const FULL = [255, 133, 199];
const heroTint = (progress: number) =>
  `rgb(${SOFT.map((from, i) => Math.round(from + (FULL[i] - from) * progress)).join(', ')})`;

/**
 * Tasks — C4. Each task is a photo proof judged by 0G:
 *   approved ✓ (auto) · retake with the reason (max 5) · "vendor is reviewing".
 * Progress lives on the server (GET /hunts/:id/progress), so a refresh never loses it.
 */
export default function TasksPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: huntId } = useParams<{ id: string }>();
  const state = (location.state ?? {}) as NavState;

  const tasks: unknown[] = Array.isArray(state.tasks) ? state.tasks : [];

  const [progress, setProgress] = useState<TaskProgress[] | null>(null);
  const [maxAttempts, setMaxAttempts] = useState(5);
  const [busyTask, setBusyTask] = useState<number | null>(null);
  const [loadError, setLoadError] = useState('');
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({});

  const load = async () => {
    if (!huntId) return;
    try {
      const { data } = await getProgress(huntId);
      setMaxAttempts(data.maxAttempts ?? 5);
      // If the server knows the task count, trust it; otherwise fall back to nav state length.
      const n = data.totalTasks || tasks.length;
      const byIndex: Record<number, TaskProgress> = {};
      (data.tasks || []).forEach((t: TaskProgress) => (byIndex[t.taskIndex] = t));
      setProgress(
        Array.from({ length: n }, (_v, i) => byIndex[i] ?? {
          taskIndex: i, status: 'todo', attemptsUsed: 0, attemptsLeft: data.maxAttempts ?? 5, reason: null, confidence: null, zgRequestId: null,
        })
      );
    } catch {
      setLoadError('Could not load your progress. Check your connection and try again.');
    }
  };

  useEffect(() => {
    // Loading server progress on mount; load() manages its own state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [huntId]);

  const submitPhoto = async (taskIndex: number, file: File) => {
    if (!huntId || busyTask !== null) return;
    setBusyTask(taskIndex);
    try {
      const imageDataUrl = await downscalePhoto(file, 1024, 0.8);
      const known = progress?.find((p) => p.taskIndex === taskIndex)?.title;
      const { data } = await photoCheck(huntId, taskIndex, known || taskLabel(tasks[taskIndex], taskIndex), imageDataUrl);
      // Fold the verdict into this task's row; the server remains the source of truth.
      setProgress((prev) =>
        (prev ?? []).map((t) =>
          t.taskIndex === taskIndex
            ? {
                ...t,
                status: data.status,
                attemptsUsed: data.attempt,
                attemptsLeft: data.attemptsLeft,
                reason: data.reason,
                confidence: data.confidence,
                zgRequestId: data.zgRequestId,
                model: data.model,
                verifiable: data.verifiable,
              }
            : t
        )
      );
    } catch {
      setProgress((prev) =>
        (prev ?? []).map((t) => (t.taskIndex === taskIndex ? { ...t, reason: 'That upload did not go through. Try again.' } : t))
      );
    } finally {
      setBusyTask(null);
    }
  };

  const approvedCount = (progress ?? []).filter((t) => t.status === 'approved').length;
  const total = progress?.length ?? tasks.length;
  const allApproved = total > 0 && approvedCount === total;
  const anyReviewing = (progress ?? []).some((t) => t.status === 'vendor_review');
  const pct = total ? approvedCount / total : 0;

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        className="hero"
        style={{
          paddingTop: 0,
          paddingBottom: 64,
          background: heroTint(pct),
          transition: 'background 520ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <AppBar
          onBack={() => navigate(-1)}
          tone="pink"
          action={
            state.businessName && (
              <span
                className="pill truncate"
                style={{ maxWidth: 190, height: 44, padding: '0 18px', fontSize: 13, background: 'rgba(16,35,28,0.12)' }}
              >
                {state.businessName}
              </span>
            )
          }
        />

        <h1 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.04, letterSpacing: '-0.04em', marginTop: 10 }}>
          {allApproved ? 'All approved.' : 'Prove each task.'}
        </h1>

        <div className="row-between" style={{ marginTop: 28, marginBottom: 12 }}>
          <span className="overline">{allApproved ? 'Complete' : 'Approved'}</span>
          <span className="label tnum">{approvedCount} of {total}</span>
        </div>

        <div style={{ height: 8, borderRadius: 999, background: 'rgba(16,35,28,0.12)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${pct * 100}%`,
              borderRadius: 999,
              background: 'var(--ink)',
              transition: 'width 520ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </div>
      </div>

      <section style={{ marginTop: 24 }}>
        <SectionLabel>{allApproved ? 'Every photo passed' : 'A photo for each'}</SectionLabel>
        <Panel>
          {progress == null ? (
            <Block tight><Skeleton h={64} r={14} /></Block>
          ) : loadError ? (
            <Block tight>
              <p className="body-sm t-muted">{loadError}</p>
              <div style={{ marginTop: 12 }}>
                <Button variant="secondary" size="md" onClick={() => { setLoadError(''); void load(); }}>Try again</Button>
              </div>
            </Block>
          ) : (
            progress.map((t) => {
              const label = t.title || taskLabel(tasks[t.taskIndex], t.taskIndex);
              const busy = busyTask === t.taskIndex;
              return (
                <Block key={t.taskIndex} tight>
                  <div className="row" style={{ gap: 14, alignItems: 'flex-start' }}>
                    <StatusDot status={t.status} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="body-sm" style={{ fontWeight: 600 }}>{label}</span>

                      {/* Verdict line */}
                      {t.status === 'approved' && (
                        <p className="caption" style={{ color: 'var(--ink)', marginTop: 6 }}>
                          Approved{t.confidence != null ? ` · ${Math.round(t.confidence * 100)}% sure` : ''}
                        </p>
                      )}
                      {t.status === 'vendor_review' && (
                        <p className="caption t-muted" style={{ marginTop: 6 }}>
                          {t.reason || 'The vendor is reviewing this photo.'}
                        </p>
                      )}
                      {(t.status === 'retry' || t.status === 'blocked') && t.reason && (
                        <p className="caption" style={{ color: 'var(--error)', marginTop: 6 }}>{t.reason}</p>
                      )}
                      {t.zgRequestId && (
                        <div className="row" style={{ gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                          <span className="caption t-subtle mono" style={{ fontSize: 10 }}>0G · {t.zgRequestId.slice(0, 18)}</span>
                          {t.model && <span className="caption t-subtle" style={{ fontSize: 10 }}>{t.model}</span>}
                          {t.verifiable && (
                            <span className="row" style={{ gap: 3, fontSize: 10, fontWeight: 700, color: 'var(--ink)' }}>
                              <ShieldCheck size={11} strokeWidth={2.6} /> TEE
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action */}
                      {t.status !== 'approved' && t.status !== 'vendor_review' && (
                        <div style={{ marginTop: 10 }}>
                          {t.status === 'blocked' ? (
                            <p className="caption t-muted">No attempts left — the vendor will review this one.</p>
                          ) : (
                            <>
                              <input
                                ref={(el) => { fileInputs.current[t.taskIndex] = el; }}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) void submitPhoto(t.taskIndex, f);
                                  e.target.value = '';
                                }}
                              />
                              <Button
                                variant={t.status === 'retry' ? 'secondary' : 'ink'}
                                size="md"
                                loading={busy}
                                onClick={() => fileInputs.current[t.taskIndex]?.click()}
                              >
                                {t.status === 'retry' ? (
                                  <><RotateCcw size={15} strokeWidth={2.4} /> Retake</>
                                ) : (
                                  <><Camera size={15} strokeWidth={2.4} /> Take photo</>
                                )}
                              </Button>
                              {t.attemptsUsed > 0 && (
                                <span className="caption t-subtle" style={{ marginLeft: 10 }}>
                                  {t.attemptsLeft} of {maxAttempts} left
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Block>
              );
            })
          )}
        </Panel>
      </section>

      <section style={{ marginTop: 24 }}>
        <Panel>
          <Block>
            <span className="overline t-subtle">Final reward</span>
            <div style={{ marginTop: 10 }}>
              <Money value={state.mainReward} size="lg" signed chip />
            </div>
          </Block>
          <Block tight>
            <p className="body-sm t-muted">
              {allApproved
                ? 'Every task passed. Claim your reward.'
                : anyReviewing
                  ? 'Some photos are with the vendor. You can claim once everything is approved.'
                  : 'Each photo is checked in seconds. When all pass, the reward is released.'}
            </p>
          </Block>
        </Panel>
      </section>

      <div className="pad" style={{ marginTop: 'auto', paddingTop: 24 }}>
        <Button
          variant="ink"
          size="lg"
          block
          disabled={!allApproved}
          onClick={() => navigate('/reward-confirm', { state: { ...state, huntId } })}
        >
          {allApproved ? 'Claim reward' : 'Finish every task to claim'}
        </Button>
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: TaskProgress['status'] }) {
  const base: React.CSSProperties = {
    width: 26, height: 26, flex: 'none', display: 'flex', alignItems: 'center',
    justifyContent: 'center', borderRadius: 999, marginTop: 2,
  };
  if (status === 'approved')
    return <span style={{ ...base, background: 'var(--ink)', color: 'var(--pink)' }}><Check size={15} strokeWidth={3.2} /></span>;
  if (status === 'vendor_review')
    return <span style={{ ...base, background: 'rgba(16,35,28,0.12)', color: 'var(--ink)' }}><Clock size={14} strokeWidth={2.6} /></span>;
  if (status === 'retry' || status === 'blocked')
    return <span style={{ ...base, background: 'rgba(16,35,28,0.08)', color: 'var(--error)' }}><AlertCircle size={14} strokeWidth={2.6} /></span>;
  return <span style={{ ...base, background: 'rgba(16,35,28,0.08)', color: 'var(--ink-subtle)' }}><Camera size={13} strokeWidth={2.4} /></span>;
}
