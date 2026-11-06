import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReadContract } from 'wagmi';
import { switchChain, waitForTransactionReceipt, writeContract, getChainId } from 'wagmi/actions';
import { parseUnits, formatUnits, parseEventLogs } from 'viem';
import { Check } from 'lucide-react';
import { HUNT_ESCROW_ABI, ERC20_ABI, CONTRACTS } from '../../lib/contracts';
import { getHunt, fundHunt, OFFLINE } from '../../lib/api';
import { AddTokenButton } from '../../components/AddTokenButton';
import { useDemoAccount } from '../../lib/demoAccount';
import { config, APP_CHAIN } from '../../lib/wagmi';
import type { Hunt } from '../../lib/types';
import { AppBar, Block, Button, Field, Money, Panel, SectionLabel, Tiles, UnitInput } from '../../ui';
import { formatWindow, useNow } from '../../lib/time';
import { Icon } from '../../components/Icon';

type Step = 'input' | 'creating' | 'approving' | 'funding' | 'done';

const STEPS: { key: Step; label: string }[] = [
  { key: 'creating', label: 'Create the hunt' },
  { key: 'approving', label: 'Approve USDC' },
  { key: 'funding', label: 'Move funds to escrow' },
];

const ORDER: Step[] = ['input', 'creating', 'approving', 'funding', 'done'];

/**
 * The contract needs a start time still in the future when createHunt is mined, so the start is
 * "a moment from now": long enough to confirm the first wallet pop-up, short enough that the hunt is
 * open about when the three funding steps finish (they take ~10s on chain).
 */
const START_BUFFER_S = 30;

/** A hunt must stay open at least this long once it opens, or nobody can finish it. */
const MIN_RUN_S = 10 * 60;

/** Wallet errors are long; keep the first line, and say plainly when the user said no. */
const walletError = (err: unknown) => {
  const e = err as { shortMessage?: string; message?: string; response?: { data?: { error?: string } } } | null;
  const text = e?.shortMessage || e?.message || '';
  if (/reject|denied/i.test(text)) return 'You cancelled that in your wallet. Nothing was moved.';
  // The start-time buffer ran out while the wallet pop-up was open; nothing was funded.
  if (/start must be in future/i.test(text)) return 'That took a little long to confirm, so the start time passed. Press Fund again and confirm a bit quicker.';
  return (e?.response?.data?.error || text || 'That transaction did not go through.').split('\n')[0];
};

/**
 * Fund hunt — B4: create on chain -> approve USDC -> fund -> backend confirms on chain.
 * The escrow hunt id is read from the HuntCreated log (no guessing from nextHuntId).
 * While OFFLINE the steps are simulated, no wallet needed.
 */
