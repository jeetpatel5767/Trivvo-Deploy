import { Icon } from '../../components/Icon';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CheckCircle2 } from 'lucide-react';
import { CONTRACTS, HUNT_ESCROW_ABI } from '../../lib/contracts';
import { getHunt, getParticipants, withdrawHunt, OFFLINE } from '../../lib/api';
import { totalReward, type Hunt, type Participant } from '../../lib/types';
import {
  AppBar,
  Block,
  Button,
  CardSkeleton,
  EmptyState,
  IconStrip,
  Money,
  Panel,
  SectionLabel,
  StatusBadge,
  Tiles,
  shortAddress,
  timeLeft,
} from '../../ui';
import { formatWindow, startsIn, useNow } from '../../lib/time';

/** Hunt manage — ink hero, flush data panels. */
export default function HuntManagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  useNow(30_000); // keeps "Starts in" / "left" and the status badge moving without a reload

  const { writeContract: withdrawOnChain, data: withdrawTx, error: chainError } = useWriteContract();
  const { isSuccess: withdrawDone } = useWaitForTransactionReceipt({ hash: withdrawTx });

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getHunt(id).catch(() => ({ data: { hunt: null } })),
      getParticipants(id).catch(() => ({ data: { participants: [] } })),
    ])
      .then(([h, p]) => {
        setHunt(h.data?.hunt);
        setParticipants(p.data?.participants || []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (withdrawDone && hunt?.hunt_id) {
      (async () => {
        try {
          await withdrawHunt(hunt.hunt_id, withdrawTx as string);
          setHunt((p) => (p ? { ...p, status: 'ended' } : p));
        } catch {
          setError('The funds came back, but we could not sync that to your dashboard.');
        } finally {
          setWithdrawing(false);
        }
      })();
    }
  }, [withdrawDone, hunt?.hunt_id, withdrawTx]);

  useEffect(() => {
    if (chainError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError((chainError as { shortMessage?: string }).shortMessage || chainError.message);
      setWithdrawing(false);
    }
  }, [chainError]);

  const handleWithdraw = async () => {
    setError('');
    setWithdrawing(true);

    // placeholder: simulated while OFFLINE so the action is viewable without a wallet.
    if (OFFLINE) {
      await withdrawHunt(id!, '0xdemo').catch(() => {});
      setHunt((p) => (p ? { ...p, status: 'ended' } : p));
      return setWithdrawing(false);
    }

    if (!hunt || hunt.contract_hunt_id == null) return setWithdrawing(false);
    withdrawOnChain({
      address: CONTRACTS.HUNT_ESCROW as `0x${string}`,
      abi: HUNT_ESCROW_ABI,
      functionName: 'withdrawRemaining',
      args: [BigInt(hunt.contract_hunt_id)],
    });
  };

  if (loading) {
    return (
      <div className="screen">
        <AppBar onBack={() => navigate('/vendor/dashboard')} />
        <div className="stack pad">
          <CardSkeleton h={200} />
          <CardSkeleton h={120} />
        </div>
      </div>
    );
  }

  if (!hunt) {
    return (
      <div className="screen">
        <AppBar onBack={() => navigate('/vendor/dashboard')} />
        <div className="pad">
          <h1 className="title-l">We could not load that hunt.</h1>
        </div>
      </div>
    );
  }

  const remaining = startsIn(hunt.start_time) ?? timeLeft(hunt.end_time);
  const runWindow = formatWindow(hunt.start_time, hunt.end_time);
  const paid = participants.filter((p) => p.reward_tx_hash).length;

  return (
    <div className="screen">
      <div className="hero hero--ink hero--tall" style={{ paddingTop: 0 }}>
        <AppBar tone="dark" onBack={() => navigate('/vendor/dashboard')} />

        <div className="row-between" style={{ marginTop: 8 }}>
          <StatusBadge startsAt={hunt.start_time} endsAt={hunt.end_time} status={hunt.status} />
          {remaining && (
            <span className="body-sm" style={{ color: 'rgba(244,241,234,0.62)' }}>
              {remaining}
            </span>
          )}
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.04, letterSpacing: '-0.04em', marginTop: 18 }}>
          {hunt.title}
        </h1>
        {runWindow && (
          <p className="body-sm" style={{ marginTop: 10, color: 'rgba(244,241,234,0.62)' }}>
            {runWindow}
          </p>
        )}

        <div style={{ marginTop: 28 }}>
          <span className="overline" style={{ color: 'rgba(244,241,234,0.62)' }}>
            Payout per hunter
          </span>
          <div style={{ marginTop: 10 }}>
            <Money value={totalReward(hunt)} size="hero" chip />
          </div>
        </div>
      </div>

      <Panel style={{ marginTop: -16, position: 'relative' }}>
        <Tiles
          items={[
            { label: 'Checked in', value: participants.length },
            { label: 'Paid out', value: paid },
          ]}
        />
        <Block tight style={{ padding: 0 }}>
          <IconStrip
            items={[
              { icon: <Icon name="scan" set="objects" size={22} />, label: 'QR code', onClick: () => navigate(`/vendor/qr/${hunt.hunt_id}`) },
              { icon: <Icon name="friends" set="objects" size={22} />, label: 'Hunters', onClick: () => navigate(`/vendor/participants/${hunt.hunt_id}`) },
              { icon: <CheckCircle2 strokeWidth={2.2} />, label: 'Review', onClick: () => navigate(`/vendor/reviews/${hunt.hunt_id}`) },
            ]}
          />
        </Block>
      </Panel>

      <section style={{ marginTop: 32 }}>
        <SectionLabel>Recent check-ins</SectionLabel>
        <Panel>
          {participants.length === 0 ? (
            <EmptyState icon={<Icon name="friends" set="objects" size={26} />} title="No one yet" body="Check-ins appear the moment someone scans your code." />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th style={{ textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {participants.slice(0, 5).map((p, i) => (
                  <tr key={p.participant_id || i}>
                    <td className="mono">{shortAddress(p.wallet_address)}</td>
                    <td className="num" style={{ color: p.reward_tx_hash ? 'var(--success)' : 'var(--warning)' }}>
                      {p.reward_tx_hash ? 'Paid' : 'Pending'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </section>

      {error && (
        <p className="caption t-error pad" style={{ marginTop: 16 }}>
          {error}
        </p>
      )}

      <div className="pad" style={{ marginTop: 32 }}>
        <Button variant="primary" size="lg" block loading={withdrawing} onClick={handleWithdraw}>
          Withdraw unclaimed funds
        </Button>
        <p className="caption t-subtle" style={{ textAlign: 'center', marginTop: 12 }}>
          Returns whatever is left in escrow once the hunt has ended.
        </p>
      </div>
    </div>
  );
}
