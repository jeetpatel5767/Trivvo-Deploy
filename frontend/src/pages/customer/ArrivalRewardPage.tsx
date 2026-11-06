import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ExternalLink, MapPin, Check } from 'lucide-react';
import { scanQR } from '../../lib/api';
import { checkLocation, type LocationResult } from '../../lib/location';
import { useDemoAccount } from '../../lib/demoAccount';
import { totalReward, type Hunt } from '../../lib/types';
import { hasEnded } from '../../ui';
import { AppBar, Block, Button, Money, Panel } from '../../ui';
import { RewardMoment } from '../../components/RewardMoment';
import { WorldCheck } from '../../components/WorldCheck';

const taskLabel = (t: unknown, i: number) =>
  typeof t === 'string' ? t : ((t as { title?: string })?.title ?? `Task ${i + 1}`);

/**
 * C2 — the arrival flow, in the right order (fixes PLAN #3).
 *
 *   1. hunt info        — what you're checking into and the arrival payout
 *   2. location check   — soft guard: are you near the venue? (never blocks)
 *   3. World verify     — prove you're a unique human (stores the nullifier)
 *   4. claim arrival    — backend sees the nullifier, pays claimArrivalReward on chain
 *   5. reward moment     — real tx + explorer link, then "Start tasks"
 *
 * The backend enforces the order: /scan returns human_check_required until the World
 * nullifier exists, and 409 duplicate_human / already_scanned for repeat humans — each
 * mapped here to an honest denied/expired/already state. No fake "checked in" moment.
 */

type Phase = 'location' | 'verify' | 'claiming' | 'reward' | 'denied' | 'expired' | 'already' | 'error';

interface ArrivalResult {
  arrivalReward: number;
  mainReward?: number;
  txHash?: string;
  explorerUrl?: string;
  tasks: unknown[];
  huntTitle?: string;
  businessName?: string;
}

