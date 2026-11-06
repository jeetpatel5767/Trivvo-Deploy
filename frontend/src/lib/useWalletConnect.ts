import { useConnect } from 'wagmi';

/**
 * One place that decides how we ask the browser wallet to connect: MetaMask if it is
 * there, otherwise any injected wallet, otherwise the first connector wagmi knows.
 * Used by the login screen (hunter and business) and by the vendor route guard.
 */
export function useWalletConnect() {
  const { connect, connectors, isPending } = useConnect();

  const connectWallet = () => {
    const connector =
      connectors.find((c) => c.id === 'metaMask') ||
      connectors.find((c) => c.id === 'injected') ||
      connectors[0];
    if (connector) connect({ connector });
  };

  return { connectWallet, isPending };
}
