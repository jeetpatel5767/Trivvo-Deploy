/* Trivvo icon set — drawn to match the reference sheet: 1.8px ink stroke, rounded
   caps and joins, flat pink fills, and the small pink spark marks. Inline SVG rather
   than image assets so they scale, recolour and cost nothing to load. */

type IconProps = { size?: number; className?: string; style?: React.CSSProperties };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  xmlns: 'http://www.w3.org/2000/svg',
});

const S = { stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const PINK = 'var(--pink)';

/** The three short dashes the reference puts beside most glyphs. */
const Sparks = ({ x = 18, y = 4 }: { x?: number; y?: number }) => (
  <g stroke={PINK} strokeWidth="1.6" strokeLinecap="round">
    <path d={`M${x} ${y} l2 -2`} />
    <path d={`M${x + 2.4} ${y + 2.6} l2.4 -1`} />
    <path d={`M${x - 1} ${y - 1.4} l0.6 -2.4`} />
  </g>
);

export function IconCompass({ size = 24, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <circle cx="12" cy="12" r="8.6" {...S} />
      <path d="M15.4 8.6 L13.6 13.6 L8.6 15.4 L10.4 10.4 Z" fill={PINK} {...S} />
    </svg>
  );
}

export function IconTarget({ size = 24, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <circle cx="11" cy="13" r="7.6" {...S} />
      <circle cx="11" cy="13" r="3.4" fill={PINK} {...S} />
      <path d="M11 13 L19.5 4.5" {...S} />
      <path d="M17 4 h3 v3" {...S} />
    </svg>
  );
}

export function IconFlame({ size = 24, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path
        d="M12.5 2.5c.6 3-1.3 4.3-2.8 5.9-1.6 1.7-2.9 3.3-2.9 5.8a6.2 6.2 0 1 0 12.4 0c0-2.2-.9-3.7-2.1-5.2-.5 1-1.2 1.6-2 1.9.7-3.3-.9-6.5-2.6-8.4Z"
        fill={PINK}
        {...S}
      />
    </svg>
  );
}

export function IconPin({ size = 24, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M12 21.5s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" fill={PINK} {...S} />
      <circle cx="12" cy="10.2" r="2.6" fill="var(--bone)" {...S} />
    </svg>
  );
}

export function IconCoins({ size = 24, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <ellipse cx="12" cy="6.6" rx="7.4" ry="3.1" fill={PINK} {...S} />
      <path d="M4.6 6.6v4.2c0 1.7 3.3 3.1 7.4 3.1s7.4-1.4 7.4-3.1V6.6" fill={PINK} {...S} />
      <path d="M4.6 10.8V15c0 1.7 3.3 3.1 7.4 3.1s7.4-1.4 7.4-3.1v-4.2" {...S} />
    </svg>
  );
}

export function IconFlag({ size = 24, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M6 21V4" {...S} />
      <path d="M6 4.5h9.8l-1.8 3.6 1.8 3.6H6" fill={PINK} {...S} />
    </svg>
  );
}

export function IconBinoculars({ size = 24, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <circle cx="6.8" cy="14.4" r="4.2" fill={PINK} {...S} />
      <circle cx="17.2" cy="14.4" r="4.2" fill={PINK} {...S} />
      <path d="M6.3 10.3 7.4 4.6h3l.6 6M17.7 10.3 16.6 4.6h-3l-.6 6" {...S} />
      <path d="M10.6 13.6h2.8" {...S} />
    </svg>
  );
}

export function IconCoffee({ size = 24, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M4.6 8h12v7.4a4 4 0 0 1-4 4H8.6a4 4 0 0 1-4-4V8Z" fill={PINK} {...S} />
      <path d="M16.6 10h1.6a2.6 2.6 0 0 1 0 5.2h-1.6" {...S} />
      <path d="M7.4 4.4v1.8M11 3.6v2.6" stroke={PINK} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconSneaker({ size = 24, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path
        d="M2.6 16.4c0-2.3.6-4.1 1.6-5.6l2.4.6 1.2 1.9 2.6-3.4c2 1.5 3.6 2.6 5.3 3.1l3.4 1c1.3.4 2 1.3 2 2.5v1.3H2.6v-1.4Z"
        fill={PINK}
        {...S}
      />
      <path d="M2.6 17.8h18.5" {...S} />
    </svg>
  );
}

export function IconCamera({ size = 24, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M3.4 8.4h3.4l1.6-2.6h7.2l1.6 2.6h3.4v10H3.4v-10Z" {...S} />
      <circle cx="12" cy="13" r="3.4" fill={PINK} {...S} />
    </svg>
  );
}

export function IconStore({ size = 24, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M4 9.4h16v10.2H4V9.4Z" {...S} />
      <path d="M3.2 9.4 5 4.6h14l1.8 4.8" fill={PINK} {...S} />
      <path d="M9.6 19.6v-5h4.8v5" {...S} />
    </svg>
  );
}

export function IconTrophy({ size = 24, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M7 4.2h10v5.2a5 5 0 0 1-10 0V4.2Z" fill={PINK} {...S} />
      <path d="M7 5.6H4.4v1.8A3.2 3.2 0 0 0 7 10.5M17 5.6h2.6v1.8a3.2 3.2 0 0 1-2.6 3.1" {...S} />
      <path d="M12 14.4v3.2M8.6 20.2h6.8" {...S} />
    </svg>
  );
}

export function IconSparkle({ size = 24, className, style }: IconProps) {
  return (
    <svg {...base(size)} className={className} style={style}>
      <path d="M12 3.6 13.9 9.4 19.8 11.3 13.9 13.2 12 19 10.1 13.2 4.2 11.3 10.1 9.4 Z" fill={PINK} {...S} />
    </svg>
  );
}

/** Folded map with a pin — the illustration beside the profile name. */
export function MapIllustration({ size = 150, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size * 0.78} viewBox="0 0 150 117" fill="none" style={style} aria-hidden="true">
      <g stroke="var(--ink)" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round">
        <path d="M8 40 L46 26 L92 42 L132 28 V92 L92 106 L46 90 L8 104 Z" fill="var(--paper)" />
        <path d="M46 26 V90" />
        <path d="M92 42 V106" />
        <path d="M20 58 q12 -8 22 2 t20 -2" stroke="#9FB09A" strokeWidth="2.2" fill="none" />
        <path d="M100 60 q12 -8 22 2" stroke="#9FB09A" strokeWidth="2.2" fill="none" />
        <path d="M56 56 q10 -6 20 4 t16 -2" stroke="#9FB09A" strokeWidth="2.2" fill="none" />
      </g>
      <path
        d="M104 10c-10 0-18 8-18 18 0 13 18 29 18 29s18-16 18-29c0-10-8-18-18-18Z"
        fill="var(--pink)"
        stroke="var(--ink)"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <circle cx="104" cy="27" r="6.4" fill="var(--bone)" stroke="var(--ink)" strokeWidth="2.6" />
      <g stroke="var(--pink)" strokeWidth="3" strokeLinecap="round">
        <path d="M66 24 l-4 -10" />
        <path d="M78 14 l1 -9" />
        <path d="M136 36 l7 -5" />
      </g>
      <g stroke="var(--ink)" strokeWidth="3" strokeLinecap="round">
        <path d="M60 86 l-7 8" />
        <path d="M138 56 l6 3" />
      </g>
    </svg>
  );
}

/** Scalloped disc used behind a badge glyph. */
export function BadgeDisc({
  children,
  tone = 'pink',
  size = 74,
}: {
  children: React.ReactNode;
  tone?: 'pink' | 'soft' | 'ink';
  size?: number;
}) {
  const fill = tone === 'pink' ? 'var(--pink)' : tone === 'soft' ? 'var(--pink-soft)' : 'var(--ink)';
  const glyph = tone === 'ink' ? 'var(--pink)' : 'var(--ink)';

  // 12-lobe scallop, drawn as a star-ish polar path with rounded joins
  const lobes = 12;
  const pts = Array.from({ length: lobes * 2 }, (_, i) => {
    const r = i % 2 === 0 ? 46 : 39;
    const a = (i / (lobes * 2)) * Math.PI * 2 - Math.PI / 2;
    return `${50 + Math.cos(a) * r},${50 + Math.sin(a) * r}`;
  }).join(' ');

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0 }}>
        <polygon
          points={pts}
          fill={fill}
          stroke="var(--ink)"
          strokeWidth="3.4"
          strokeLinejoin="round"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: glyph,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export { Sparks };

/** Picks a hunt's icon from its title. Falls back to a pin. */
export function huntIcon(title?: string) {
  const t = (title || '').toLowerCase();
  if (/coffee|brew|caf|espresso|tea/.test(t)) return IconCoffee;
  if (/sneaker|shoe|kick|run/.test(t)) return IconSneaker;
  if (/art|gallery|photo|museum|exhibit/.test(t)) return IconCamera;
  if (/shop|store|market|boutique/.test(t)) return IconStore;
  return IconPin;
}
