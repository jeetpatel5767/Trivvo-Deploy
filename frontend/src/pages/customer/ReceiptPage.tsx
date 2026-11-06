import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { getReceipt, getTimeline } from '../../lib/api';
import { AppBar, Block, Button, Panel, Skeleton, shortAddress } from '../../ui';

/** One proof link / value on a receipt line. */
interface Link { kind: string; label: string; url?: string; value?: string }
interface Line {
  type: string;
  wallet?: string | null;
  at?: string;
  hcsSequence?: number | null;
  links: Link[];
  detail?: Record<string, unknown>;
}

const TITLES: Record<string, string> = {
  hunt_funded: 'Hunt funded',
  human_verified: 'Human verified',
  arrival_paid: 'Arrival reward paid',
  photo_approved: 'Task photo approved',
  reward_paid: 'Main reward paid',
  stamp_sent: 'Stamp sent',
  hunt_withdrawn: 'Remaining funds withdrawn',
};

const when = (ts?: string) => {
  if (!ts) return '';
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

/**
 * F3 + G1 — the public receipt / trust trail for a hunt. No login.
 * Shows every money + trust moment with links to the proofs each sponsor leaves:
 * Hedera HCS message · World Chain tx · World ID human · 0G request id.
 * With ?wallet=0x… it also merges that hunter's personal steps (the G1 timeline).
 */
export default function ReceiptPage() {
  const { huntId } = useParams<{ huntId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const wallet = params.get('wallet') || '';

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [head, setHead] = useState<{ title?: string; businessName?: string; verifiedOnHedera?: number; topicId?: string | null }>({});
  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => {
    if (!huntId) return;
    let cancelled = false;
    const run = async () => {
      try {
        // The hunt-scoped trail is the base; a wallet adds that hunter's personal steps.
        const base = wallet ? getTimeline(huntId, wallet) : getReceipt(huntId);
        const { data } = await base;
        if (cancelled) return;
        if (wallet) {
          setLines(data.steps || []);
          // still grab the header (title / verified count) from the receipt endpoint
          try {
            const r = await getReceipt(huntId);
            if (!cancelled) setHead({ title: r.data.title, businessName: r.data.businessName, verifiedOnHedera: r.data.verifiedOnHedera, topicId: r.data.topicId });
          } catch { /* header is optional */ }
        } else {
          setHead({ title: data.title, businessName: data.businessName, verifiedOnHedera: data.verifiedOnHedera, topicId: data.topicId });
          setLines(data.lines || []);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        if ((err as { response?: { status?: number } })?.response?.status === 404) setNotFound(true);
        else setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [huntId, wallet]);

  if (notFound) {
    return (
      <div className="screen">
        <AppBar onBack={() => navigate('/hunts')} />
        <div className="pad" style={{ marginTop: 8 }}>
          <h1 className="title-l">No receipt for that hunt.</h1>
          <div style={{ marginTop: 24 }}>
            <Button variant="primary" size="lg" block onClick={() => navigate('/hunts')}>Browse hunts</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="hero hero--pink hero--tall" style={{ paddingTop: 0 }}>
        <AppBar tone="pink" onBack={() => navigate(-1)} />
        <span className="overline">{wallet ? 'Trust timeline' : 'Public receipt'}</span>
        <h1 style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.04, letterSpacing: '-0.04em', marginTop: 8 }}>
          {head.title || 'Hunt receipt'}
        </h1>
        {head.businessName && <p className="body-sm" style={{ marginTop: 8, opacity: 0.75 }}>{head.businessName}</p>}
        {wallet && <p className="caption mono" style={{ marginTop: 8, opacity: 0.7 }}>{shortAddress(wallet)}</p>}
        {typeof head.verifiedOnHedera === 'number' && head.verifiedOnHedera > 0 && (
          <span className="row" style={{ gap: 8, marginTop: 16, height: 36, padding: '0 16px', borderRadius: 999, background: 'rgba(16,35,28,0.12)', width: 'fit-content' }}>
            <ShieldCheck size={16} strokeWidth={2.4} />
            <span className="overline">{head.verifiedOnHedera} verified on Hedera</span>
          </span>
        )}
      </div>

      <section style={{ marginTop: 20 }}>
        {loading ? (
          <div className="stack-12 pad"><Skeleton h={80} r={20} /><Skeleton h={80} r={20} /></div>
        ) : lines.length === 0 ? (
          <div className="pad"><p className="body-sm t-muted">Nothing has happened on this hunt yet. Steps appear here as hunters check in and get paid.</p></div>
        ) : (
          <Panel>
            {lines.map((line, i) => (
              <Block key={i} tight>
                <div className="row-between">
                  <span className="body-sm" style={{ fontWeight: 700 }}>{TITLES[line.type] || line.type}</span>
                  {line.at && <span className="caption t-subtle">{when(line.at)}</span>}
                </div>
                {line.wallet && <p className="caption mono t-subtle" style={{ marginTop: 3 }}>{shortAddress(line.wallet)}</p>}
                {line.links.length > 0 && (
                  <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {line.links.map((l, j) =>
                      l.url ? (
                        <a
                          key={j}
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="row"
                          style={{ gap: 5, height: 30, padding: '0 11px', borderRadius: 999, background: 'var(--pink-soft)', fontSize: 12, fontWeight: 700 }}
                        >
                          {l.label}
                          {l.value ? <span className="mono t-subtle">{l.value}</span> : <ExternalLink size={12} strokeWidth={2.6} />}
                        </a>
                      ) : (
                        <span key={j} className="row" style={{ gap: 5, height: 30, padding: '0 11px', borderRadius: 999, background: 'var(--bone)', fontSize: 12, fontWeight: 700 }}>
                          {l.label}
                          {l.value && <span className="mono t-subtle">{l.value}</span>}
                        </span>
                      )
                    )}
                  </div>
                )}
              </Block>
            ))}
          </Panel>
        )}
      </section>

      {head.topicId && (
        <div className="pad" style={{ marginTop: 20 }}>
          <a
            className="row"
            href={`https://hashscan.io/testnet/topic/${head.topicId}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ gap: 6 }}
          >
            <span className="label">Open the Hedera topic on HashScan</span>
            <ExternalLink size={14} strokeWidth={2.4} />
          </a>
        </div>
      )}
    </div>
  );
}
