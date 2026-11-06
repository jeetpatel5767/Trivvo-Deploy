import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Block, IconStrip, Money, Panel, StatusBadge, timeLeft } from '../ui';
import { totalReward, type Hunt } from '../lib/types';
import { Icon, huntIconName } from './Icon';

/**
 * Vendor hunt card.
 *
 * A vendor is not shopping, they are running something — so this answers the three
 * questions a hunt owner actually has, in order:
 *   what is it and is it still running   → header
 *   what has it cost me                  → payout block
 *   is it working                        → the funnel
 * The funnel is the point of the card: views, check-ins and joins drawn to the same
 * scale make the drop-off between them legible at a glance, which a row of equal
 * tiles cannot show. Every figure is a real column; the whole block is dropped when
 * a hunt has no traffic yet rather than drawing empty bars.
 */
export function VendorHuntCard({ hunt }: { hunt: Hunt }) {
  const navigate = useNavigate();
  const remaining = timeLeft(hunt.end_time);

  const views = Number(hunt.views ?? 0);
  const scans = Number(hunt.qr_scans ?? 0);
  const joined = Number(hunt.active_participants ?? 0);
  const paid = Number(hunt.rewards_distributed ?? 0);

  const funnel = [
    { label: 'Views', value: views },
    { label: 'Check-ins', value: scans },
    { label: 'Joined', value: joined },
  ];
  const peak = Math.max(views, scans, joined);
  const showFunnel = peak > 0;
  const conversion = views > 0 ? Math.round((scans / views) * 100) : null;

  return (
    <Panel inset={false}>
      {/* Header — glyph, status, name */}
      <Block>
        <div className="row" style={{ gap: 13, alignItems: 'flex-start' }}>
          <span
            style={{
              width: 46,
              height: 46,
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 14,
              background: 'var(--bone)',
            }}
          >
            <Icon name={huntIconName(hunt.title)} set="objects" size={26} />
          </span>

          <div className="grow" style={{ minWidth: 0 }}>
            <div className="row-between">
              <StatusBadge startsAt={hunt.start_time} endsAt={hunt.end_time} />
              {remaining && <span className="caption t-subtle">{remaining}</span>}
            </div>
            <h3
              style={{
                fontSize: 19,
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                marginTop: 9,
              }}
            >
              {hunt.title}
            </h3>
          </div>
        </div>
      </Block>

      {/* What it has cost */}
      <Block tight>
        <div className="row-between" style={{ alignItems: 'flex-end' }}>
          <div>
            <span className="overline t-subtle">Paid out</span>
            <div style={{ marginTop: 8 }}>
              <Money value={paid} size="lg" chip />
            </div>
          </div>
          <span
            className="row"
            style={{
              gap: 5,
              flex: 'none',
              height: 30,
              padding: '0 11px',
              borderRadius: 999,
              background: 'var(--pink-soft)',
            }}
          >
            <Money value={totalReward(hunt)} size="md" unit={null} style={{ fontSize: 14 }} />
            <span className="caption t-subtle" style={{ fontWeight: 600 }}>
              per hunter
            </span>
          </span>
        </div>
      </Block>

      {/* Is it working */}
      {showFunnel && (
        <Block tight>
          <div className="stack-8">
            {funnel.map((f) => (
              <div key={f.label}>
                <div className="row-between" style={{ marginBottom: 5 }}>
                  <span className="caption t-muted">{f.label}</span>
                  <span className="caption tnum" style={{ fontWeight: 800 }}>
                    {f.value}
                  </span>
                </div>
                <div style={{ height: 7, borderRadius: 999, background: 'var(--bone)', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${peak > 0 ? Math.max(3, (f.value / peak) * 100) : 0}%`,
                      borderRadius: 999,
                      background: 'var(--pink)',
                      transition: 'width 520ms cubic-bezier(0.16,1,0.3,1)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {conversion !== null && (
            <p className="caption t-subtle" style={{ marginTop: 12 }}>
              {conversion}% of views checked in
            </p>
          )}
        </Block>
      )}

      <Block tight style={{ padding: 0 }}>
        <IconStrip
          items={[
            {
              icon: <Icon name="scan" set="objects" size={22} />,
              label: 'QR code',
              onClick: () => navigate(`/vendor/qr/${hunt.hunt_id}`),
            },
            {
              icon: <Icon name="friends" set="objects" size={22} />,
              label: 'Hunters',
              onClick: () => navigate(`/vendor/participants/${hunt.hunt_id}`),
            },
            {
              icon: <CheckCircle2 strokeWidth={2.2} />,
              label: 'Manage',
              onClick: () => navigate(`/vendor/hunt-manage/${hunt.hunt_id}`),
            },
          ]}
        />
      </Block>
    </Panel>
  );
}
