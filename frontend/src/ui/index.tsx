/* Trivvo UI primitives v2 — borderless, full-bleed, type-led. */

import React from 'react';
import { ChevronLeft, Menu } from 'lucide-react';
import { Mark } from '../components/Logo';

const cx = (...p: (string | false | undefined | null)[]) => p.filter(Boolean).join(' ');

/* ============ Button ============ */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ink' | 'paper' | 'secondary' | 'ghost' | 'danger';
  size?: 'lg' | 'md' | 'sm';
  block?: boolean;
  loading?: boolean;
};

export function Button({
  variant = 'secondary',
  size = 'md',
  block,
  loading,
  disabled,
  children,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cx('btn', `btn--${variant}`, `btn--${size}`, block && 'btn--block', className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="btn-spinner" /> : children}
    </button>
  );
}

/** Circular arrow button — the reference's affordance under a big headline. */
export function RoundButton({
  tone = 'pink',
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'pink' | 'ink' }) {
  return (
    <button type="button" className={cx('btn-round', tone === 'ink' && 'btn-round--ink')} {...rest}>
      {children}
    </button>
  );
}

/* ============ Hero — full-bleed colour zone ============ */

export function Hero({
  tone = 'cream',
  flat,
  tall,
  className,
  children,
}: {
  tone?: 'cream' | 'paper' | 'pink' | 'soft' | 'ink';
  flat?: boolean;
  tall?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cx('hero', `hero--${tone}`, flat && 'hero--flat', tall && 'hero--tall', className)}>
      {children}
    </section>
  );
}

/* ============ Panel — flat surface subdivided by hairlines ============ */

type PanelProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: 'paper' | 'bone' | 'pink' | 'soft' | 'ink';
  flush?: boolean;
  inset?: boolean;
  tap?: boolean;
};

