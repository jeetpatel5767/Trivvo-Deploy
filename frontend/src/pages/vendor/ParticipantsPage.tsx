import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getParticipants } from '../../lib/api';
import { DEMO_PARTICIPANTS } from '../../lib/demoData';
import type { Participant } from '../../lib/types';
import { AppBar, EmptyState, Panel, SectionLabel, Tiles, shortAddress } from '../../ui';
import { Icon } from '../../components/Icon';

const when = (ts?: unknown) => {
  if (typeof ts !== 'string') return '';
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/** Hunters — a flush table, hairline rows, no boxes. */
export default function ParticipantsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<Participant[]>(DEMO_PARTICIPANTS as unknown as Participant[]);

  useEffect(() => {
    if (!id) return;
    getParticipants(id)
      .then((res) => {
        if (res.data.participants?.length) setParticipants(res.data.participants);
      })
      .catch(() => {});
  }, [id]);

  const paid = participants.filter((p) => p.reward_tx_hash).length;

  return (
    <div className="screen">
      <div className="hero hero--soft" style={{ paddingTop: 0 }}>
        <AppBar onBack={() => navigate(`/vendor/hunt-manage/${id}`)} tone="pink" />
        <span className="overline t-subtle">This hunt</span>
        <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.045em', marginTop: 8 }}>
          Hunters.
        </h1>
      </div>

      <Panel style={{ marginTop: 20 }}>
        <Tiles
          items={[
            { label: 'Checked in', value: participants.length },
            { label: 'Paid out', value: paid },
          ]}
        />
      </Panel>

      <section style={{ marginTop: 28 }}>
        <SectionLabel icon={<Icon name="friends" set="objects" size={16} />}>Everyone so far</SectionLabel>
        <Panel>
          {participants.length === 0 ? (
            <EmptyState icon={<Icon name="friends" set="objects" size={26} />} title="No hunters yet" body="They show up as soon as someone scans your code." />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th>Joined</th>
                  <th style={{ textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p, i) => (
                  <tr key={p.participant_id || i}>
                    <td className="mono">{shortAddress(p.wallet_address)}</td>
                    <td className="t-muted">{when(p.arrival_time)}</td>
                    <td className="num" style={{ color: p.reward_tx_hash ? 'var(--success)' : 'var(--warning)' }}>
                      {p.reward_tx_hash ? 'Paid' : p.task_completed ? 'Ready' : 'Pending'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </section>
    </div>
  );
}
