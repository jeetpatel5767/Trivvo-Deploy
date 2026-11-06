import { Icon } from '../../components/Icon';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { getHunt } from '../../lib/api';
import { findDemoHunt, DEMO_HUNTS } from '../../lib/demoData';
import { totalReward, type Hunt } from '../../lib/types';
import {
  AppBar,
  Block,
  Button,
  CardSkeleton,
  IconStrip,
  Money,
  Panel,
  SectionLabel,
  StatusBadge,
  Tiles,
  hasEnded,
  timeLeft,
} from '../../ui';

const taskLabel = (t: unknown, i: number) =>
  typeof t === 'string' ? t : ((t as { title?: string })?.title ?? `Task ${i + 1}`);

/** Hunt detail — pink hero owns the payout, flush panels carry the rest. */
export default function HuntDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHunt(id!)
      .then((res) => setHunt(res.data.hunt))
      .catch(() => setHunt(findDemoHunt(id) || DEMO_HUNTS[0]))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="screen">
        <AppBar onBack={() => navigate(-1)} />
        <div className="stack pad">
          <CardSkeleton h={260} />
          <CardSkeleton h={120} />
        </div>
      </div>
    );
  }

  if (!hunt) {
    return (
      <div className="screen">
        <AppBar onBack={() => navigate('/hunts')} />
        <div className="pad">
          <h1 className="title-l">We could not find that hunt.</h1>
          <div style={{ marginTop: 24 }}>
            <Button variant="primary" size="lg" block onClick={() => navigate('/hunts')}>
              Back to hunts
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const remaining = timeLeft(hunt.end_time);
  const ended = hasEnded(hunt.end_time);
  const tasks = Array.isArray(hunt.tasks) ? hunt.tasks : [];

  return (
    <div className="screen">
      {/* Pink hero: status, title, the number */}
      <div className="hero hero--pink hero--tall" style={{ paddingTop: 0 }}>
        <AppBar tone="pink" onBack={() => navigate(-1)} />

        <div className="row-between" style={{ marginTop: 8 }}>
          <StatusBadge startsAt={hunt.start_time} endsAt={hunt.end_time} />
          {remaining && <span className="body-sm" style={{ fontWeight: 600 }}>{remaining}</span>}
        </div>

        <h1 style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.045em', marginTop: 20 }}>
          {hunt.title}
        </h1>

        {hunt.business_name && (
          <p className="body-sm" style={{ marginTop: 10, opacity: 0.75 }}>
            {hunt.business_name}
          </p>
        )}

        <div style={{ marginTop: 32 }}>
          <span className="overline">Earn up to</span>
          <div style={{ marginTop: 10 }}>
            <Money value={totalReward(hunt)} size="hero" chip />
          </div>
        </div>
      </div>

      {/* Reward split — hairline grid, no boxes */}
      <Panel tone="paper" style={{ marginTop: -16, position: 'relative' }}>
        <Tiles
          items={[
            { label: 'On arrival', value: Number(hunt.arrival_reward) },
            { label: 'On completion', value: Number(hunt.main_reward) },
          ]}
        />
        <Block>
          <IconStrip
            items={[
              { icon: <Icon name="scan" set="objects" size={22} />, label: 'Scan to start', onClick: () => navigate('/scan', { state: { hunt } }) },
              { icon: <Icon name="signpost" set="objects" size={22} />, label: 'Directions', onClick: () => navigate(`/map/${hunt.hunt_id}`) },
              { icon: <Icon name="pin" set="objects" size={22} />, label: hunt.location_name || 'Venue' },
            ]}
          />
        </Block>
      </Panel>

      {hunt.description && (
        <div className="pad" style={{ marginTop: 28 }}>
          <p className="body t-muted">{hunt.description}</p>
        </div>
      )}

      {tasks.length > 0 && (
        <section style={{ marginTop: 32 }}>
          <SectionLabel>
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} · locked
          </SectionLabel>
          <Panel>
            {tasks.map((t, i) => (
              <Block key={i} tight>
                <div className="row" style={{ opacity: 0.5 }}>
                  <Lock size={15} strokeWidth={2.4} style={{ flex: 'none', color: 'var(--ink-subtle)' }} />
                  <span className="body-sm">{taskLabel(t, i)}</span>
                </div>
              </Block>
            ))}
            <Block tight>
              <p className="caption t-subtle">Scan at the venue to unlock</p>
            </Block>
          </Panel>
        </section>
      )}

      <div className="pad stack-12" style={{ marginTop: 36 }}>
        {ended ? (
          <p className="body-sm t-muted" style={{ textAlign: 'center' }}>
            This hunt has ended. Rewards are no longer claimable.
          </p>
        ) : (
          <Button variant="ink" size="lg" block onClick={() => navigate('/scan', { state: { hunt } })}>
            Scan QR to start
          </Button>
        )}
        <Button variant="secondary" size="lg" block onClick={() => navigate(`/map/${hunt.hunt_id}`)}>
          Get directions
        </Button>
      </div>
    </div>
  );
}