export function Panel({ tone = 'paper', flush, inset = true, tap, className, children, ...rest }: PanelProps) {
  const cls = cx(
    'panel',
    tone !== 'paper' && `panel--${tone}`,
    flush && 'panel--flush',
    inset && !flush && 'panel--inset',
    tap && 'panel--tap',
    className
  );
  if (tap) {
    return (
      <button type="button" className={cls} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
        {children}
      </button>
    );
  }
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

export function Block({
  tight,
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { tight?: boolean }) {
  return (
    <div className={cx('panel__block', tight && 'panel__block--tight', className)} {...rest}>
      {children}
    </div>
  );
}

export const Rule = ({ style }: { style?: React.CSSProperties }) => <hr className="rule" style={style} />;

/** Overline heading that sits above a panel, in the page gutter. */
export const SectionLabel = ({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) => (
  <div className="sec overline" style={icon ? { display: 'flex', alignItems: 'center', gap: 8 } : undefined}>
    {icon}
    {children}
  </div>
);

/* ============ App bar ============ */

export function AppBar({
  onBack,
  action,
  onMenu,
  tone,
}: {
  onBack?: () => void;
  action?: React.ReactNode;
  onMenu?: () => void;
  tone?: 'dark' | 'pink';
}) {
  const btnTone = tone === 'dark' ? 'icon-btn--onDark' : tone === 'pink' ? 'icon-btn--onPink' : '';
  return (
    <div className="appbar">
      {onBack ? (
        <button className={cx('icon-btn', btnTone)} onClick={onBack} aria-label="Go back" type="button">
          <ChevronLeft />
        </button>
      ) : (
        <Mark size={32} variant={tone === 'dark' ? 'reversed' : tone === 'pink' ? 'onPink' : 'default'} />
      )}
      <span className="appbar__spacer" />
      {action}
      {onMenu && (
        <button className={cx('icon-btn', btnTone)} onClick={onMenu} aria-label="Menu" type="button">
          <Menu />
        </button>
      )}
    </div>
  );
}

/* ============ Pills and badges ============ */

export function Pill({
  tone = 'default',
  children,
}: {
  tone?: 'default' | 'pink' | 'soft' | 'amber' | 'coral' | 'ink' | 'onPink' | 'onDark';
  children: React.ReactNode;
}) {
  return <span className={cx('pill', tone !== 'default' && `pill--${tone}`)}>{children}</span>;
}

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'live' | 'upcoming' | 'ended' | 'neutral';
  children: React.ReactNode;
}) {
  return (
    <span className={cx('badge', `badge--${tone}`)}>
      {tone === 'live' && <span className="badge-dot" />}
      {children}
    </span>
  );
}

export function StatusBadge({ startsAt, endsAt }: { startsAt?: string | null; endsAt?: string | null }) {
  const now = Date.now();
  const start = startsAt ? new Date(startsAt).getTime() : null;
  const end = endsAt ? new Date(endsAt).getTime() : null;
  if (end && now > end) return <Badge tone="ended">Ended</Badge>;
  if (start && now < start) return <Badge tone="upcoming">Upcoming</Badge>;
  if (start || end) return <Badge tone="live">Live</Badge>;
  return null;
}

/* ============ Money ============ */

export function formatAmount(value: number | string | null | undefined): string | null {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (n == null || Number.isNaN(n)) return null;
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function Money({
  value,
  size = 'md',
  signed,
  unit = 'USDC',
  chip,
  className,
  style,
}: {
  value: number | string | null | undefined;
  size?: 'hero' | 'lg' | 'md';
  signed?: boolean;
  unit?: string | null;
  /** Render the unit as a small chip beside the number, per the reference. */
  chip?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const amount = formatAmount(value);
  if (amount === null) return null;

  if (chip) {
    // The chip sits on the number's baseline, not its optical centre.
    return (
      <span className="row" style={{ gap: 10, alignItems: 'flex-end', ...style }}>
        <span className={cx('money', `money-${size}`, className)}>
          {signed ? '+' : ''}
          {amount}
        </span>
        {unit && <span className="unit-pill">{unit}</span>}
      </span>
    );
  }

  return (
    <span className={cx('money', `money-${size}`, className)} style={style}>
      {signed ? '+' : ''}
      {amount}
      {unit && <span className="money-unit"> {unit}</span>}
    </span>
  );
}

/* ============ Inputs ============ */

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      {label && <span className="label">{label}</span>}
      {children}
      {error ? (
        <span className="caption t-error">{error}</span>
      ) : (
        hint && <span className="caption t-subtle">{hint}</span>
      )}
    </div>
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(({ invalid, className, ...rest }, ref) => (
  <input ref={ref} className={cx('input', invalid && 'input--error', className)} {...rest} />
));
Input.displayName = 'Input';

export function Textarea({
  invalid,
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={cx('textarea', invalid && 'textarea--error', className)} {...rest} />;
}

export function UnitInput({ unit, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { unit: string }) {
  return (
    <div className="input-affix">
      <input className="input" inputMode="decimal" {...rest} />
      <span className="input-affix__unit">{unit}</span>
    </div>
  );
}

/* ============ Chips and toggle ============ */

export const ChipRow = ({ children }: { children: React.ReactNode }) => <div className="chip-row">{children}</div>;

export function Chip({ on, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { on?: boolean }) {
  return (
    <button type="button" className={cx('chip', on && 'chip--on')} {...rest}>
      {children}
    </button>
  );
}

export function Segment<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="segment" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)} type="button">
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ============ Icon action strip ============ */

export function IconStrip({
  items,
}: {
  items: { icon: React.ReactNode; label: string; onClick?: () => void }[];
}) {
  return (
    <div className="istrip">
      {items.map((it) => (
        <button key={it.label} type="button" onClick={it.onClick}>
          {it.icon}
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* ============ Data tiles ============ */

export function Tiles({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="tiles">
      {items.map((t) => (
        <div key={t.label}>
          <span className="t-label">{t.label}</span>
          <div className="t-value">{t.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ============ Progress, skeleton, empty ============ */

export function Progress({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className="progress__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Skeleton({ h = 16, w = '100%', r = 14 }: { h?: number; w?: number | string; r?: number }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r }} />;
}

export const CardSkeleton = ({ h = 150 }: { h?: number }) => <Skeleton h={h} r={28} />;

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon}</div>
      <h3 className="title-s">{title}</h3>
      {body && <p className="body-sm">{body}</p>}
      {action}
    </div>
  );
}

/* ============ Sheet and toast ============ */

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="backdrop" onClick={onClose} role="presentation">
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="sheet__grab" />
        {children}
      </div>
    </div>
  );
}

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  React.useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [message, onDone]);

  if (!message) return null;
  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
}

export function useToast() {
  const [message, setMessage] = React.useState<string | null>(null);
  const clear = React.useCallback(() => setMessage(null), []);
  return { message, show: setMessage, clear };
}

/* ============ Helpers ============ */

export const shortAddress = (addr?: string | null) =>
  addr && addr.length > 10 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr ?? '';

export function hasEnded(endsAt?: string | null): boolean {
  if (!endsAt) return false;
  const t = new Date(endsAt).getTime();
  return !Number.isNaN(t) && t <= Date.now();
}

export function timeLeft(endsAt?: string | null): string | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return null;
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `${days}d left`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours}h left`;
  return `${Math.max(1, Math.floor(ms / 60_000))}m left`;
}
