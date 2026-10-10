import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mark, Wordmark } from '../components/Logo';

/** Splash — the reversed mark needs a dark ground, or its pink inner chevron is lost. */
export default function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate('/login', { replace: true }), 2200);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--ink)',
        color: 'var(--bone)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '0 20px 48px',
      }}
    >
      <div />

      <div className="center" style={{ gap: 18 }}>
        <Mark size={84} variant="reversed" />
        <Wordmark size={46} color="var(--bone)" />
      </div>

      <p className="body-sm" style={{ textAlign: 'center', opacity: 0.6 }}>
        Get paid to explore your city
      </p>
    </div>
  );
}