export default function FundHuntPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { address } = useDemoAccount();
  const [amount, setAmount] = useState('50');
  const [step, setStep] = useState<Step>('input');
  const [error, setError] = useState('');
  const [hunt, setHunt] = useState<Hunt | null>(null);
  const now = useNow(30_000);

  useEffect(() => {
    if (id) getHunt(id).then((res) => setHunt(res.data.hunt)).catch(() => {});
  }, [id]);

  // The window the hunt will really get if funded right now (same rule as handleFund).
  const planStartS = hunt ? Math.max(Math.floor(new Date(hunt.start_time).getTime() / 1000) || 0, Math.floor(now / 1000) + START_BUFFER_S) : 0;
  const planEndS = hunt ? Math.floor(new Date(hunt.end_time).getTime() / 1000) || 0 : 0;
  const planWindow = hunt ? formatWindow(new Date(planStartS * 1000).toISOString(), new Date(planEndS * 1000).toISOString()) : null;
  const planTooShort = !!hunt && planEndS - planStartS < MIN_RUN_S;

  const { data: usdcBalance } = useReadContract({
    address: CONTRACTS.USDC_TOKEN as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: APP_CHAIN.id,
  });

  /* placeholder: walks the three steps on timers so the flow is viewable without a wallet. */
  const simulate = async () => {
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    setStep('creating');
    await wait(900);
    setStep('approving');
    await wait(900);
    setStep('funding');
    await wait(900);
    await fundHunt({ huntId: id, txHash: '0xdemo' }).catch(() => {});
    setStep('done');
  };

  const handleFund = async () => {
    setError('');
    const amountNum = parseFloat(amount);
    if (!(amountNum > 0)) return setError('Enter an amount above zero.');

    if (OFFLINE) return simulate();

    if (!hunt) return setError('We could not load that hunt.');
    if (!address) return setError('Connect your wallet first.');

    const perHunterNum = Number(hunt.arrival_reward) + Number(hunt.main_reward);
    if (amountNum < perHunterNum) return setError(`Stake at least ${perHunterNum} USDC so one hunter can finish.`);
    const bal = usdcBalance ? parseFloat(formatUnits(usdcBalance as bigint, 6)) : 0;
    if (bal < amountNum) return setError(`You have ${bal.toFixed(2)} USDC. Top up or lower the amount.`);

    const escrow = CONTRACTS.HUNT_ESCROW as `0x${string}`;
    const usdc = CONTRACTS.USDC_TOKEN as `0x${string}`;
    const value = parseUnits(amount, 6);
    const huntStartS = Math.floor(new Date(hunt.start_time).getTime() / 1000) || 0;
    // The end time is the vendor's own choice: never stretch it silently, just refuse a window that is too short.
    const end = Math.floor(new Date(hunt.end_time).getTime() / 1000) || 0;
    if (end - Math.max(huntStartS, Math.floor(Date.now() / 1000) + START_BUFFER_S) < MIN_RUN_S) {
      return setError('This hunt would close less than 10 minutes after it opens. Create it again with a later end time.');
    }
    const chainId = APP_CHAIN.id;

    try {
      if (getChainId(config) !== chainId) await switchChain(config, { chainId });

      // Stamp the start time only now, right before the wallet pop-up, so a network-switch prompt
      // (or anything above) doesn't eat into the buffer.
      const start = Math.max(huntStartS, Math.floor(Date.now() / 1000) + START_BUFFER_S);

      setStep('creating');
      const createHash = await writeContract(config, {
        chainId,
        address: escrow,
        abi: HUNT_ESCROW_ABI,
        functionName: 'createHunt',
        args: [usdc, parseUnits(String(hunt.arrival_reward), 6), parseUnits(String(hunt.main_reward), 6), BigInt(start), BigInt(end)],
      });
      const created = await waitForTransactionReceipt(config, { chainId, hash: createHash });
      const [log] = parseEventLogs({ abi: HUNT_ESCROW_ABI, eventName: 'HuntCreated', logs: created.logs });
      if (!log) throw new Error('The hunt was not created on chain.');
      const contractHuntId = log.args.huntId;

      setStep('approving');
      const approveHash = await writeContract(config, {
        chainId,
        address: usdc,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [escrow, value],
      });
      await waitForTransactionReceipt(config, { chainId, hash: approveHash });

      setStep('funding');
      const fundHash = await writeContract(config, {
        chainId,
        address: escrow,
        abi: HUNT_ESCROW_ABI,
        functionName: 'fundHunt',
        args: [contractHuntId, value],
      });
      await waitForTransactionReceipt(config, { chainId, hash: fundHash });

      // The backend reads this transaction from the chain before the hunt goes live.
      await fundHunt({ huntId: id, txHash: fundHash });
      setStep('done');
    } catch (err: unknown) {
      setError(walletError(err));
      setStep('input');
    }
  };

  const perHunter = Number(hunt?.arrival_reward ?? 0.5) + Number(hunt?.main_reward ?? 5);
  const covers = perHunter > 0 ? Math.floor((parseFloat(amount) || 0) / perHunter) : 0;
  const balance = usdcBalance ? parseFloat(formatUnits(usdcBalance as bigint, 6)).toFixed(2) : '0.00';
  const busy = step !== 'input' && step !== 'done';

  if (step === 'done') {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--pink)' }}>
        <div className="center" style={{ flex: 1, justifyContent: 'center', padding: '40px 20px' }}>
          <div className="check-mark">
            <Check size={36} strokeWidth={3} />
          </div>
          <span className="overline" style={{ marginTop: 28 }}>
            Funded
          </span>
          <div className="hero-amount" style={{ marginTop: 14 }}>
            <Money value={amount} size="hero" chip />
          </div>
          <p className="body" style={{ marginTop: 20, fontWeight: 600 }}>
            Your hunt is live. Rewards pay out as hunters check in.
          </p>
        </div>

        <div
          style={{
            background: 'var(--bone)',
            borderRadius: 'var(--r-xl) var(--r-xl) 0 0',
            padding: '28px 20px calc(28px + env(safe-area-inset-bottom))',
          }}
        >
          <div className="stack-12">
            <Button variant="ink" size="lg" block onClick={() => navigate(`/vendor/hunt-manage/${id}`)}>
              Manage this hunt
            </Button>
            <Button variant="ghost" size="md" block onClick={() => navigate('/vendor/dashboard')}>
              Back to overview
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="hero hero--soft" style={{ paddingTop: 0 }}>
        <AppBar onBack={() => navigate(-1)} tone="pink" />
        <span className="overline t-subtle">{hunt?.title ?? 'Your hunt'}</span>
        <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.045em', marginTop: 8 }}>
          Fund the escrow.
        </h1>
      </div>

      <Panel style={{ marginTop: 20 }}>
        <Tiles
          items={[
            { label: 'Per hunter', value: perHunter },
            { label: 'Your balance', value: balance },
          ]}
        />
        <Block tight>
          <AddTokenButton />
        </Block>
      </Panel>

      {planWindow && (
        <Panel style={{ marginTop: 14 }}>
          <Block>
            <span className="overline t-subtle">When it runs</span>
            <p className="body-sm" style={{ marginTop: 8, fontWeight: 600 }}>{planWindow}</p>
            <p className="caption t-subtle" style={{ marginTop: 6 }}>
              It opens about 30 seconds after you press Fund, because the contract needs a start time in the future.
            </p>
            {planTooShort && (
              <p className="caption" style={{ marginTop: 8, color: 'var(--error)' }}>
                That window is under 10 minutes, so it can&apos;t be funded. Create the hunt again with a later end time.
              </p>
            )}
          </Block>
        </Panel>
      )}

      <section style={{ marginTop: 28 }}>
        <SectionLabel icon={<Icon name="coins" set="objects" size={16} />}>Amount to stake</SectionLabel>
        <Panel>
          <Block>
            <Field
              hint={covers > 0 ? `Covers about ${covers} ${covers === 1 ? 'hunter' : 'hunters'}.` : undefined}
              error={error || undefined}
            >
              <UnitInput unit="USDC" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={busy} />
            </Field>
          </Block>
        </Panel>
      </section>

      {busy && (
        <section style={{ marginTop: 20 }}>
          <Panel>
            {STEPS.map((s) => {
              const done = ORDER.indexOf(step) > ORDER.indexOf(s.key);
              const current = step === s.key;
              return (
                <Block key={s.key} tight>
                  <div className="row">
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        flex: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 999,
                        background: done ? 'var(--pink)' : 'rgba(16,35,28,0.08)',
                      }}
                    >
                      {done && <Check size={13} strokeWidth={3} />}
                      {current && <span className="btn-spinner" style={{ width: 12, height: 12 }} />}
                    </span>
                    <span className="body-sm" style={{ opacity: done || current ? 1 : 0.45 }}>
                      {s.label}
                    </span>
                  </div>
                </Block>
              );
            })}
          </Panel>
        </section>
      )}

      <div className="pad" style={{ marginTop: 32 }}>
        <Button variant="ink" size="lg" block loading={busy} onClick={handleFund}>
          Approve and fund
        </Button>
      </div>
    </div>
  );
}
