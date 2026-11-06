import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getHunt } from '../../lib/api';
import type { Hunt } from '../../lib/types';
import { AppBar, Button } from '../../ui';

/**
 * C1: /h/:id?k=<secret> — the destination of the store QR.
 *
 * A phone camera opens this URL directly. We fetch the hunt, then forward into the
 * arrival flow (ScanPage) carrying the real QR secret from the link, so the hunter
 * never types or re-scans anything. If the link is missing its key, or the hunt is
 * gone, we show a plain recovery state instead of a fake check-in.
 */
export default function HuntEntryPage() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qrSecret = params.get('k') || '';

  // Validate the link up front so the effect never has to setState synchronously.
  const [error, setError] = useState<string | null>(() => {
    if (!id) return 'That link is missing its hunt.';
    if (!qrSecret) return 'That code is incomplete. Ask the shop for a fresh one.';
    return null;
  });

  useEffect(() => {
    if (!id || !qrSecret) return;
    let cancelled = false;
    getHunt(id)
      .then((res) => {
        if (cancelled) return;
        const hunt = res.data.hunt as Hunt;
        // Hand the scanned secret to the arrival flow; replace so Back skips this bridge.
        navigate('/scan', { replace: true, state: { hunt, qrSecret } });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err?.response?.status === 404
            ? 'We could not find that hunt. The code may be old.'
            : 'That hunt did not load. Check your connection and try again.'
        );
      });
    return () => {
      cancelled = true;
    };
  }, [id, qrSecret, navigate]);

  if (error) {
    return (
      <div className="screen">
        <AppBar onBack={() => navigate('/hunts')} />
        <div className="pad" style={{ marginTop: 8 }}>
          <h1 className="title-l">{error}</h1>
          <div style={{ marginTop: 24 }}>
            <Button variant="primary" size="lg" block onClick={() => navigate('/hunts')}>
              Browse hunts
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Brief bridge while the hunt loads, then we forward to /scan.
  return (
    <div className="screen">
      <AppBar onBack={() => navigate('/hunts')} />
      <div className="pad" style={{ marginTop: 8 }}>
        <span className="overline t-subtle">Opening hunt</span>
        <h1 className="title-l" style={{ marginTop: 8 }}>
          One moment…
        </h1>
      </div>
    </div>
  );
}
