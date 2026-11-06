import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ImageUp } from 'lucide-react';
import { getHunt } from '../../lib/api';
import { decodeQrFromImage } from '../../lib/qrImage';
import { totalReward, type Hunt } from '../../lib/types';
import { AppBar, Button, Money } from '../../ui';
import { TabBar } from '../../components/TabBar';

/** The store QR encodes a URL: <origin>/h/:id?k=<secret>. Pull the id + secret out of it. */
function parseHuntCode(raw: string): { huntId: string; qrSecret: string } | null {
  const text = raw.trim();
  try {
    const url = new URL(text);
    const m = url.pathname.match(/\/h\/([^/]+)/);
    const k = url.searchParams.get('k');
    if (m && k) return { huntId: decodeURIComponent(m[1]), qrSecret: k };
  } catch {
    // Not a URL — fall through to the legacy "id:secret" form.
  }
  const colon = text.indexOf(':');
  if (colon > 0 && !text.startsWith('http')) {
    return { huntId: text.slice(0, colon), qrSecret: text.slice(colon + 1) };
  }
  return null;
}

interface DetectorLike {
  detect: (src: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
}
type DetectorCtor = new (opts?: { formats: string[] }) => DetectorLike;
/** BarcodeDetector is not in the DOM lib types; read it off window when present. */
const getBarcodeDetector = (): DetectorCtor | undefined =>
  (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;

/** Pink corner brackets and a sweep line over the live camera feed (dark field fallback). */
function Reticle({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> }) {
  const b: React.CSSProperties = {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: 'var(--pink)',
    borderStyle: 'solid',
    borderWidth: 0,
  };
  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: '1 / 0.84',
        width: '100%',
        borderRadius: 'var(--r-xl)',
        background: 'var(--ink-lifted)',
        overflow: 'hidden',
      }}
    >
      <video
        ref={videoRef}
        playsInline
        muted
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <span style={{ ...b, top: 20, left: 20, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12 }} />
      <span style={{ ...b, top: 20, right: 20, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12 }} />
      <span style={{ ...b, bottom: 20, left: 20, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 12 }} />
      <span style={{ ...b, bottom: 20, right: 20, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 12 }} />
      <span
        style={{
          position: 'absolute',
          left: 20,
          right: 20,
          height: 2,
          background: 'var(--pink)',
          animation: 'sweep 2.4s var(--ease-out) infinite',
        }}
      />
      <style>{`@keyframes sweep { 0%,100% { top: 20%; } 50% { top: 80%; } }`}</style>
    </div>
  );
}

/**
 * Scan — C1.
 *
 * Two ways in:
 *  - Opened from the store QR (/h/:id?k=…): a qrSecret arrives in route state, so we
 *    check in straight away, no camera needed.
 *  - Opened in-app ("Scan QR to start"): we open the camera and read the code with the
 *    browser's BarcodeDetector where it exists; otherwise we tell the hunter to use
 *    their phone's own camera on the code.
 */
