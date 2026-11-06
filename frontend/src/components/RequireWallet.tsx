import { useNavigate } from 'react-router-dom';
import { useDemoAccount } from '../lib/demoAccount';
import { useWalletConnect } from '../lib/useWalletConnect';
import { AppBar, Button, Skeleton } from '../ui';

/**
 * Guards the business screens. Without a connected wallet they used to open empty,
 * and actions like "Create hunt" had no address to act on. Now the screen asks for the
 * wallet first, so a refresh or a direct link can never skip the connection.
 */
export function RequireWallet({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { isConnected, status } = useDemoAccount();
  const { connectWallet, isPending } = useWalletConnect();

  // wagmi restores a previous session on page load; don't flash the prompt while it does.
  if (status === 'connecting' || status === 'reconnecting') {
    return (
      <div className="screen">
        <div className="stack pad" style={{ marginTop: 24 }}>
          <Skeleton h={120} r={28} />
        </div>
      </div>
    );
  }

  if (isConnected) return <>{children}</>;

  return (
    <div className="screen">
      <AppBar onBack={() => navigate('/login')} />
      <div className="pad" style={{ marginTop: 8 }}>
        <span className="overline t-subtle">For businesses</span>
        <h1 className="title-l" style={{ marginTop: 8 }}>
          Connect your wallet.
        </h1>
        <p className="body t-muted" style={{ marginTop: 14 }}>
          Your wallet is how you sign in, fund hunts and get your unspent rewards back. Pick the account you want to run
          your hunts from in MetaMask first.
        </p>
        <div style={{ marginTop: 28 }}>
          <Button variant="ink" size="lg" block loading={isPending} onClick={connectWallet}>
            Connect wallet
          </Button>
        </div>
      </div>
    </div>
  );
}
