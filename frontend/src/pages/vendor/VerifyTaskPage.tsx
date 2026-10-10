import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ExternalLink } from 'lucide-react';
import { completeTask, claimMainReward, getHunts, OFFLINE } from '../../lib/api';
import { DEMO_HUNTS, DEMO_PARTICIPANTS } from '../../lib/demoData';
import { useDemoAccount } from '../../lib/demoAccount';
import type { Hunt } from '../../lib/types';
import { AppBar, Block, Button, Field, Input, Money, Panel, SectionLabel, shortAddress } from '../../ui';
import { Icon } from '../../components/Icon';

/* placeholder: prefilled while OFFLINE so verification runs without typing. */
const PREFILL_WALLET = OFFLINE ? DEMO_PARTICIPANTS[2].wallet_address : '';

/** Verify a hunter and release the main reward. */
export default function VerifyTaskPage() {
  const navigate = useNavigate();
  const { address } = useDemoAccount();
  const [wallet, setWallet] = useState(PREFILL_WALLET);
  const [huntId, setHuntId] = useState(OFFLINE ? DEMO_HUNTS[0].hunt_id : '');
  const [hunts, setHunts] = useState<Hunt[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!address) return;
    getHunts()
      .then((res) => {
        const all: Hunt[] = res.data?.hunts || [];
        const mine = all.filter(
          (h) => h.status === 'active' && h.vendor_wallet?.toLowerCase() === address.toLowerCase()
        );
        const list = mine.length ? mine : all;
        setHunts(list);
        if (list.length > 0) setHuntId((cur) => cur || list[0].hunt_id);
      })
      .catch(console.error);
  }, [address]);

  const verify = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      await completeTask(huntId, wallet);
      const res = await claimMainReward(huntId, wallet);
      setResult({
        mainReward: res.data.mainReward,
        txHash: res.data.rewardTxHash,
        explorerUrl: res.data.explorerUrl,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'That did not go through. Check the wallet and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--pink)' }}>
        <div className="center" style={{ flex: 1, justifyContent: 'center', padding: '40px 20px' }}>
          <div className="check-mark">
            <Check size={36} strokeWidth={3} />
          </div>
          <span className="overline" style={{ marginTop: 28 }}>
            Reward released
          </span>
          <div className="hero-amount" style={{ marginTop: 14 }}>
            <Money value={result.mainReward} size="hero" signed chip />
          </div>
          <p className="body" style={{ marginTop: 20, fontWeight: 600 }}>
            Sent to {shortAddress(wallet)}
          </p>
          {result.explorerUrl && (
            <a
              className="link-inline row"
              href={result.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginTop: 16, gap: 6 }}
            >
              View receipt
              <ExternalLink size={14} strokeWidth={2.4} />
            </a>
          )}
        </div>

        <div
          style={{
            background: 'var(--bone)',
            borderRadius: 'var(--r-xl) var(--r-xl) 0 0',
            padding: '28px 20px calc(28px + env(safe-area-inset-bottom))',
          }}
        >
          <div className="stack-12">
            <Button variant="ink" size="lg" block onClick={() => setResult(null)}>
              Verify another
            </Button>
            <Button variant="ghost" size="md" block onClick={() => navigate('/vendor/dashboard')}>
              Back to overview
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const selected = hunts.find((h) => h.hunt_id === huntId);

  return (
    <div className="screen">
      <div className="hero hero--soft" style={{ paddingTop: 0 }}>
        <AppBar onBack={() => navigate('/vendor/dashboard')} tone="pink" />
        <span className="overline t-subtle">Release payment</span>
        <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.045em', marginTop: 8 }}>
          Verify a hunter.
        </h1>
      </div>

      <section style={{ marginTop: 24 }}>
        <SectionLabel icon={<Icon name="user" set="objects" size={16} />}>Who are you paying</SectionLabel>
        <Panel>
          {hunts.length > 0 && (
            <Block>
              <Field label="Which hunt">
                <select className="input" value={huntId} onChange={(e) => setHuntId(e.target.value)}>
                  {hunts.map((h) => (
                    <option key={h.hunt_id} value={h.hunt_id}>
                      {h.title}
                    </option>
                  ))}
                </select>
              </Field>
            </Block>
          )}
          <Block>
            <Field label="Hunter's wallet" hint="Ask them to show their profile screen." error={error || undefined}>
              <Input
                className="mono"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                placeholder="0x…"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </Field>
          </Block>
        </Panel>
      </section>

      {selected && (
        <section style={{ marginTop: 24 }}>
          <Panel tone="pink">
            <Block>
              <span className="overline">You will release</span>
              <div style={{ marginTop: 10 }}>
                <Money value={selected.main_reward} size="hero" chip />
              </div>
            </Block>
            <Block tight>
              <p className="body-sm" style={{ opacity: 0.8 }}>
                Only do this once you have seen the tasks completed.
              </p>
            </Block>
          </Panel>
        </section>
      )}

      <div className="pad" style={{ marginTop: 32 }}>
        <Button variant="ink" size="lg" block loading={loading} disabled={!wallet.trim()} onClick={verify}>
          Verify and release reward
        </Button>
      </div>
    </div>
  );
}
