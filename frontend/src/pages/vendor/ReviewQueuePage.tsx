import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check, X, ShieldCheck } from 'lucide-react';
import { getReviews, decideReview } from '../../lib/api';
import { AppBar, Block, Button, EmptyState, Panel, Skeleton, shortAddress } from '../../ui';
import { Icon } from '../../components/Icon';

interface Review {
  id: string;
  wallet_address: string;
  task_index: number;
  task_title?: string;
  attempt: number;
  ai_match: boolean | null;
  ai_confidence: number | null;
  ai_reason: string | null;
  zg_request_id: string | null;
  model: string | null;
  image: string | null;
}

/**
 * E2 + D2 — vendor review queue. Photos the AI wasn't sure about (or 0G couldn't reach)
 * land here. Each card shows the photo, the task it was meant to prove, and the full 0G
 * verdict (reason · confidence · request id · model · TEE badge). Approve pays the hunter
 * automatically once their last task clears; reject sends them back to retake.
 */
export default function ReviewQueuePage() {
  const { id: huntId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!huntId) return;
    try {
      const { data } = await getReviews(huntId);
      setReviews(data.reviews || []);
    } catch (e: unknown) {
      const code = (e as { response?: { status?: number } })?.response?.status;
      setLoadError(code === 403 ? 'Only the business that created this hunt can review its photos.' : 'Could not load the review queue.');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [huntId]);

  const decide = async (id: string, decision: 'approve' | 'reject') => {
    if (busy) return;
    setBusy(id);
    try {
      await decideReview(id, decision);
      setReviews((prev) => (prev ?? []).filter((r) => r.id !== id));
    } catch {
      setLoadError('That decision did not save. Try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="screen">
      <div className="hero hero--ink hero--tall" style={{ paddingTop: 0 }}>
        <AppBar tone="dark" onBack={() => navigate(-1)} />
        <span className="overline" style={{ color: 'rgba(244,241,234,0.62)' }}>Needs your eyes</span>
        <h1 style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.04, letterSpacing: '-0.04em', marginTop: 8 }}>
          Review queue.
        </h1>
        <p className="body-sm" style={{ marginTop: 12, color: 'rgba(244,241,234,0.62)' }}>
          The AI sent these over because it wasn&apos;t sure. Approve to pay, reject to ask for a retake.
        </p>
      </div>

      <section style={{ marginTop: 20 }}>
        {reviews == null ? (
          <div className="stack-12 pad"><Skeleton h={220} r={20} /><Skeleton h={220} r={20} /></div>
        ) : loadError ? (
          <div className="pad">
            <p className="body-sm t-muted">{loadError}</p>
            <div style={{ marginTop: 12 }}>
              <Button variant="secondary" size="md" onClick={() => { setLoadError(''); void load(); }}>Try again</Button>
            </div>
          </div>
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={<Icon name="binoculars" set="objects" size={26} />}
            title="Nothing to review"
            body="When the AI is unsure about a photo, it shows up here for you to decide."
          />
        ) : (
          <div className="stack pad">
            {reviews.map((r) => (
              <Panel key={r.id}>
                {r.image && (
                  <img
                    src={r.image}
                    alt={`Proof for ${r.task_title || 'task'}`}
                    style={{ width: '100%', display: 'block', borderRadius: 'var(--r-lg) var(--r-lg) 0 0', maxHeight: 280, objectFit: 'cover' }}
                  />
                )}
                <Block>
                  <div className="row-between">
                    <span className="body-sm" style={{ fontWeight: 700 }}>{r.task_title || `Task ${r.task_index + 1}`}</span>
                    <span className="caption t-subtle mono">{shortAddress(r.wallet_address)}</span>
                  </div>

                  {/* D2 verdict card */}
                  <div style={{ marginTop: 12, background: 'var(--bone)', borderRadius: 'var(--r-md)', padding: 14 }}>
                    <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                      <span className="overline t-subtle">0G verdict</span>
                      {r.model && <span className="caption t-subtle">· {r.model}</span>}
                      <span className="row" style={{ gap: 4, marginLeft: 'auto', color: 'var(--ink)' }}>
                        <ShieldCheck size={13} strokeWidth={2.6} />
                        <span className="caption" style={{ fontWeight: 700 }}>TEE</span>
                      </span>
                    </div>
                    <p className="body-sm" style={{ marginTop: 8 }}>
                      {r.ai_reason || 'The AI could not read this photo and asked you to decide.'}
                    </p>
                    <div className="row" style={{ gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
                      {r.ai_confidence != null && (
                        <span className="caption t-subtle">Confidence {Math.round(r.ai_confidence * 100)}%</span>
                      )}
                      <span className="caption t-subtle">Attempt {r.attempt}</span>
                      {r.zg_request_id && <span className="caption t-subtle mono">0G {r.zg_request_id.slice(0, 18)}</span>}
                    </div>
                  </div>
                </Block>

                <Block tight>
                  <div className="row" style={{ gap: 10 }}>
                    <Button variant="ink" size="md" loading={busy === r.id} onClick={() => decide(r.id, 'approve')}>
                      <Check size={15} strokeWidth={2.6} /> Approve &amp; pay
                    </Button>
                    <Button variant="secondary" size="md" disabled={busy === r.id} onClick={() => decide(r.id, 'reject')}>
                      <X size={15} strokeWidth={2.6} /> Reject
                    </Button>
                  </div>
                </Block>
              </Panel>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
