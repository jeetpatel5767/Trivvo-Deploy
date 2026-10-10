import { useAccount } from 'wagmi';
import { OFFLINE } from './api';
import { DEMO_ADDRESS } from './demoData';

/* placeholder: while OFFLINE, every wallet-gated screen behaves as if a wallet
   is connected, so you can walk the whole app without MetaMask. Flip OFFLINE in
   api.ts back to false and this returns the real wagmi account untouched. */
export function useDemoAccount() {
  const real = useAccount();
  if (!OFFLINE) return real;
  return { ...real, address: real.address ?? DEMO_ADDRESS, isConnected: true };
}
