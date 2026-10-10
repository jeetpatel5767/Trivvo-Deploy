import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, ExternalLink } from 'lucide-react';
import { getHunt } from '../../lib/api';
import { findDemoHunt, DEMO_HUNTS } from '../../lib/demoData';
import type { Hunt } from '../../lib/types';
import { AppBar, Block, Button, Panel, Skeleton } from '../../ui';

/** Directions — dark surface. */
export default function MapPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHunt(id!)
      .then((res) => setHunt(res.data.hunt))
      .catch(() => setHunt(findDemoHunt(id) || DEMO_HUNTS[0]))
      .finally(() => setLoading(false));
  }, [id]);

  const lat = hunt?.location_lat;
  const lng = hunt?.location_lng;
  const hasCoords = lat != null && lng != null;
  const mapsUrl = hasCoords ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : null;

  return (
    <div className="screen">
      <AppBar tone="dark" onBack={() => navigate(`/hunt/${id}`)} />

      {loading ? (
        <div className="stack pad">
          <Skeleton h={220} r={28} />
          <Skeleton h={120} r={28} />
        </div>
      ) : (
        <>
          <div className="pad">
            <span className="overline" style={{ color: 'rgba(244,241,234,0.62)' }}>
              Getting there
            </span>
            <h1 style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.02, letterSpacing: '-0.045em', marginTop: 10 }}>
              {hunt?.location_name || hunt?.business_name || 'The venue'}
            </h1>
          </div>

          {/* Map field — full-bleed dark block with a single pink pin */}
          <div
            style={{
              marginTop: 28,
              height: 220,
              background: 'var(--ink-lifted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--r-xl)',
              marginLeft: 20,
              marginRight: 20,
            }}
          >
            <MapPin size={40} strokeWidth={2} style={{ color: 'var(--pink)' }} />
          </div>

          <section style={{ marginTop: 20 }}>
            <Panel tone="ink" style={{ background: 'var(--ink-lifted)' }}>
              {hunt?.title && (
                <Block>
                  <span className="overline" style={{ color: 'rgba(244,241,234,0.62)' }}>
                    You are heading to
                  </span>
                  <h3 className="title-s" style={{ marginTop: 6 }}>
                    {hunt.title}
                  </h3>
                </Block>
              )}
              {hasCoords && (
                <Block tight>
                  <div className="row-between">
                    <span className="body-sm" style={{ color: 'rgba(244,241,234,0.62)' }}>
                      Coordinates
                    </span>
                    <span className="caption mono">
                      {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
                    </span>
                  </div>
                </Block>
              )}
            </Panel>
          </section>

          <div className="pad stack-12" style={{ marginTop: 32 }}>
            <Button variant="primary" size="lg" block onClick={() => navigate('/scan', { state: { hunt } })}>
              I&apos;m here — scan QR
            </Button>
            {mapsUrl && (
              <Button variant="secondary" size="lg" block onClick={() => window.open(mapsUrl, '_blank', 'noopener')}>
                <ExternalLink size={18} strokeWidth={2.2} />
                Open in Maps
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
