import { useNavigate } from 'react-router-dom';
import { AppBar, Block, Button, Panel, SectionLabel } from '../../ui';
import { Icon } from '../../components/Icon';

/**
 * C5: payouts are automatic now. The old "type a hunter's wallet and release the reward"
 * flow is gone — the server pays the main reward itself once every task photo is approved
 * (by 0G or by the vendor in the review queue). This screen now just explains that and
 * points to the review queue. The full queue UI lands in E2 (replaces this page).
 */
export default function VerifyTaskPage() {
  const navigate = useNavigate();

  return (
    <div className="screen">
      <div className="hero hero--soft" style={{ paddingTop: 0 }}>
        <AppBar onBack={() => navigate('/vendor/dashboard')} tone="pink" />
        <span className="overline t-subtle">Payouts are automatic</span>
        <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.045em', marginTop: 8 }}>
          You don&apos;t pay by hand.
        </h1>
      </div>

      <section style={{ marginTop: 24 }}>
        <SectionLabel icon={<Icon name="user" set="objects" size={16} />}>How a hunter gets paid</SectionLabel>
        <Panel>
          <Block>
            <p className="body-sm t-muted">
              Each task photo is checked by the AI. When every task passes, the reward is released to the hunter
              automatically — you never type a wallet or press pay.
            </p>
          </Block>
          <Block tight>
            <p className="body-sm t-muted">
              The only photos that need you are the ones the AI wasn&apos;t sure about. Approve those in the review
              queue and the hunter is paid the moment the last task clears.
            </p>
          </Block>
        </Panel>
      </section>

      <div className="pad" style={{ marginTop: 32 }}>
        <Button variant="ink" size="lg" block onClick={() => navigate('/vendor/dashboard')}>
          Back to overview
        </Button>
      </div>
    </div>
  );
}
