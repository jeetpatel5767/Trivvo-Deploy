import { Check } from 'lucide-react';
import { Panel, Block } from '../ui';

/**
 * T18 — "What's next" status line for the hunter.
 * Shows the four steps in order and marks the current one. Uses existing ui classes only.
 */
export type StatusStep = 'arrived' | 'verified' | 'photo' | 'paid';

const STEPS: { key: StatusStep; label: string }[] = [
  { key: 'arrived', label: 'Arrived' },
  { key: 'verified', label: 'Human verified' },
  { key: 'photo', label: 'Photo passed' },
  { key: 'paid', label: 'Paid' },
];

export function StatusLine({
  current,
  nextHint,
}: {
  current: StatusStep;
  nextHint?: string;
}) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <Panel>
      <Block>
        <span className="overline t-subtle">What's next</span>
        <ol style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {STEPS.map((step, i) => {
            const isDone = i < currentIndex;
            const isNow = i === currentIndex;
            return (
              <li key={step.key} className="row" style={{ gap: 12 }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    flex: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 999,
                    background: isDone || isNow ? 'var(--ink)' : 'rgba(16,35,28,0.08)',
                    color: 'var(--pink)',
                  }}
                >
                  {isDone && <Check size={13} strokeWidth={3.2} />}
                </span>
                <span className={isNow ? 'body-sm' : 'body-sm t-muted'} style={{ fontWeight: isNow ? 700 : 400 }}>
                  {step.label}
                </span>
                {isNow && <span className="pill pill--pink" style={{ marginLeft: 'auto' }}>now</span>}
              </li>
            );
          })}
        </ol>
      </Block>
      {nextHint && (
        <Block tight>
          <p className="body-sm t-muted">{nextHint}</p>
        </Block>
      )}
    </Panel>
  );
}
