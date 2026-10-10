import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { Block, Money, Panel, StatusBadge, formatAmount, timeLeft } from '../ui';
import { totalReward, type Hunt } from '../lib/types';
import { Icon, huntIconName } from './Icon';

/* v3 is the chosen layout and the default. v1 and v2 are kept for reference and are
   still reachable by passing `variant` — delete them once v3 is settled for good. */

export type HuntCardVariant = 'v1' | 'v2' | 'v3';

export function HuntCard({ hunt, variant = 'v3' }: { hunt: Hunt; variant?: HuntCardVariant }) {
  if (variant === 'v1') return <HuntCardV1 hunt={hunt} />;
  if (variant === 'v2') return <HuntCardV2 hunt={hunt} />;
  return <HuntCardV3 hunt={hunt} />;
}

/* ============ v1 — header block above a hairline-divided data grid ============ */

function HuntCardV1({ hunt }: { hunt: Hunt }) {
  const navigate = useNavigate();
  const remaining = timeLeft(hunt.end_time);
  const place = [hunt.business_name, hunt.location_name].filter(Boolean).join(' · ');
  const hunters = hunt.active_participants;
  const showHunters = hunters != null && hunters > 0;

  return (
    <Panel tap inset={false} onClick={() => navigate(`/hunt/${hunt.hunt_id}`)}>
      <Block>
        <div className="row-between" style={{ marginBottom: 16 }}>
          <StatusBadge startsAt={hunt.start_time} endsAt={hunt.end_time} />
          {remaining && <span className="body-sm t-subtle">{remaining}</span>}
        </div>

        <h3 style={{ fontSize: 25, fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.08 }}>
          {hunt.title}
        </h3>

        {place && (
          <div className="row" style={{ gap: 6, marginTop: 12 }}>
            <MapPin size={14} strokeWidth={2.4} style={{ flex: 'none', color: 'var(--ink-subtle)' }} />
            <span className="body-sm t-muted truncate">{place}</span>
          </div>
        )}
      </Block>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: showHunters ? '1.45fr 1fr' : '1fr',
          borderTop: '1px solid var(--line)',
        }}
      >
        <div style={{ padding: '16px 20px' }}>
          <span className="overline t-subtle">Earn up to</span>
          <div style={{ marginTop: 10 }}>
            <Money value={totalReward(hunt)} size="lg" chip />
          </div>
        </div>

        {showHunters && (
          <div style={{ padding: '16px 20px', borderLeft: '1px solid var(--line)' }}>
            <span className="overline t-subtle">Hunters</span>
            <div
              className="tnum"
              style={{ marginTop: 10, fontSize: 26, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em' }}
            >
              {hunters}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

/* ============ v2 — fixed payout rail beside a flexible content column ============ */

function HuntCardV2({ hunt }: { hunt: Hunt }) {
  const navigate = useNavigate();
  const remaining = timeLeft(hunt.end_time);
  const place = [hunt.business_name, hunt.location_name].filter(Boolean).join(' · ');
  const hunters = hunt.active_participants;
  const showHunters = hunters != null && hunters > 0;

  return (
    <Panel tap inset={false} onClick={() => navigate(`/hunt/${hunt.hunt_id}`)}>
      <div style={{ display: 'grid', gridTemplateColumns: '116px 1fr' }}>
        <div style={{ borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 16px' }}>
            <span className="overline t-subtle">Earn</span>
            <div className="money" style={{ fontSize: 30, marginTop: 10, letterSpacing: '-0.04em' }}>
              {formatAmount(totalReward(hunt))}
            </div>
            <span
              className="t-subtle"
              style={{ display: 'block', marginTop: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}
            >
              USDC
            </span>
          </div>

          {showHunters && (
            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--line)', padding: '12px 16px' }}>
              <span className="tnum" style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em' }}>
                {hunters}
              </span>
              <span className="caption t-subtle" style={{ marginLeft: 5 }}>
                {hunters === 1 ? 'hunter' : 'hunters'}
              </span>
            </div>
          )}
        </div>

        <div style={{ padding: 18, minWidth: 0 }}>
          <div className="row-between" style={{ marginBottom: 14 }}>
            <StatusBadge startsAt={hunt.start_time} endsAt={hunt.end_time} />
            {remaining && <span className="caption t-subtle">{remaining}</span>}
          </div>

          <h3 style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.12 }}>
            {hunt.title}
          </h3>

          {place && (
            <div className="row" style={{ gap: 5, marginTop: 12 }}>
              <MapPin size={13} strokeWidth={2.4} style={{ flex: 'none', color: 'var(--ink-subtle)' }} />
              <span className="caption t-muted truncate">{place}</span>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

/* ============ v3 — the amount as masthead, meta collapsed to one inline run ============ */

function HuntCardV3({ hunt }: { hunt: Hunt }) {
  const navigate = useNavigate();
  const remaining = timeLeft(hunt.end_time);
  const hunters = hunt.active_participants;

  const meta = [
    hunt.location_name,
    hunters != null && hunters > 0 ? `${hunters} ${hunters === 1 ? 'hunter' : 'hunters'}` : null,
    remaining,
  ].filter(Boolean) as string[];

  return (
    <Panel tap inset={false} onClick={() => navigate(`/hunt/${hunt.hunt_id}`)}>
      <div style={{ padding: 20 }}>
        <div className="row-between">
          <div className="row" style={{ gap: 12, minWidth: 0 }}>
            <span
              style={{
                width: 48,
                height: 48,
                flex: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 15,
                background: 'var(--bone)',
              }}
            >
              <Icon name={huntIconName(hunt.title)} set="objects" size={27} />
            </span>
            <Money value={totalReward(hunt)} size="lg" style={{ fontSize: 38 }} />
          </div>
          <div style={{ flex: 'none' }}>
            <StatusBadge startsAt={hunt.start_time} endsAt={hunt.end_time} />
          </div>
        </div>

        <h3 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.2, marginTop: 18 }}>
          {hunt.title}
        </h3>

        {hunt.business_name && (
          <p className="body-sm t-muted" style={{ marginTop: 4 }}>
            {hunt.business_name}
          </p>
        )}

        {meta.length > 0 && (
          <>
            <hr className="rule" style={{ marginTop: 18, marginBottom: 14 }} />
            <div className="row" style={{ gap: 7, flexWrap: 'nowrap', minWidth: 0 }}>
              <MapPin size={13} strokeWidth={2.4} style={{ flex: 'none', color: 'var(--ink-subtle)' }} />
              {meta.map((part, i) => (
                <span key={part} className="row" style={{ gap: 7, minWidth: 0 }}>
                  {i > 0 && <span className="caption t-subtle">·</span>}
                  <span className="caption t-muted truncate">{part}</span>
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}
