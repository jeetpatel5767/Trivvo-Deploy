import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHunts } from '../../lib/api';
import { totalReward, type Hunt } from '../../lib/types';
import { VendorSidebar } from '../../components/VendorSidebar';
import { AppBar, Block, CardSkeleton, EmptyState, Money, Panel, SectionLabel, Tiles } from '../../ui';
import { Icon } from '../../components/Icon';

/** Analytics — ink hero with the headline number, hairline data below. */
export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [hunts, setHunts] = useState<Hunt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHunts()
      .then((res) => setHunts(res.data.hunts || []))
      .catch(() => setHunts([]))
      .finally(() => setLoading(false));
  }, []);

  const totals = useMemo(
    () =>
      hunts.reduce(
        (a, h) => ({
          views: a.views + Number(h.views ?? 0),
          scans: a.scans + Number(h.qr_scans ?? 0),
          participants: a.participants + Number(h.active_participants ?? 0),
          distributed: a.distributed + Number(h.rewards_distributed ?? 0),
        }),
        { views: 0, scans: 0, participants: 0, distributed: 0 }
      ),
    [hunts]
  );

  const maxScans = useMemo(() => Math.max(1, ...hunts.map((h) => Number(h.qr_scans ?? 0))), [hunts]);

  return (
    <>
      <div className="screen screen--tabbar">
        <div className="hero hero--ink hero--tall" style={{ paddingTop: 0 }}>
          <AppBar tone="dark" />
          <span className="overline" style={{ color: 'rgba(244,241,234,0.62)' }}>
            Paid out so far
          </span>
          <div style={{ marginTop: 12 }}>
            <Money value={totals.distributed} size="hero" chip />
          </div>
        </div>

        {loading ? (
          <div className="stack pad" style={{ marginTop: 24 }}>
            <CardSkeleton h={140} />
            <CardSkeleton h={180} />
          </div>
        ) : hunts.length === 0 ? (
          <EmptyState
            icon={<Icon name="bar-chart" set="objects" size={26} />}
            title="Nothing to measure yet"
            body="Create a hunt and your views, check-ins and payouts show up here."
          />
        ) : (
          <>
            <Panel style={{ marginTop: -16, position: 'relative' }}>
              <Tiles
                items={[
                  { label: 'Hunt views', value: totals.views },
                  { label: 'Check-ins', value: totals.scans },
                  { label: 'Active hunters', value: totals.participants },
                  { label: 'Per hunter', value: hunts.reduce((s, h) => s + totalReward(h), 0) },
                ]}
              />
            </Panel>

            <section style={{ marginTop: 32 }}>
              <SectionLabel icon={<Icon name="scan" set="objects" size={16} />}>Check-ins by hunt</SectionLabel>
              <Panel>
                {hunts.map((h) => {
                  const scans = Number(h.qr_scans ?? 0);
                  return (
                    <Block key={h.hunt_id} tight>
                      <div className="row-between">
                        <span className="body-sm truncate grow">{h.title}</span>
                        <span className="label tnum">{scans}</span>
                      </div>
                      <div
                        style={{
                          marginTop: 10,
                          height: 8,
                          borderRadius: 999,
                          background: 'rgba(16,35,28,0.08)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${(scans / maxScans) * 100}%`,
                            background: 'var(--pink)',
                            transition: 'width var(--dur-slow) var(--ease-out)',
                          }}
                        />
                      </div>
                    </Block>
                  );
                })}
              </Panel>
            </section>

            <section style={{ marginTop: 32 }}>
              <SectionLabel>Per hunt</SectionLabel>
              <Panel>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Hunt</th>
                      <th style={{ textAlign: 'right' }}>Views</th>
                      <th style={{ textAlign: 'right' }}>Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hunts.map((h) => (
                      <tr
                        key={h.hunt_id}
                        onClick={() => navigate(`/vendor/hunt-manage/${h.hunt_id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="truncate" style={{ maxWidth: 140 }}>
                          {h.title}
                        </td>
                        <td className="num">{Number(h.views ?? 0)}</td>
                        <td className="num">{Number(h.rewards_distributed ?? 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            </section>
          </>
        )}
      </div>
      <VendorSidebar />
    </>
  );
}
