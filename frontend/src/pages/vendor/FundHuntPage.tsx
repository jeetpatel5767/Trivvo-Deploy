import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { Check } from 'lucide-react';
import { HUNT_ESCROW_ABI, ERC20_ABI, CONTRACTS } from '../../lib/contracts';
import { getHunt, fundHunt, OFFLINE } from '../../lib/api';
import { useDemoAccount } from '../../lib/demoAccount';
import type { Hunt } from '../../lib/types';
import { AppBar, Block, Button, Field, Money, Panel, SectionLabel, Tiles, UnitInput } from '../../ui';
import { Icon } from '../../components/Icon';

type Step = 'input' | 'creating' | 'approving' | 'funding' | 'done';

const STEPS: { key: Step; label: string }[] = [
  { key: 'creating', label: 'Create the hunt' },
  { key: 'approving', label: 'Approve USDC' },
  { key: 'funding', label: 'Move funds to escrow' },
];

const ORDER: Step[] = ['input', 'creating', 'approving', 'funding', 'done'];

/** Fund hunt — two-step approve + fund. While OFFLINE the steps are simulated, no wallet needed. */
export default function FundHuntPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { address } = useDemoAccount();
  const [amount, setAmount] = useState('50');
  const [step, setStep] = useState<Step>('input');
  const [error, setError] = useState('');
  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [contractHuntId, setContractHuntId] = useState<bigint | null>(null);

  useEffect(() => {
    if (id) getHunt(id).then((res) => setHunt(res.data.hunt)).catch(() => {});
  }, [id]);

  const { data: usdcBalance } = useReadContract({
    address: CONTRACTS.USDC_TOKEN as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: nextHuntId } = useReadContract({
    address: CONTRACTS.HUNT_ESCROW as `0x${string}`,
    abi: HUNT_ESCROW_ABI,
    functionName: 'nextHuntId',
  });

  const { writeContract: createOnChain, data: createTx } = useWriteContract();
  const { isSuccess: createDone } = useWaitForTransactionReceipt({ hash: createTx });

  const { writeContract: approveUSDC, data: approveTx } = useWriteContract();
  const { isSuccess: approveDone } = useWaitForTransactionReceipt({ hash: approveTx });

  const { writeContract: fundOnChain, data: fundTx } = useWriteContract();
  const { isSuccess: fundDone } = useWaitForTransactionReceipt({ hash: fundTx });

  useEffect(() => {
    if (createDone && step === 'creating') {
      setStep('approving');
      approveUSDC({
        address: CONTRACTS.USDC_TOKEN as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.HUNT_ESCROW as `0x${string}`, parseUnits(amount, 6)],
      });
    }

  }, [createDone, step]);

  useEffect(() => {
    if (approveDone && step === 'approving') {
      setStep('funding');
      fundOnChain({
        address: CONTRACTS.HUNT_ESCROW as `0x${string}`,
        abi: HUNT_ESCROW_ABI,
        functionName: 'fundHunt',
        args: [contractHuntId ?? BigInt(0), parseUnits(amount, 6)],
      });
    }

  }, [approveDone, step]);

  useEffect(() => {
    if (fundDone && step === 'funding') {
      (async () => {
        try {
          await fundHunt({ huntId: id, contractHuntId: Number(contractHuntId), txHash: fundTx });
          setStep('done');
        } catch {
          setError('The funds moved, but we could not sync that to your dashboard.');
        }
      })();
    }
  }, [fundDone, step, id, contractHuntId, fundTx]);

  /* placeholder: walks the three steps on timers so the flow is viewable without a wallet. */
  const simulate = async () => {
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    setStep('creating');
    await wait(900);
    setStep('approving');
    await wait(900);
    setStep('funding');
    await wait(900);
    await fundHunt({ huntId: id, contractHuntId: 0, txHash: '0xdemo' }).catch(() => {});
    setStep('done');
  };

  const handleFund = async () => {
    setError('');
    const amountNum = parseFloat(amount);
    if (!(amountNum > 0)) return setError('Enter an amount above zero.');

    if (OFFLINE) return simulate();

    if (!hunt) return setError('We could not load that hunt.');
    if (!address) return setError('Connect your wallet first.');

    const bal = usdcBalance ? parseFloat(formatUnits(usdcBalance as bigint, 6)) : 0;
    if (bal < amountNum) return setError(`You have ${bal.toFixed(2)} USDC. Top up or lower the amount.`);

    setContractHuntId((nextHuntId as bigint) || BigInt(0));
    setStep('creating');

    const now = Math.floor(Date.now() / 1000);
    const start = hunt.start_time ? Math.floor(new Date(hunt.start_time).getTime() / 1000) : now - 60;
    const end = hunt.end_time
      ? Math.max(Math.floor(new Date(hunt.end_time).getTime() / 1000), start + 3600)
      : start + 30 * 86400;

    try {
      createOnChain({
        address: CONTRACTS.HUNT_ESCROW as `0x${string}`,
        abi: HUNT_ESCROW_ABI,
        functionName: 'createHunt',
        args: [
          CONTRACTS.USDC_TOKEN as `0x${string}`,
          parseUnits(String(hunt.arrival_reward || '0.5'), 6),
          parseUnits(String(hunt.main_reward || '5'), 6),
          BigInt(start),
          BigInt(end),
        ],
      });
    } catch (err: any) {
      setError(err?.message || 'That transaction did not go through.');
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
      </Panel>

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
