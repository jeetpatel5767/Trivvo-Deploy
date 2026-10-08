import type { ReactNode, CSSProperties, ButtonHTMLAttributes } from 'react';
import { ArrowLeft } from './Icons';

/* ============================================================
   SCREEN — the page shell every v2 page renders inside.
   ============================================================ */

export function Screen({
    children,
    flush,
    centered,
    style,
}: {
    children: ReactNode;
    flush?: boolean;
    centered?: boolean;
    style?: CSSProperties;
}) {
    const cls = [
        'v2-screen',
        flush && 'v2-screen--flush',
        centered && 'v2-screen--centered',
    ].filter(Boolean).join(' ');

    return <div className={cls} style={style}>{children}</div>;
}

/* ============================================================
   TOP BAR
   ============================================================ */

export function TopBar({
    title,
    eyebrow,
    onBack,
    action,
}: {
    title?: string;
    eyebrow?: string;
    onBack?: () => void;
    action?: ReactNode;
}) {
    return (
        <header className="v2-topbar">
            {onBack && (
                <button className="v2-iconbtn" onClick={onBack} aria-label="Go back">
                    <ArrowLeft />
                </button>
            )}
            {(title || eyebrow) && (
                <div className="v2-topbar__titles">
                    {eyebrow && <span className="v2-topbar__eyebrow">{eyebrow}</span>}
                    {title && <h1 className="v2-topbar__title">{title}</h1>}
                </div>
            )}
            {action}
        </header>
    );
}

/* ============================================================
   BUTTON
   ============================================================ */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    block?: boolean;
};

export function Button({
    variant = 'primary',
    size = 'md',
    block,
    className,
    children,
    ...rest
}: ButtonProps) {
    const cls = [
        'v2-btn',
        `v2-btn--${variant}`,
        size !== 'md' && `v2-btn--${size}`,
        block && 'v2-btn--block',
        className,
    ].filter(Boolean).join(' ');

    return <button className={cls} {...rest}>{children}</button>;
}

/* ============================================================
   CARD
   ============================================================ */

export function Card({
    children,
    onClick,
    variant,
    style,
    className,
}: {
    children: ReactNode;
    onClick?: () => void;
    variant?: 'flat' | 'inset';
    style?: CSSProperties;
    className?: string;
}) {
    const cls = [
        'v2-card',
        variant && `v2-card--${variant}`,
        onClick && 'v2-card--interactive',
        className,
    ].filter(Boolean).join(' ');

    if (onClick) {
        return (
            <button type="button" className={cls} style={style} onClick={onClick}>
                {children}
            </button>
        );
    }
    return <div className={cls} style={style}>{children}</div>;
}

/* ============================================================
   MONEY — the hero element. Always tabular, always explicit.
   ============================================================ */

export function Money({
    amount,
    size = 'md',
    unit = 'USDC',
    neutral,
    showPlus,
}: {
    /** Undefined/null render as 0 rather than NaN. */
    amount: number | string | null | undefined;
    size?: 'hero' | 'lg' | 'md' | 'sm';
    unit?: string;
    neutral?: boolean;
    showPlus?: boolean;
}) {
    const n = Number(amount);
    const safe = Number.isFinite(n) ? n : 0;
    // Show cents only when they carry information.
    const text = Number.isInteger(safe) ? String(safe) : safe.toFixed(2);

    const cls = [
        'v2-money',
        `v2-money--${size}`,
        neutral && 'v2-money--neutral',
    ].filter(Boolean).join(' ');

    return (
        <span className={cls}>
            <span className="v2-money__value">{showPlus && safe > 0 ? '+' : ''}{text}</span>
            <span className="v2-money__unit">{unit}</span>
        </span>
    );
}

/* ============================================================
   BADGE
   ============================================================ */

export function Badge({
    children,
    tone = 'mute',
    dot,
}: {
    children: ReactNode;
    tone?: 'live' | 'info' | 'warn' | 'dead' | 'mute';
    dot?: boolean;
}) {
    return (
        <span className={`v2-badge v2-badge--${tone}`}>
            {dot && <span className="v2-badge__dot" />}
            {children}
        </span>
    );
}

/** Maps a hunt status string onto a badge tone. */
export function StatusBadge({ status }: { status?: string }) {
    const s = (status || 'unknown').toLowerCase();
    const tone =
        s === 'active' ? 'live'
            : s === 'upcoming' || s === 'pending' ? 'warn'
                : s === 'expired' || s === 'ended' ? 'dead'
                    : 'mute';
    return <Badge tone={tone} dot={s === 'active'}>{s}</Badge>;
}

/* ============================================================
   META ROW
   ============================================================ */

export function Meta({
    icon,
    children,
    truncate,
}: {
    icon?: ReactNode;
    children: ReactNode;
    truncate?: boolean;
}) {
    return (
        <span className={`v2-meta${truncate ? ' v2-meta--truncate' : ''}`}>
            {icon}
            <span>{children}</span>
        </span>
    );
}

/* ============================================================
   SECTION LABEL
   ============================================================ */

export function Label({ children }: { children: ReactNode }) {
    return <div className="v2-label">{children}</div>;
}

/* ============================================================
   PROGRESS
   ============================================================ */

export function Progress({ value }: { value: number }) {
    const pct = Math.max(0, Math.min(100, value));
    return (
        <div className="v2-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="v2-progress__fill" style={{ width: `${pct}%` }} />
        </div>
    );
}

/* ============================================================
   EMPTY STATE
   ============================================================ */

export function Empty({
    icon,
    title,
    body,
    action,
}: {
    icon: ReactNode;
    title: string;
    body?: string;
    action?: ReactNode;
}) {
    return (
        <div className="v2-empty">
            <div className="v2-empty__icon">{icon}</div>
            <h3 className="v2-empty__title">{title}</h3>
            {body && <p className="v2-empty__body">{body}</p>}
            {action && <div style={{ marginTop: 22 }}>{action}</div>}
        </div>
    );
}

/* ============================================================
   SKELETON
   ============================================================ */

export function Skeleton({ height, radius }: { height: number | string; radius?: number }) {
    return (
        <div
            className="v2-skeleton"
            style={{ height, borderRadius: radius ?? undefined }}
        />
    );
}
