import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { scanQR } from '../../lib/api';
import { DEMO_HUNTS } from '../../lib/demoData';
import { useDemoAccount } from '../../lib/demoAccount';
import { totalReward, type Hunt } from '../../lib/types';
import { AppBar, Button, Money } from '../../ui';
import { TabBar } from '../../components/TabBar';

/** Pink corner brackets and a sweep line on a dark field. */
function Reticle() {
  const b: React.CSSProperties = {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: 'var(--pink)',
    borderStyle: 'solid',
    borderWidth: 0,
  };
  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: '1 / 0.84',
        width: '100%',
        borderRadius: 'var(--r-xl)',
        background: 'var(--ink-lifted)',
        overflow: 'hidden',
      }}
    >
      <span style={{ ...b, top: 20, left: 20, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12 }} />
      <span style={{ ...b, top: 20, right: 20, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12 }} />
      <span style={{ ...b, bottom: 20, left: 20, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 12 }} />
      <span style={{ ...b, bottom: 20, right: 20, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 12 }} />
      <span
        style={{
          position: 'absolute',
          left: 20,
          right: 20,
          height: 2,
          background: 'var(--pink)',
          animation: 'sweep 2.4s var(--ease-out) infinite',
        }}
      />
      <style>{`@keyframes sweep { 0%,100% { top: 20%; } 50% { top: 80%; } }`}</style>
    </div>
  );
}

/** Scan — dark surface. While OFFLINE the check-in needs no code at all. */
export default function ScanPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateHunt = location.state?.hunt as Hunt | undefined;
  const hunt = stateHunt ?? DEMO_HUNTS[0];
  const { address } = useDemoAccount();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  const checkIn = async () => {
    if (scanning) return;
    setScanning(true);
    setError('');

    try {
      const res = await scanQR(hunt.hunt_id, hunt.qr_secret ?? 'demo', address || '0xdemo');
      if (res.data.success) {
        navigate('/arrival-reward', {
          state: {
            arrivalReward: res.data.arrivalReward,
            mainReward: res.data.mainReward,
            txHash: res.data.arrivalTxHash,
            explorerUrl: res.data.explorerUrl,
            tasks: res.data.tasks,
            huntTitle: res.data.huntTitle,
            businessName: res.data.businessName,
            huntId: hunt.hunt_id,
          },
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'That did not go through. Try again.');
      setScanning(false);
    }
  };

  return (
    <>
      <div className="screen screen--tabbar">
        {/* The corner carries which hunt you are checking into — the screen said so
            nowhere else, and it balances the back button. */}
        <AppBar
          tone="dark"
          onBack={() => navigate(-1)}
          action={
            hunt.business_name && (
              <span
                className="pill pill--onDark truncate"
                style={{ maxWidth: 190, height: 44, padding: '0 18px', fontSize: 13 }}
              >
                {hunt.business_name}
              </span>
            )
          }
        />

        <div className="pad" style={{ marginTop: 4 }}>
          <h1 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.04, letterSpacing: '-0.04em' }}>
            Point at the
            <br />
            code in store.
          </h1>
        </div>

        <div className="pad" style={{ marginTop: 28 }}>
          <Reticle />
        </div>

        {/* Payout sits on the dark surface itself. A raised panel here would use
            --ink-lifted, which is barely a shade off --ink and reads as a smudge
            rather than a card; a hairline separates it far more cleanly. */}
        <section className="pad payout" style={{ marginTop: 30 }}>
          <hr className="rule" style={{ marginBottom: 20 }} />

          <span className="overline" style={{ color: 'rgba(244,241,234,0.55)' }}>
            You&apos;ll collect
          </span>

          <div style={{ marginTop: 12 }}>
            <Money value={hunt.arrival_reward} size="lg" signed chip style={{ fontSize: 44 }} />
          </div>

          <div className="row-between" style={{ marginTop: 22 }}>
            <span className="body-sm" style={{ color: 'rgba(244,241,234,0.55)' }}>
              Full hunt value
            </span>
            <span className="row" style={{ gap: 6, alignItems: 'baseline' }}>
              <Money value={totalReward(hunt)} size="md" unit={null} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: 'rgba(244,241,234,0.5)',
                }}
              >
                USDC
              </span>
            </span>
          </div>
        </section>

        <div className="pad" style={{ marginTop: 28 }}>
          <Button variant="primary" size="lg" block loading={scanning} onClick={checkIn}>
            Check in
          </Button>
          {error && (
            <p className="caption" style={{ color: 'var(--pink)', marginTop: 12, textAlign: 'center' }}>
              {error}
            </p>
          )}
        </div>
      </div>
      <TabBar />
    </>
  );
}
