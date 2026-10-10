import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check } from 'lucide-react';
import { DEMO_HUNTS } from '../../lib/demoData';
import { AppBar, Block, Button, Money, Panel, SectionLabel } from '../../ui';

const taskLabel = (t: unknown, i: number) =>
  typeof t === 'string' ? t : ((t as { title?: string })?.title ?? `Task ${i + 1}`);

/* placeholder: lets the screen be opened directly. */
const FALLBACK = {
  tasks: DEMO_HUNTS[0].tasks,
  huntTitle: DEMO_HUNTS[0].title,
  businessName: DEMO_HUNTS[0].business_name,
  mainReward: DEMO_HUNTS[0].main_reward,
};

/** pink-soft at nothing done, full pink at everything done. */
const SOFT = [255, 232, 244];
const FULL = [255, 133, 199];
const heroTint = (progress: number) =>
  `rgb(${SOFT.map((from, i) => Math.round(from + (FULL[i] - from) * progress)).join(', ')})`;

/** Tasks — the hero deepens toward full pink as the checklist fills. */
export default function TasksPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as any) ?? FALLBACK;

  const tasks: unknown[] = state?.tasks?.length ? state.tasks : (FALLBACK.tasks as unknown[]);
  const [completed, setCompleted] = useState<boolean[]>(tasks.map(() => false));

  const toggle = (i: number) => setCompleted((p) => p.map((v, idx) => (idx === i ? !v : v)));
  const done = completed.filter(Boolean).length;
  const allDone = done === tasks.length;
  const progress = tasks.length ? done / tasks.length : 0;

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        className="hero"
        style={{
          paddingTop: 0,
          paddingBottom: 64,
          background: heroTint(progress),
          transition: 'background 520ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Venue sits in the corner rather than above the title: it fills the space
            opposite the back button, and matches where /scan puts the same fact. */}
        <AppBar
          onBack={() => navigate(-1)}
          tone="pink"
          action={
            state?.businessName && (
              <span
                className="pill truncate"
                style={{
                  maxWidth: 190,
                  height: 44,
                  padding: '0 18px',
                  fontSize: 13,
                  background: 'rgba(16,35,28,0.12)',
                }}
              >
                {state.businessName}
              </span>
            )
          }
        />

        <h1 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.04, letterSpacing: '-0.04em', marginTop: 10 }}>
          {allDone ? 'All done.' : 'Your tasks.'}
        </h1>

        <div className="row-between" style={{ marginTop: 28, marginBottom: 12 }}>
          <span className="overline">{allDone ? 'Complete' : 'Progress'}</span>
          <span className="label tnum">
            {done} of {tasks.length}
          </span>
        </div>

        {/* Track darkens with the fill so the bar stays legible on a deepening ground */}
        <div
          style={{
            height: 8,
            borderRadius: 999,
            background: 'rgba(16,35,28,0.12)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress * 100}%`,
              borderRadius: 999,
              background: 'var(--ink)',
              transition: 'width 520ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </div>
      </div>

      <section style={{ marginTop: 24 }}>
        <SectionLabel>{allDone ? 'Everything ticked' : 'Tick as you go'}</SectionLabel>
        <Panel>
          {tasks.map((task, i) => {
            const isDone = completed[i];
            return (
              <Block key={i} tight style={{ padding: 0 }}>
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    width: '100%',
                    padding: '17px 20px',
                    textAlign: 'left',
                    background: isDone ? 'var(--pink-soft)' : 'transparent',
                    transition: 'background 240ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      flex: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 999,
                      background: isDone ? 'var(--ink)' : 'rgba(16,35,28,0.08)',
                      color: 'var(--pink)',
                      transform: isDone ? 'scale(1)' : 'scale(0.94)',
                      transition: 'background 200ms, transform 200ms cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                  >
                    {isDone && <Check size={15} strokeWidth={3.2} />}
                  </span>
                  <span
                    className="body-sm"
                    style={{
                      textDecoration: isDone ? 'line-through' : 'none',
                      opacity: isDone ? 0.55 : 1,
                      transition: 'opacity 200ms',
                    }}
                  >
                    {taskLabel(task, i)}
                  </span>
                </button>
              </Block>
            );
          })}
        </Panel>
      </section>

      <section style={{ marginTop: 24 }}>
        <Panel>
          <Block>
            <span className="overline t-subtle">Final reward</span>
            <div style={{ marginTop: 10 }}>
              <Money value={state?.mainReward} size="lg" signed chip />
            </div>
          </Block>
          <Block tight>
            <p className="body-sm t-muted">
              {allDone
                ? 'Show this screen to the vendor to get verified and paid.'
                : 'Once every task is ticked, show this screen to the vendor.'}
            </p>
          </Block>
        </Panel>
      </section>

      <div className="pad" style={{ marginTop: 'auto', paddingTop: 24 }}>
        <Button variant="ink" size="lg" block onClick={() => navigate('/reward-confirm', { state })}>
          Get verified
        </Button>
        {!allDone && (
          <p className="caption t-subtle" style={{ textAlign: 'center', marginTop: 10 }}>
            {tasks.length - done} still to tick
          </p>
        )}
      </div>
    </div>
  );
}
