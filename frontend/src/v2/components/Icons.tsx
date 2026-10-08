/**
 * v2 icon set — a single consistent 24x24 stroke family.
 * Inline SVG so icons inherit `currentColor` and need no runtime dependency.
 */

type IconProps = { className?: string };

/**
 * Default to a concrete 20px box so a bare `<Icon />` always has a predictable
 * size. Context rules in v2.css (`.v2-meta svg`, `.v2-btn svg`, …) still win,
 * because CSS beats presentation attributes.
 */
const base = {
    viewBox: '0 0 24 24',
    width: 20,
    height: 20,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
};

export const ArrowLeft = (p: IconProps) => (
    <svg {...base} {...p}><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
);

export const ArrowRight = (p: IconProps) => (
    <svg {...base} {...p}><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
);

export const ChevronRight = (p: IconProps) => (
    <svg {...base} {...p}><path d="M9 18l6-6-6-6" /></svg>
);

export const Search = (p: IconProps) => (
    <svg {...base} {...p}><circle cx="11" cy="11" r="7.5" /><path d="M21 21l-4.3-4.3" /></svg>
);

export const MapPin = (p: IconProps) => (
    <svg {...base} {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1116 0z" /><circle cx="12" cy="10" r="2.8" /></svg>
);

export const Clock = (p: IconProps) => (
    <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></svg>
);

export const QrCode = (p: IconProps) => (
    <svg {...base} {...p}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 14h3v3" /><path d="M20 17v4h-4" />
    </svg>
);

export const Scan = (p: IconProps) => (
    <svg {...base} {...p}>
        <path d="M3 8V5.5A2.5 2.5 0 015.5 3H8" /><path d="M16 3h2.5A2.5 2.5 0 0121 5.5V8" />
        <path d="M21 16v2.5a2.5 2.5 0 01-2.5 2.5H16" /><path d="M8 21H5.5A2.5 2.5 0 013 18.5V16" />
        <path d="M7 12h10" />
    </svg>
);

export const User = (p: IconProps) => (
    <svg {...base} {...p}><path d="M20 21v-1.5a5 5 0 00-5-5H9a5 5 0 00-5 5V21" /><circle cx="12" cy="7" r="4" /></svg>
);

export const Compass = (p: IconProps) => (
    <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M15.6 8.4l-2.1 5.2-5.2 2.1 2.1-5.2 5.2-2.1z" /></svg>
);

export const Check = (p: IconProps) => (
    <svg {...base} {...p} strokeWidth={2.6}><path d="M20 6.5L9 17.5l-5-5" /></svg>
);

export const Lock = (p: IconProps) => (
    <svg {...base} {...p}><rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5" /><path d="M8 10.5V7a4 4 0 118 0v3.5" /></svg>
);

export const Unlock = (p: IconProps) => (
    <svg {...base} {...p}><rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5" /><path d="M8 10.5V7a4 4 0 017.5-2" /></svg>
);

export const ExternalLink = (p: IconProps) => (
    <svg {...base} {...p}><path d="M14 4h6v6" /><path d="M20 4l-9 9" /><path d="M18 14v4.5A1.5 1.5 0 0116.5 20h-11A1.5 1.5 0 014 18.5v-11A1.5 1.5 0 015.5 6H10" /></svg>
);

export const Wallet = (p: IconProps) => (
    <svg {...base} {...p}><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M3 10h18" /><circle cx="17" cy="14.5" r="1.2" fill="currentColor" stroke="none" /></svg>
);

export const Store = (p: IconProps) => (
    <svg {...base} {...p}><path d="M4 10v9.5A1.5 1.5 0 005.5 21h13a1.5 1.5 0 001.5-1.5V10" /><path d="M3 7l1.5-4h15L21 7a3 3 0 01-6 0 3 3 0 01-6 0 3 3 0 01-6 0z" /></svg>
);

export const Trophy = (p: IconProps) => (
    <svg {...base} {...p}><path d="M8 4h8v5a4 4 0 11-8 0V4z" /><path d="M8 5.5H5.5A2.5 2.5 0 008 10" /><path d="M16 5.5h2.5A2.5 2.5 0 0116 10" /><path d="M12 13v4" /><path d="M8.5 20.5h7" /></svg>
);

export const Flame = (p: IconProps) => (
    <svg {...base} {...p}><path d="M12 22a6 6 0 006-6c0-4.5-6-12-6-12S6 11.5 6 16a6 6 0 006 6z" /><path d="M12 18a2.5 2.5 0 002.5-2.5c0-1.8-2.5-4.5-2.5-4.5S9.5 13.7 9.5 15.5A2.5 2.5 0 0012 18z" /></svg>
);

export const Coins = (p: IconProps) => (
    <svg {...base} {...p}><ellipse cx="12" cy="6.5" rx="7.5" ry="3.5" /><path d="M4.5 6.5v5c0 1.9 3.4 3.5 7.5 3.5s7.5-1.6 7.5-3.5v-5" /><path d="M4.5 11.5v5c0 1.9 3.4 3.5 7.5 3.5s7.5-1.6 7.5-3.5v-5" /></svg>
);

export const X = (p: IconProps) => (
    <svg {...base} {...p}><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
);

export const Zap = (p: IconProps) => (
    <svg {...base} {...p}><path d="M13 2L4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5z" /></svg>
);

export const AlertCircle = (p: IconProps) => (
    <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v4.5" /><circle cx="12" cy="16" r="0.9" fill="currentColor" stroke="none" /></svg>
);
