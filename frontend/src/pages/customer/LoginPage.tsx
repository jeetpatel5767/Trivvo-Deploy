import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useConnect } from 'wagmi';
import { ArrowRight } from 'lucide-react';
import { login, OFFLINE } from '../../lib/api';
import { Logo } from '../../components/Logo';
import { Button, RoundButton } from '../../ui';

/** The promise, as three beats rather than a paragraph — matches the headline's rhythm. */
const BEATS = ['Show up.', 'Do the task.', 'Get paid.'];

/** Login — the headline is the screen. Cream half, pink base, two labelled exits. */
export default function LoginPage() {
  const { isConnected, address } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const navigate = useNavigate();

  useEffect(() => {
    if (isConnected && address) {
      login(address, 'user').catch(() => {});
      navigate('/hunts');
    }
  }, [isConnected, address, navigate]);

  const handleConnect = () => {
    // placeholder: no wallet needed while OFFLINE — walk straight into the app.
    if (OFFLINE) return navigate('/hunts');
    const connector =
      connectors.find((c) => c.id === 'metaMask') ||
      connectors.find((c) => c.id === 'injected') ||
      connectors[0];
    if (connector) connect({ connector });
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Cream half — brand, headline and the arrow, centred as one block */}
      <div
        style={{
          flex: 1,
          background: 'var(--bone)',
          padding: 'max(28px, env(safe-area-inset-top)) 20px 36px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Logo size={34} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1
            style={{
              fontSize: 'clamp(40px, 13.5vw, 52px)',
              fontWeight: 800,
              lineHeight: 0.98,
              letterSpacing: '-0.05em',
            }}
          >
            Get paid
            <br />
            to explore
            <br />
            your city.
          </h1>

          <div style={{ marginTop: 32 }}>
            <RoundButton onClick={handleConnect} aria-label="Get started" disabled={isPending}>
              <ArrowRight strokeWidth={2.4} />
            </RoundButton>
          </div>
        </div>
      </div>

      {/* Pink base — three beats, one quiet fact, then the two ways in */}
      <div
        style={{
          background: 'var(--pink)',
          borderRadius: 'var(--r-xl) var(--r-xl) 0 0',
          padding: '30px 20px calc(28px + env(safe-area-inset-bottom))',
        }}
      >
        <div>
          {BEATS.map((beat) => (
            <div
              key={beat}
              style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.18, letterSpacing: '-0.035em' }}
            >
              {beat}
            </div>
          ))}
        </div>

        <div className="stack-12" style={{ marginTop: 28 }}>
          <Button variant="ink" size="lg" block loading={isPending} onClick={handleConnect}>
            Connect wallet
          </Button>
          <Button variant="paper" size="lg" block onClick={() => navigate('/vendor/dashboard')}>
            I&apos;m a business
          </Button>
        </div>
      </div>
    </div>
  );
}
