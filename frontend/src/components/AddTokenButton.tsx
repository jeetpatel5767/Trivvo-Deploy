import { useState } from 'react';
import { useAccount, useSwitchChain, useWatchAsset } from 'wagmi';
import { PlusCircle } from 'lucide-react';
import { CONTRACTS } from '../lib/contracts';
import { APP_CHAIN } from '../lib/wagmi';

/**
 * MetaMask only lists tokens it has been told about, so a test USDC balance that the app
 * reads straight from the chain still looks like 0 in the wallet. This asks MetaMask to
 * add the token (the standard wallet_watchAsset request): one tap, one confirmation.
 * It switches the wallet to the app's chain first, so the token is added to the right network.
 */
export function AddTokenButton({ style }: { style?: React.CSSProperties }) {
  const { isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { watchAssetAsync } = useWatchAsset();
  const [state, setState] = useState<'idle' | 'busy' | 'added' | 'failed'>('idle');

  if (!isConnected) return null;

  const add = async () => {
    setState('busy');
    try {
      if (chainId !== APP_CHAIN.id) await switchChainAsync({ chainId: APP_CHAIN.id });
      const ok = await watchAssetAsync({
        type: 'ERC20',
        options: { address: CONTRACTS.USDC_TOKEN as `0x${string}`, symbol: 'USDC', decimals: 6 },
      });
      setState(ok ? 'added' : 'failed');
    } catch {
      setState('failed'); // the person closed the pop-up, or the wallet can't add tokens
    }
  };

  const label =
    state === 'busy' ? 'Opening MetaMask…'
      : state === 'added' ? 'USDC added to your wallet'
        : state === 'failed' ? 'Could not add it. Try again'
          : 'Show USDC in MetaMask';

  return (
    <button
      type="button"
      onClick={add}
      disabled={state === 'busy' || state === 'added'}
      className="row"
      style={{ gap: 6, background: 'none', padding: 0, fontWeight: 700, fontSize: 13, ...style }}
    >
      <PlusCircle size={15} strokeWidth={2.4} />
      <span>{label}</span>
    </button>
  );
}
