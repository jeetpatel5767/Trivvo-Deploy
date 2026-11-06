import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { claimMainReward } from '../../lib/api';
import { useDemoAccount } from '../../lib/demoAccount';
import { RewardMoment } from '../../components/RewardMoment';
import { WorldCheck } from '../../components/WorldCheck';
import { AppBar, Block, Button, Panel, shortAddress } from '../../ui';

type Phase = 'claiming' | 'paid' | 'strong' | 'error';

interface RewardState {
  huntId?: string;
  mainReward?: string | number;
  businessName?: string;
}

/**
 * Final payout — C5. The reward is released automatically by the server once every task
 * is approved: we POST /reward/claim, the backend pays claimMainReward on chain and
 * returns the real tx. If the reward is over $5 the backend first needs a stronger World
 * credential, so we run the 'tr-vvo-main' check here, then retry the claim. No fake hash.
 */
export default function RewardConfirmPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as RewardState;
  const { address } = useDemoAccount();
  const huntId = state.huntId;

  const [phase, setPhase] = useState<Phase>('claiming');
  const [amount, setAmount] = useState(Number(state.mainReward) || 0);
  const [txHash, setTxHash] = useState('');
  const [explorerUrl, setExplorerUrl] = useState('');
  const [message, setMessage] = useState('');
  const claimingRef = useRef(false);

  const claim = async () => {
    if (!huntId || claimingRef.current) return;
    claimingRef.current = true;
    setPhase('claiming');
    setMessage('');
    try {
      const { data } = await claimMainReward(huntId);
      setAmount(Number(data.mainReward) || amount);
      setTxHash(data.rewardTxHash || '');
      setExplorerUrl(data.explorerUrl || '');
      setPhase('paid');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { code?: string; error?: string } } };
      const code = e.response?.data?.code;
      if (code === 'strong_credential_required') setPhase('strong');
      else {
        setMessage(e.response?.data?.error || 'That did not go through. Try again.');
        setPhase('error');
      }
    } finally {
      claimingRef.current = false;
    }
  };

  useEffect(() => {
    if (!huntId) {
      navigate('/hunts', { replace: true });
      return;
    }
    // Kick off the claim on mount; claim() manages its own state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void claim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!huntId) return null;

  /* Stronger World check required for a > $5 reward. */
  if (phase === 'strong') {
    return (
      <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
        <AppBar onBack={() => navigate(-1)} />
        <div className="pad" style={{ marginTop: 8 }}>
          <h1 className="title-l">One more check.</h1>
          <p className="body t-muted" style={{ marginTop: 12 }}>
            This reward is worth more than $5, so it needs a stronger World ID credential before it&apos;s released.
          </p>
        </div>
        <section className="pad" style={{ marginTop: 20 }}>
          <WorldCheck
            huntId={huntId}
            walletAddress={address || '0xdemo'}
            action="tr-vvo-main"
            onVerified={() => void claim()}
          />
        </section>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
        <AppBar onBack={() => navigate(-1)} />
        <div className="pad" style={{ marginTop: 8 }}>
          <h1 className="title-l">That did not go through.</h1>
          <p className="body t-muted" style={{ marginTop: 12 }}>{message}</p>
          <div className="stack-12" style={{ marginTop: 28 }}>
            <Button variant="ink" size="lg" block onClick={() => void claim()}>Try again</Button>
            <Button variant="secondary" size="lg" block onClick={() => navigate('/hunts')}>Browse hunts</Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'claiming') {
    return (
      <div className="screen center" style={{ minHeight: '60vh', justifyContent: 'center' }}>
        <span className="overline t-subtle">Releasing your reward</span>
        <h1 className="title-l" style={{ marginTop: 10 }}>One moment…</h1>
      </div>
    );
  }

  /* paid */
  return (
    <div className="screen" style={{ paddingBottom: 32, display: 'flex', flexDirection: 'column' }}>
      <div className="hero hero--pink" style={{ paddingTop: 76, paddingBottom: 92 }}>
        <RewardMoment
          overline="Verified and paid"
          amount={amount}
          subline={state.businessName ? `Sent to your wallet by ${state.businessName}` : 'Sent to your wallet'}
        />
      </div>

      {txHash && (
        <Panel style={{ marginTop: -18, position: 'relative' }}>
          <Block tight>
            <div className="row-between">
              <span className="body-sm t-muted">Receipt</span>
              <span className="body-sm mono">{shortAddress(txHash)}</span>
            </div>
          </Block>
          {explorerUrl && (
            <Block tight>
              <a className="row" href={explorerUrl} target="_blank" rel="noopener noreferrer" style={{ gap: 6 }}>
                <span className="label">View on Worldscan</span>
                <ExternalLink size={14} strokeWidth={2.4} />
              </a>
            </Block>
          )}
        </Panel>
      )}

      <div className="pad stack-12" style={{ marginTop: 'auto', paddingTop: 24 }}>
        <Button variant="ink" size="lg" block onClick={() => navigate('/hunts')}>Find another hunt</Button>
        <Button variant="ghost" size="md" block onClick={() => navigate('/profile')}>See your earnings</Button>
      </div>
    </div>
  );
}
