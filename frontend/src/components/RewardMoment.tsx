import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { formatAmount } from '../ui';

/* The payout moment, shared by the arrival and the final reward screens:
   an ink seal, expanding rings, a circular burst, a counting figure and a chime. */

const prefersReduced = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Counts up from zero and settles on the exact value, never an approximation. */
function useCountUp(target: number, duration = 850, delay = 420) {
  const [value, setValue] = useState(prefersReduced() ? target : 0);

  useEffect(() => {
    if (prefersReduced()) return setValue(target);

    let raf = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      setValue(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setValue(target);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay]);

  return value;
}

/**
 * Two soft notes, synthesised so there is no audio file to ship.
 *
 * A context created before any gesture on the page comes back *suspended* — which is
 * exactly what happens when one of these screens is opened by URL — so resume() is
 * required, and the caller arms a gesture fallback when it still will not start.
 */
export function playChime(): boolean {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return false;

    const ctx = new Ctx();
    const fire = () => {
      const now = ctx.currentTime;
      [
        { freq: 880, at: 0 },
        { freq: 1318.5, at: 0.12 },
      ].forEach(({ freq, at }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + at);
        gain.gain.linearRampToValueAtTime(0.18, now + at + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + at);
        osc.stop(now + at + 0.55);
      });
      setTimeout(() => ctx.close().catch(() => {}), 1400);
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(fire).catch(() => {});
      return ctx.state !== 'suspended';
    }

    fire();
    return true;
  } catch {
    return false;
  }
}

/** Circles only — nothing in this product has points. */
const DOTS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2 + (i % 2 ? 0.22 : 0);
  const dist = 86 + (i % 3) * 26;
  return {
    tx: `${Math.cos(angle) * dist}px`,
    ty: `${Math.sin(angle) * dist}px`,
    size: i % 3 === 0 ? 10 : i % 3 === 1 ? 7 : 5,
    dark: i % 2 === 0,
    delay: 300 + (i % 4) * 45,
  };
});

export function RewardMoment({
  overline,
  amount,
  subline,
  children,
}: {
  overline: string;
  amount: number;
  subline?: string | null;
  children?: React.ReactNode;
}) {
  const counted = useCountUp(amount);
  const settled = counted >= amount;
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const timer = setTimeout(() => {
      if (playChime()) return;
      const retry = () => {
        playChime();
        window.removeEventListener('pointerdown', retry);
      };
      window.addEventListener('pointerdown', retry, { once: true });
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="center">
      <style>{`
        @keyframes seal-in {
          0%   { transform: scale(0.2) rotate(-18deg); opacity: 0; }
          55%  { transform: scale(1.18) rotate(5deg); opacity: 1; }
          75%  { transform: scale(0.95) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes ring-out {
          0%   { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        @keyframes dot-burst {
          0%   { transform: translate(0,0) scale(0); opacity: 0; }
          18%  { opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 0; }
        }
        @keyframes figure-pop {
          0%   { transform: scale(1); }
          45%  { transform: scale(1.07); }
          100% { transform: scale(1); }
        }
        .seal { animation: seal-in 720ms cubic-bezier(0.34,1.56,0.64,1) 100ms both; }
        .seal-ring {
          position: absolute; inset: 0; border-radius: 999px;
          border: 2px solid var(--ink);
          animation: ring-out 1600ms cubic-bezier(0.16,1,0.3,1) 300ms both;
        }
        .seal-ring:nth-of-type(2) { animation-delay: 620ms; }
        .seal-ring:nth-of-type(3) { animation-delay: 940ms; }
        .dot {
          position: absolute; top: 50%; left: 50%; border-radius: 999px;
          animation: dot-burst 1100ms cubic-bezier(0.16,1,0.3,1) both;
        }
        .figure-settled { animation: figure-pop 420ms cubic-bezier(0.34,1.56,0.64,1); }
        @media (prefers-reduced-motion: reduce) {
          .seal, .figure-settled { animation: none; }
          .seal-ring, .dot { display: none; }
        }
      `}</style>

      <div style={{ position: 'relative', width: 84, height: 84 }}>
        <span className="seal-ring" />
        <span className="seal-ring" />
        <span className="seal-ring" />

        {DOTS.map((d, i) => (
          <span
            key={i}
            className="dot"
            style={
              {
                width: d.size,
                height: d.size,
                marginLeft: -d.size / 2,
                marginTop: -d.size / 2,
                background: d.dark ? 'var(--ink)' : 'var(--bone)',
                animationDelay: `${d.delay}ms`,
                '--tx': d.tx,
                '--ty': d.ty,
              } as React.CSSProperties
            }
          />
        ))}

        {/* Ink, not pink: a pink seal on a pink screen is invisible */}
        <div
          className="seal"
          style={{
            position: 'relative',
            width: 84,
            height: 84,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            background: 'var(--ink)',
            color: 'var(--pink)',
          }}
        >
          <Check size={42} strokeWidth={3} />
        </div>
      </div>

      <span className="overline" style={{ marginTop: 28 }}>
        {overline}
      </span>

      <div className={`money money-hero tnum ${settled ? 'figure-settled' : ''}`} style={{ marginTop: 12 }}>
        +{settled ? formatAmount(amount) : counted.toFixed(2)}
        <span className="unit-pill" style={{ marginLeft: 10, verticalAlign: 'middle' }}>
          USDC
        </span>
      </div>

      {subline && (
        <p className="body" style={{ marginTop: 18, fontWeight: 600 }}>
          {subline}
        </p>
      )}

      {children}
    </div>
  );
}