export default function ArrivalRewardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as { hunt?: Hunt; qrSecret?: string };
  const hunt = state.hunt;
  const qrSecret = state.qrSecret;
  const { address } = useDemoAccount();

  const [phase, setPhase] = useState<Phase>(() => (hunt && hasEnded(hunt.end_time) ? 'expired' : 'location'));
  const [loc, setLoc] = useState<LocationResult | null>(null);
  const [locChecking, setLocChecking] = useState(false);
  const [result, setResult] = useState<ArrivalResult | null>(null);
  const [message, setMessage] = useState('');
  const claimedRef = useRef(false);

  // No hunt in state (opened directly) — send them to browse rather than fake one.
  useEffect(() => {
    if (!hunt || !qrSecret) {
      navigate('/hunts', { replace: true });
    }
  }, [hunt, qrSecret, navigate]);

  if (!hunt || !qrSecret) return null;

  const arrival = Number(hunt.arrival_reward) || 0;
  const tasks = Array.isArray(hunt.tasks) ? hunt.tasks : [];

  const runLocationCheck = async () => {
    setLocChecking(true);
    const r = await checkLocation(Number(hunt.location_lat), Number(hunt.location_lng), Number(hunt.radius_m) || 150);
    setLoc(r);
    setLocChecking(false);
    setPhase('verify');
  };

  // Step 4: once World verify stored the nullifier, ask the backend to pay the arrival reward.
  const claimArrival = async () => {
    if (claimedRef.current) return;
    claimedRef.current = true;
    setPhase('claiming');
    setMessage('');
    try {
      const res = await scanQR(hunt.hunt_id, qrSecret, address || '0xdemo');
      const d = res.data;
      setResult({
        arrivalReward: Number(d.arrivalReward) || arrival,
        mainReward: d.mainReward,
        txHash: d.arrivalTxHash,
        explorerUrl: d.explorerUrl,
        tasks: Array.isArray(d.tasks) ? d.tasks : tasks,
        huntTitle: d.huntTitle || hunt.title,
        businessName: d.businessName || hunt.business_name,
      });
      setPhase('reward');
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { code?: string; error?: string } } };
      const code = e.response?.data?.code;
      if (code === 'duplicate_human') setPhase('denied');
      else if (code === 'already_scanned') setPhase('already');
      else if (code === 'expired' || code === 'not_active') setPhase('expired');
      else {
        setMessage(e.response?.data?.error || 'That did not go through. Try again.');
        setPhase('error');
        claimedRef.current = false; // allow a retry
      }
    }
  };

  const goTasks = () => {
    const forward = {
      arrivalReward: result?.arrivalReward,
      mainReward: result?.mainReward,
      tasks: result?.tasks,
      huntTitle: result?.huntTitle,
      businessName: result?.businessName,
      huntId: hunt.hunt_id,
      explorerUrl: result?.explorerUrl,
    };
    navigate(`/tasks/${hunt.hunt_id}`, { state: forward });
  };

  /* ── Terminal states ─────────────────────────────────────────────── */
  if (phase === 'denied' || phase === 'already' || phase === 'expired' || phase === 'error') {
    const copy =
      phase === 'denied'
        ? { title: 'Already claimed by this human.', body: 'World ID shows this person already checked in to this hunt. Each hunt pays one reward per person — no money moved.' }
        : phase === 'already'
          ? { title: "You're already checked in.", body: 'You collected the arrival reward for this hunt already. Head to the tasks to earn the rest.' }
          : phase === 'expired'
            ? { title: 'This hunt has ended.', body: 'Rewards are no longer claimable here. Browse the hunts that are still live.' }
            : { title: 'That did not go through.', body: message || 'Something interrupted the check-in.' };
    return (
      <div className="screen">
        <AppBar onBack={() => navigate('/hunts')} />
        <div className="pad" style={{ marginTop: 8 }}>
          <h1 className="title-l">{copy.title}</h1>
          <p className="body t-muted" style={{ marginTop: 14 }}>{copy.body}</p>
          <div className="stack-12" style={{ marginTop: 28 }}>
            {phase === 'already' && (
              <Button variant="ink" size="lg" block onClick={goTasks}>Go to tasks</Button>
            )}
            {phase === 'error' && (
              <Button variant="ink" size="lg" block onClick={claimArrival}>Try again</Button>
            )}
            <Button variant="secondary" size="lg" block onClick={() => navigate('/hunts')}>Browse hunts</Button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Reward moment (step 5) ──────────────────────────────────────── */
  if (phase === 'reward' && result) {
    const rtasks = result.tasks;
    return (
      <div className="screen" style={{ paddingBottom: 32, display: 'flex', flexDirection: 'column' }}>
        <div className="hero hero--pink" style={{ paddingTop: 76, paddingBottom: 92 }}>
          <RewardMoment
            overline="Checked in"
            amount={result.arrivalReward}
            subline={result.businessName ? `Sent to your wallet by ${result.businessName}` : null}
          >
            {result.explorerUrl && (
              <a
                className="pill"
                href={result.explorerUrl}
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

        {rtasks.length > 0 && (
          <Panel style={{ marginTop: -18, position: 'relative' }}>
            <Block tight>
              <span className="overline t-subtle">Now unlocked</span>
            </Block>
            {rtasks.map((t, i) => (
              <Block key={i} tight>
                <div className="row" style={{ gap: 12 }}>
                  <span className="caption t-subtle tnum" style={{ width: 14, flex: 'none' }}>{i + 1}</span>
                  <span className="body-sm">{taskLabel(t, i)}</span>
                </div>
              </Block>
            ))}
          </Panel>
        )}

        <div className="pad" style={{ marginTop: 'auto', paddingTop: 24 }}>
          <Button variant="ink" size="lg" block onClick={goTasks}>Start tasks</Button>
        </div>
      </div>
    );
  }

  /* ── Steps 1-4 on one screen ─────────────────────────────────────── */
  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="hero hero--pink hero--tall" style={{ paddingTop: 0 }}>
        <AppBar tone="pink" onBack={() => navigate(-1)} />
        <span className="overline">Checking in to</span>
        <h1 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.04, letterSpacing: '-0.04em', marginTop: 8 }}>
          {hunt.title}
        </h1>
        {hunt.business_name && <p className="body-sm" style={{ marginTop: 8, opacity: 0.75 }}>{hunt.business_name}</p>}
        <div style={{ marginTop: 26 }}>
          <span className="overline">You&apos;ll collect on arrival</span>
          <div style={{ marginTop: 10 }}>
            <Money value={arrival} size="hero" signed chip />
          </div>
          <p className="body-sm" style={{ marginTop: 10, opacity: 0.7 }}>
            Full hunt value {Number(totalReward(hunt)).toFixed(2)} USDC
          </p>
        </div>
      </div>

      {/* Step 2: location check */}
      <Panel style={{ marginTop: -16, position: 'relative' }}>
        <Block>
          <div className="row" style={{ gap: 10 }}>
            <MapPin size={16} strokeWidth={2.4} style={{ flex: 'none', color: 'var(--ink-subtle)' }} />
            <span className="overline t-subtle">At the venue</span>
          </div>
          {loc == null ? (
            <p className="body-sm t-muted" style={{ marginTop: 8 }}>
              We&apos;ll do a quick location check — it won&apos;t block you if it&apos;s off.
            </p>
          ) : loc.status === 'ok' ? (
            <p className="body-sm" style={{ marginTop: 8, color: 'var(--ink)' }}>
              <Check size={13} strokeWidth={3} style={{ verticalAlign: 'middle' }} /> You&apos;re at the venue
              {typeof loc.distanceM === 'number' ? ` (~${Math.round(loc.distanceM)} m).` : '.'}
            </p>
          ) : loc.status === 'far' ? (
            <p className="body-sm t-muted" style={{ marginTop: 8 }}>
              You look about {Math.round((loc.distanceM || 0) / 10) * 10} m away. You can still check in if you&apos;re inside.
            </p>
          ) : (
            <p className="body-sm t-muted" style={{ marginTop: 8 }}>
              Couldn&apos;t read your location — that&apos;s fine, it&apos;s only a soft check.
            </p>
          )}
        </Block>
      </Panel>

      {/* Step 3: World verify (shown after the location check runs) */}
      {phase === 'verify' && (
        <section className="pad" style={{ marginTop: 20 }}>
          <WorldCheck
            huntId={hunt.hunt_id}
            walletAddress={address || '0xdemo'}
            action="tr-vvo-arrival"
            onVerified={() => claimArrival()}
          />
        </section>
      )}

      {phase === 'claiming' && (
        <p className="body-sm t-muted pad" style={{ marginTop: 20, textAlign: 'center' }}>
          Releasing your arrival reward…
        </p>
      )}

      {/* Step 2 action (before the location check has run) */}
      {phase === 'location' && (
        <div className="pad" style={{ marginTop: 'auto', paddingTop: 24 }}>
          <Button variant="ink" size="lg" block loading={locChecking} onClick={runLocationCheck}>
            I&apos;m here — continue
          </Button>
        </div>
      )}
    </div>
  );
}
