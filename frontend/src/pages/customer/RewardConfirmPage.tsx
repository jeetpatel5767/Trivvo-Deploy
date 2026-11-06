import { useNavigate, useLocation } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { RewardMoment } from '../../components/RewardMoment';
import { Block, Button, Panel, shortAddress } from '../../ui';

/** Final payout — same construction as the arrival screen: pink hero, overlapping card. */
export default function RewardConfirmPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as any) ?? {};

  // placeholder: demo values when the screen is opened directly.
  const amount = Number(state.mainReward ?? 5) || 0;
  const txHash = state.txHash ?? '0xdemo123456789abcdef';
  const explorerUrl = state.explorerUrl ?? `https://snowtrace.io/tx/${txHash}`;

  return (
    <div className="screen" style={{ paddingBottom: 32, display: 'flex', flexDirection: 'column' }}>
      <div className="hero hero--pink" style={{ paddingTop: 76, paddingBottom: 92 }}>
        <RewardMoment
          overline="Verified and paid"
          amount={amount}
          subline={
            state.businessName ? `Sent to your wallet by ${state.businessName}` : 'Sent to your wallet'
          }
        />
      </div>

      {/* White card lifted over the hero's rounded foot */}
      <Panel style={{ marginTop: -18, position: 'relative' }}>
        <Block tight>
          <div className="row-between">
            <span className="body-sm t-muted">Receipt</span>
            <span className="body-sm mono">{shortAddress(txHash)}</span>
          </div>
        </Block>
        <Block tight>
          <a className="row" href={explorerUrl} target="_blank" rel="noopener noreferrer" style={{ gap: 6 }}>
            <span className="label">View on Snowtrace</span>
            <ExternalLink size={14} strokeWidth={2.4} />
          </a>
        </Block>
      </Panel>

      {/* Pinned to the foot of the screen */}
      <div className="pad stack-12" style={{ marginTop: 'auto', paddingTop: 24 }}>
        <Button variant="ink" size="lg" block onClick={() => navigate('/hunts')}>
          Find another hunt
        </Button>
        <Button variant="ghost" size="md" block onClick={() => navigate('/profile')}>
          See your earnings
        </Button>
      </div>
    </div>
  );
}
