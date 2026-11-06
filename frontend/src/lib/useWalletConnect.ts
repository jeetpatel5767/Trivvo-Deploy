import { useConnect } from 'wagmi';
import { MiniKit } from '@worldcoin/minikit-js';

/**
 * One place that decides how we ask for a wallet: inside World App the hunter's World App
 * wallet (MiniKit, no extension needed); otherwise MetaMask if it is there, otherwise any
 * injected wallet. Used by the login screen and by the wallet route guard.
 */
export function useWalletConnect() {
  const { connect, connectors, isPending } = useConnect();
  const inWorldApp = MiniKit.isInWorldApp();

  const connectWallet = () => {
    const connector = inWorldApp
      ? connectors.find((c) => c.type === 'worldApp')
      : connectors.find((c) => c.id === 'metaMask') || connectors.find((c) => c.id === 'injected') || connectors[0];
    if (connector) connect({ connector });
  };

  return { connectWallet, isPending, inWorldApp };
}