export default function ScanPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateHunt = location.state?.hunt as Hunt | undefined;
  const stateSecret = location.state?.qrSecret as string | undefined;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const busyRef = useRef(false);

  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');
  // Capability note is decided once, up front, so the camera effect never has to setState for it.
  const [cameraNote, setCameraNote] = useState(() => {
    if (stateSecret) return ''; // arriving from the QR link — no in-app camera needed
    if (!getBarcodeDetector()) return 'This browser cannot scan with the camera. Upload a picture of the code below, or point your phone camera at it.';
    if (!navigator.mediaDevices?.getUserMedia) return 'No camera available here. Upload a picture of the code below, or point your phone camera at it.';
    return '';
  });
  const [reading, setReading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  /**
   * C2: the code only identifies the hunt. We resolve the hunt and hand it, with the
   * scanned secret, to the arrival flow — which runs the correct order there
   * (location -> World verify -> backend pays arrival -> reward). No payout happens here.
   */
  const proceed = async (huntId: string, qrSecret: string, hunt?: Hunt) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setResolving(true);
    setError('');
    stopCamera();

    try {
      const resolved = hunt ?? (await getHunt(huntId)).data.hunt;
      navigate('/arrival-reward', { state: { hunt: resolved, qrSecret } });
    } catch {
      setError('That hunt did not load. Check your connection and try again.');
      busyRef.current = false;
      setResolving(false);
    }
  };

  /**
   * Desktop path: read the code out of a saved picture (screenshot or photo) instead of the
   * live camera. The code inside decides the hunt, exactly like a camera scan would.
   */
  const onPickImage = async (file: File) => {
    if (busyRef.current) return;
    setError('');
    setReading(true);
    try {
      const text = await decodeQrFromImage(file);
      if (!text) {
        setError("We couldn't find a QR code in that picture. Try a closer screenshot of just the code.");
        return;
      }
      const hit = parseHuntCode(text);
      if (!hit) {
        setError("That QR code isn't a Tr!vvo hunt code.");
        return;
      }
      await proceed(hit.huntId, hit.qrSecret);
    } catch {
      setError('We could not read that picture. Try a PNG or JPG screenshot.');
    } finally {
      setReading(false);
    }
  };

  // Path 1: came from the store QR with the hunt already in hand — go straight through.
  useEffect(() => {
    if (stateHunt && stateSecret) {
      // Resolving + forwarding on mount; proceed manages its own state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void proceed(stateHunt.hunt_id, stateSecret, stateHunt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Path 2: in-app scanning — open the camera and watch for a Tr!vvo code.
  useEffect(() => {
    if (stateSecret) return; // Path 1 handles it; no camera needed.
    const Detector = getBarcodeDetector();
    // Capability already reported via the cameraNote initializer; nothing to start here.
    if (!Detector || !navigator.mediaDevices?.getUserMedia) return;

    let cancelled = false;
    const detector = new Detector({ formats: ['qr_code'] });

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => {});

        const tick = async () => {
          if (cancelled || busyRef.current) return;
          try {
            const codes = await detector.detect(video);
            const hit = codes.map((c) => parseHuntCode(c.rawValue)).find(Boolean);
            if (hit) {
              void proceed(hit.huntId, hit.qrSecret);
              return;
            }
          } catch {
            // transient decode errors — keep scanning
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch(() => {
        if (!cancelled) setCameraNote('Camera permission is off. Point your phone camera at the code instead.');
      });

    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The hunt we show payout for: the one from state, else nothing meaningful yet.
  const hunt = stateHunt;

  return (
    <>
      <div className="screen screen--tabbar">
        <AppBar
          tone="dark"
          onBack={() => {
            stopCamera();
            navigate(-1);
          }}
          action={
            hunt?.business_name && (
              <span
                className="pill pill--onDark truncate"
                style={{ maxWidth: 190, height: 44, padding: '0 18px', fontSize: 13 }}
              >
                {hunt.business_name}
              </span>
            )
          }
        />

        <div className="pad" style={{ marginTop: 4 }}>
          <h1 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.04, letterSpacing: '-0.04em' }}>
            Point at the
            <br />
            code in store.
          </h1>
        </div>

        <div className="pad" style={{ marginTop: 28 }}>
          <Reticle videoRef={videoRef} />
          {cameraNote && (
            <p className="body-sm" style={{ color: 'rgba(244,241,234,0.7)', marginTop: 14, textAlign: 'center' }}>
              {cameraNote}
            </p>
          )}

          {/* Desktop: read the code from a saved screenshot or photo instead of the camera. */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPickImage(f);
              e.target.value = ''; // let the same file be picked again after a failed read
            }}
          />
          <div style={{ marginTop: 16 }}>
            <Button variant="secondary" size="md" block loading={reading} onClick={() => fileRef.current?.click()}>
              <ImageUp size={17} strokeWidth={2.4} />
              Upload a picture of the code
            </Button>
          </div>
        </div>

        {hunt && (
          <section className="pad payout" style={{ marginTop: 30 }}>
            <hr className="rule" style={{ marginBottom: 20 }} />

            <span className="overline" style={{ color: 'rgba(244,241,234,0.55)' }}>
              You&apos;ll collect
            </span>

            <div style={{ marginTop: 12 }}>
              <Money value={hunt.arrival_reward} size="lg" signed chip style={{ fontSize: 44 }} />
            </div>

            <div className="row-between" style={{ marginTop: 22 }}>
              <span className="body-sm" style={{ color: 'rgba(244,241,234,0.55)' }}>
                Full hunt value
              </span>
              <span className="row" style={{ gap: 6, alignItems: 'baseline' }}>
                <Money value={totalReward(hunt)} size="md" unit={null} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    color: 'rgba(244,241,234,0.5)',
                  }}
                >
                  USDC
                </span>
              </span>
            </div>
          </section>
        )}

        <div className="pad" style={{ marginTop: 28 }}>
          {resolving && (
            <p className="body-sm" style={{ color: 'rgba(244,241,234,0.7)', textAlign: 'center' }}>
              Opening the hunt…
            </p>
          )}
          {error && (
            <p className="caption" style={{ color: 'var(--pink)', marginTop: 12, textAlign: 'center' }}>
              {error}
            </p>
          )}
        </div>
      </div>
      <TabBar />
    </>
  );
}
