import { useNavigate, useLocation } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { DEMO_HUNTS } from '../../lib/demoData';
import { RewardMoment } from '../../components/RewardMoment';
import { Block, Button, Panel } from '../../ui';

const taskLabel = (t: unknown, i: number) =>
  typeof t === 'string' ? t : ((t as { title?: string })?.title ?? `Task ${i + 1}`);

/* placeholder: lets the screen be opened directly, with no scan before it. */
const FALLBACK = {
  arrivalReward: DEMO_HUNTS[0].arrival_reward,
  mainReward: DEMO_HUNTS[0].main_reward,
  businessName: DEMO_HUNTS[0].business_name,
  huntTitle: DEMO_HUNTS[0].title,
  huntId: DEMO_HUNTS[0].hunt_id,
  tasks: DEMO_HUNTS[0].tasks,
  explorerUrl: 'https://snowtrace.io/tx/0xdemo',
};

/** Arrival reward — the payout moment, then what it unlocked. */
export default function ArrivalRewardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as any) ?? FALLBACK;

  const amount = Number(state.arrivalReward) || 0;
  const tasks: unknown[] = Array.isArray(state.tasks) ? state.tasks : [];

  return (
    <div className="screen" style={{ paddingBottom: 32, display: 'flex', flexDirection: 'column' }}>
      <div className="hero hero--pink" style={{ paddingTop: 76, paddingBottom: 92 }}>
        <RewardMoment
          overline="Checked in"
          amount={amount}
          subline={state.businessName ? `Sent to your wallet by ${state.businessName}` : null}
        >
          {state.explorerUrl && (
            <a
              className="pill"
              href={state.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginTop: 16, background: 'rgba(16,35,28,0.12)', height: 34, padding: '0 14px' }}
            >
              View receipt
              <ExternalLink size={13} strokeWidth={2.6} />
            </a>
          )}
        </RewardMoment>
      </div>

      {/* White card lifted over the hero's rounded foot */}
      {tasks.length > 0 && (
        <Panel style={{ marginTop: -18, position: 'relative' }}>
          <Block tight>
            <span className="overline t-subtle">Now unlocked</span>
          </Block>
          {tasks.map((t, i) => (
            <Block key={i} tight>
              <div className="row" style={{ gap: 12 }}>
                <span className="caption t-subtle tnum" style={{ width: 14, flex: 'none' }}>
                  {i + 1}
                </span>
                <span className="body-sm">{taskLabel(t, i)}</span>
              </div>
            </Block>
          ))}
        </Panel>
      )}

      {/* Pinned to the foot of the screen, whatever the task count */}
      <div className="pad" style={{ marginTop: 'auto', paddingTop: 24 }}>
        <Button variant="ink" size="lg" block onClick={() => navigate(`/tasks/${state.huntId}`, { state })}>
          Start tasks
        </Button>
      </div>
    </div>
  );
}
