import { Icon } from '../../components/Icon';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck, ExternalLink } from 'lucide-react';
import { getHunt, getVendorTrust } from '../../lib/api';
import { totalReward, type Hunt } from '../../lib/types';
import {
  AppBar,
  Block,
  Button,
  CardSkeleton,
  IconStrip,
  Money,
  Panel,
  StatusBadge,
  Tiles,
  hasEnded,
  timeLeft,
} from '../../ui';
import { startsIn, useNow } from '../../lib/time';

/** Hunt detail — pink hero owns the payout, flush panels carry the rest. */
export default function HuntDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [verifiedPayouts, setVerifiedPayouts] = useState(0);
  useNow(30_000); // Upcoming -> Live happens on the clock, so re-render without a manual reload

  useEffect(() => {
    getHunt(id!)
      .then((res) => {
        const h = res.data.hunt as Hunt;
        setHunt(h);
        // F4: "N payouts verified on Hedera" for this hunt's vendor.
        if (h.vendor_wallet) {
          getVendorTrust(h.vendor_wallet)
            .then((r) => setVerifiedPayouts(Number(r.data.verifiedPayouts) || 0))
            .catch(() => {});
        }
      })
      // 404 = no such hunt; anything else = we could not reach the server
      .catch((err) => setFailed(err?.response?.status !== 404))
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
          <h1 className="title-l">{failed ? 'That hunt did not load. Check your connection.' : 'We could not find that hunt.'}</h1>
          <div style={{ marginTop: 24 }}>
            <Button variant="primary" size="lg" block onClick={() => navigate('/hunts')}>
              Back to hunts
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const remaining = startsIn(hunt.start_time) ?? timeLeft(hunt.end_time);
  const ended = hasEnded(hunt.end_time);
  const taskCount = hunt.task_count ?? 0;

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

      {/* F4 trust count + F3 public receipt link */}
      <div className="pad" style={{ marginTop: 24 }}>
        <div className="row-between">
          <span className="row" style={{ gap: 8 }}>
            <ShieldCheck size={16} strokeWidth={2.4} style={{ color: 'var(--ink-subtle)' }} />
            <span className="body-sm t-muted">
              {verifiedPayouts > 0 ? `${verifiedPayouts} payouts verified on Hedera` : 'Payouts logged on Hedera'}
            </span>
          </span>
          <button
            type="button"
            className="row"
            style={{ gap: 5, background: 'none', padding: 0 }}
            onClick={() => navigate(`/receipt/${hunt.hunt_id}`)}
          >
            <span className="label">Receipt</span>
            <ExternalLink size={13} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {hunt.description && (
        <div className="pad" style={{ marginTop: 28 }}>
          <p className="body t-muted">{hunt.description}</p>
        </div>
      )}

      {/* Tasks stay a surprise: only how many there are, never what they are, until you check in. */}
      {taskCount > 0 && (
        <div className="pad" style={{ marginTop: 28 }}>
          <div className="row" style={{ gap: 10 }}>
            <Lock size={15} strokeWidth={2.4} style={{ flex: 'none', color: 'var(--ink-subtle)' }} />
            <span className="body-sm t-muted">
              {taskCount} {taskCount === 1 ? 'task' : 'tasks'} · revealed after you check in at the venue
            </span>
          </div>
        </div>
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
