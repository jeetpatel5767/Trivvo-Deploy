/* Trivvo mark and lockup. Design system section 3 — do not alter paths, rotation or stroke width. */

type Variant = 'default' | 'mono' | 'reversed' | 'onPink';

const STROKES: Record<Variant, { outer: string; inner: string }> = {
  default: { outer: '#10231C', inner: '#FF85C7' },
  mono: { outer: '#10231C', inner: '#10231C' },
  reversed: { outer: '#F4F1EA', inner: '#FF85C7' },
  // For pink surfaces: the reversed mark would lose its pink inner chevron into the
  // background, so the inner stroke takes ink instead. Bone outer, ink inner.
  onPink: { outer: '#F4F1EA', inner: '#10231C' },
};

export function Mark({ size = 32, variant = 'default' }: { size?: number; variant?: Variant }) {
  // Section 3.2: below 20px the pink inner chevron is not legible — fall back to mono.
  const stroke = STROKES[size < 20 ? 'mono' : variant];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label="Trivvo"
      style={{ flex: 'none' }}
    >
      <g
        transform="translate(-3 2) rotate(12 50 50)"
        fill="none"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 34 L50 76 L84 34" stroke={stroke.outer} />
        <path d="M33 23 L50 44 L67 23" stroke={stroke.inner} />
      </g>
    </svg>
  );
}

export function Wordmark({ size = 24, color }: { size?: number; color?: string }) {
  return (
    <span
      style={{
        fontSize: size,
        fontWeight: 800,
        letterSpacing: '-0.045em',
        lineHeight: 1,
        color,
      }}
    >
      Trivvo
    </span>
  );
}

/** Horizontal lockup. Gap is 25% of mark width (section 3.4). */
export function Logo({ size = 32, variant = 'default' }: { size?: number; variant?: Variant }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.25 }}>
      <Mark size={size} variant={variant} />
      <Wordmark size={size * 0.75} color={variant === 'reversed' ? '#F4F1EA' : '#10231C'} />
    </div>
  );
}

export default Logo;
