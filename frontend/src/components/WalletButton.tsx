import { useConnect, useDisconnect } from 'wagmi';
import { useDemoAccount } from '../lib/demoAccount';
import { Button, shortAddress } from '../ui';

export function WalletButton({ size = 'sm' }: { size?: 'lg' | 'md' | 'sm' }) {
  const { address, isConnected } = useDemoAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (!isConnected) {
    return (
      <Button
        variant="primary"
        size={size}
        loading={isPending}
        onClick={() => {
          const connector =
            connectors.find((c) => c.id === 'metaMask') ||
            connectors.find((c) => c.id === 'injected') ||
            connectors[0];
          if (connector) connect({ connector });
        }}
      >
        Connect wallet
      </Button>
    );
  }

  return (
    <Button variant="secondary" size={size} className="mono" onClick={() => disconnect()}>
      {shortAddress(address)}
    </Button>
  );
}
