import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDisconnect, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { ArrowRight, ChevronRight, Copy, Pencil } from 'lucide-react';
import { getProfile } from '../../lib/api';
import { CONTRACTS, ERC20_ABI } from '../../lib/contracts';
import { useDemoAccount } from '../../lib/demoAccount';
import { deriveName, initials, storeName, storedName } from '../../lib/displayName';
import { badgesFor, progression } from '../../lib/progress';
import { TabBar } from '../../components/TabBar';
import { BadgeDisc } from '../../components/icons';
import { Icon, huntIconName } from '../../components/Icon';
import {
  AppBar,
  Button,
  EmptyState,
  Input,
  Money,
  Panel,
  Sheet,
  Skeleton,
  Toast,
  shortAddress,
  useToast,
} from '../../ui';

interface Activity {
  title: string;
  reward: string;
  timestamp?: string;
  status: string;
}

function when(ts?: string): string | null {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  const mins = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  if (mins < 10080) return `${Math.floor(mins / 1440)}d ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const BADGE_GLYPH: Record<string, string> = {
  'first-hunt': 'flag',
  'curious-mind': 'binoculars',
  'streak-starter': 'flame',
};

/** A section heading with an optional trailing action. */
function Heading({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="row-between pad" style={{ marginBottom: 12 }}>
      <span className="overline t-subtle">{children}</span>
      {action}
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { address, isConnected } = useDemoAccount();
  const { disconnect } = useDisconnect();
  const toast = useToast();

  const [stats, setStats] = useState({ huntsCompleted: 0, totalEarned: '0.00', currentStreak: 0 });
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState(() => storedName() || '');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const displayName = name || deriveName(address);

  const { data: usdcBalance } = useReadContract({
    address: CONTRACTS.USDC_TOKEN as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const balance = usdcBalance ? parseFloat(formatUnits(usdcBalance as bigint, 6)).toFixed(2) : '0.00';

  useEffect(() => {
    if (!address) return setLoading(false);
    getProfile(address)
      .then((res) => {
        setStats(res.data.stats);
        setActivity(res.data.recentActivity || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [address]);

  const copy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => toast.show('Wallet address copied'));
  };

  const saveName = () => {
    storeName(draft);
    setName(draft.trim());
    setEditing(false);
    toast.show(draft.trim() ? 'Name updated' : 'Name reset');
  };

  const spots = activity.length;
  const level = progression(stats);
  const badges = badgesFor(stats, spots);

  const figures = [
    { glyph: 'target', label: 'Hunts', value: stats.huntsCompleted },
    { glyph: 'flame', label: 'Day streak', value: stats.currentStreak },
    { glyph: 'pin', label: 'Spots found', value: spots },
  ];

  return (
    <>
      <div className="screen screen--tabbar">
        <AppBar
          action={
            <button
              type="button"
              onClick={() => {
                setDraft(name);
                setEditing(true);
              }}
              aria-label="Edit your name"
              style={{
                width: 52,
                height: 52,
                flex: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 999,
                background: 'var(--paper)',
                color: 'var(--ink)',
                fontSize: 17,
                fontWeight: 800,
              }}
            >
              {initials(displayName)}
            </button>
          }
        />

        {/* Identity, with the map sitting in the space beside it */}
        <div className="pad" style={{ position: 'relative' }}>
          <Icon
            name="map"
            set="objects"
            size={152}
            style={{ position: 'absolute', right: -6, top: 2, pointerEvents: 'none' }}
          />

          <div style={{ position: 'relative', maxWidth: 210 }}>
            <span className="overline t-subtle">Your profile</span>

            <button
              type="button"
              onClick={() => {
                setDraft(name);
                setEditing(true);
              }}
              className="row"
              style={{ gap: 8, marginTop: 6, background: 'none', padding: 0, maxWidth: '100%' }}
            >
              <h1 className="truncate" style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.04em' }}>
                {displayName}
              </h1>
              <Pencil size={15} strokeWidth={2.4} style={{ flex: 'none', opacity: 0.5 }} />
            </button>

            <button
              type="button"
              onClick={copy}
              className="row"
              style={{ gap: 7, marginTop: 6, background: 'none', padding: 0 }}
            >
              <span className="caption mono t-muted">{shortAddress(address) || 'Not connected'}</span>
              {address && <Copy size={13} strokeWidth={2.4} className="t-muted" />}
            </button>

            <span
              className="row"
              style={{
                gap: 8,
                marginTop: 14,
                height: 38,
                padding: '0 16px',
                borderRadius: 999,
                background: 'var(--pink-soft)',
                width: 'fit-content',
              }}
            >
              <Icon name="compass" set="objects" size={19} />
              <span className="overline">City explorer</span>
            </span>
          </div>
        </div>

        {/* Level and XP */}
        <Panel style={{ marginTop: 26 }}>
          <div style={{ padding: 20 }}>
            <div className="row-between">
              <span className="overline t-subtle">Your adventure</span>
              <span className="caption t-subtle tnum">{level.toNext} XP to next level</span>
            </div>

            <div className="row" style={{ gap: 10, marginTop: 10 }}>
              <span style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-0.035em' }}>{level.rank}</span>
              <span style={{ color: 'var(--pink)', fontSize: 18, lineHeight: 1 }}>•</span>
              <span style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-0.035em' }}>Level {level.level}</span>
            </div>

            <div className="row" style={{ gap: 14, marginTop: 16 }}>
              <div className="grow" style={{ height: 10, borderRadius: 999, background: 'var(--pink-soft)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.round(level.progress * 100)}%`,
                    background: 'var(--pink)',
                    borderRadius: 999,
                    transition: 'width 520ms cubic-bezier(0.16,1,0.3,1)',
                  }}
                />
              </div>
              <span className="caption tnum" style={{ flex: 'none' }}>
                <strong style={{ fontWeight: 800 }}>{level.xp}</strong>
                <span className="t-subtle"> / {level.nextAt} XP</span>
              </span>
            </div>
          </div>
        </Panel>

        {/* Three figures */}
        <Panel style={{ marginTop: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
            {figures.map(({ glyph, label, value }, i) => (
              <div
                key={label}
                style={{
                  padding: '18px 12px',
                  borderRight: i < figures.length - 1 ? '1px solid var(--line)' : 'none',
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 999,
                    background: 'var(--pink-soft)',
                    marginBottom: 10,
                  }}
                >
                  <Icon name={glyph} set="objects" size={21} />
                </span>
                <div
                  className="t-subtle"
                  style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}
                >
                  {label}
                </div>
                <div className="tnum" style={{ marginTop: 5, fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em' }}>
                  {loading ? '—' : value}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Activity */}
        <section style={{ marginTop: 30 }}>
          <Heading
            action={
              activity.length > 0 && (
                <button type="button" className="row" style={{ gap: 4, background: 'none', padding: 0 }}>
                  <span className="caption t-muted" style={{ fontWeight: 700 }}>
                    See all
                  </span>
                  <ChevronRight size={14} strokeWidth={2.6} className="t-muted" />
                </button>
              )
            }
          >
            Recent activity
          </Heading>

          {loading ? (
            <div className="stack-12 pad">
              <Skeleton h={74} r={28} />
              <Skeleton h={74} r={28} />
            </div>
          ) : activity.length === 0 ? (
            <EmptyState
              icon={<Icon name="pin" set="objects" size={26} />}
              title="No hunts yet"
              body="Your completed hunts and payouts show up here."
              action={
                <Button variant="ink" size="md" onClick={() => navigate('/hunts')}>
                  Find a hunt
                </Button>
              }
            />
          ) : (
            <Panel>
              {activity.slice(0, 3).map((a, i) => {
                const glyph = huntIconName(a.title);
                const ago = when(a.timestamp);
                return (
                  <div
                    key={i}
                    className="row"
                    style={{
                      gap: 12,
                      padding: '15px 16px',
                      borderBottom: i < Math.min(activity.length, 3) - 1 ? '1px solid var(--line)' : 'none',
                    }}
                  >
                    <span
                      style={{
                        width: 42,
                        height: 42,
                        flex: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 14,
                        background: 'var(--bone)',
                      }}
                    >
                      <Icon name={glyph} set="objects" size={26} />
                    </span>

                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="title-s truncate" style={{ fontSize: 16 }}>
                        {a.title}
                      </div>
                      <div className="row" style={{ gap: 6, marginTop: 3, whiteSpace: 'nowrap' }}>
                        <span
                          className="caption"
                          style={{ color: a.status === 'completed' ? 'var(--success)' : 'var(--warning)' }}
                        >
                          {a.status === 'completed' ? 'Completed' : 'In progress'}
                        </span>
                        {ago && (
                          <>
                            <span className="caption t-subtle">·</span>
                            <span className="caption t-subtle">{ago}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <span
                      className="row"
                      style={{
                        gap: 4,
                        flex: 'none',
                        height: 32,
                        padding: '0 11px',
                        borderRadius: 999,
                        background: 'var(--pink-soft)',
                      }}
                    >
                      <Money value={a.reward} size="md" signed unit={null} style={{ fontSize: 15 }} />
                      <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--ink-subtle)' }}>
                        USDC
                      </span>
                    </span>
                  </div>
                );
              })}
            </Panel>
          )}
        </section>

        {/* Earnings banner */}
        <div className="pad" style={{ marginTop: 20 }}>
          <div
            style={{
              background: 'var(--pink)',
              borderRadius: 'var(--r-xl)',
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <span
              style={{
                width: 52,
                height: 52,
                flex: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 999,
                background: 'var(--paper)',
              }}
            >
              <Icon name="coins" set="objects" size={28} />
            </span>

            <div className="grow" style={{ minWidth: 0 }}>
              <span className="overline">Total earned</span>
              <div style={{ marginTop: 3 }}>
                <Money value={stats.totalEarned} size="md" unit="USDC" style={{ fontSize: 21 }} />
              </div>
              <span className="caption truncate" style={{ opacity: 0.72, display: 'block', marginTop: 2 }}>
                {balance} in wallet now
              </span>
            </div>

            <button
              type="button"
              onClick={copy}
              className="row"
              style={{
                gap: 6,
                flex: 'none',
                height: 42,
                padding: '0 14px',
                borderRadius: 999,
                background: 'var(--paper)',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              Wallet
              <ArrowRight size={16} strokeWidth={2.6} />
            </button>
          </div>
        </div>

        {/* Badges */}
        <section style={{ marginTop: 30 }}>
          <Heading>Your badges</Heading>
          <div className="pad" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {badges.map((b, i) => (
              <div
                key={b.id}
                style={{
                  background: 'var(--paper)',
                  borderRadius: 'var(--r-lg)',
                  padding: '18px 8px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                  opacity: b.earned ? 1 : 0.4,
                }}
              >
                <BadgeDisc size={66} tone={i === 1 ? 'soft' : i === 2 ? 'soft' : 'pink'}>
                  <Icon name={BADGE_GLYPH[b.id]} set="objects" size={30} />
                </BadgeDisc>
                <span className="caption" style={{ fontWeight: 700, textAlign: 'center' }}>
                  {b.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {isConnected && (
          <div className="pad" style={{ marginTop: 28 }}>
            <Button
              variant="ghost"
              size="lg"
              block
              onClick={() => {
                disconnect();
                navigate('/login');
              }}
            >
              Disconnect
            </Button>
          </div>
        )}
      </div>

      <Sheet open={editing} onClose={() => setEditing(false)}>
        <span className="overline t-subtle">Your name</span>
        <div style={{ marginTop: 14 }}>
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={deriveName(address)}
            maxLength={24}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
          />
          <p className="caption t-subtle" style={{ marginTop: 10 }}>
            Shown only on this device. Leave it empty to go back to {deriveName(address)}.
          </p>
        </div>
        <div style={{ marginTop: 20 }}>
          <Button variant="ink" size="lg" block onClick={saveName}>
            Save
          </Button>
        </div>
      </Sheet>

      <Toast message={toast.message} onDone={toast.clear} />
      <TabBar />
    </>
  );
}
