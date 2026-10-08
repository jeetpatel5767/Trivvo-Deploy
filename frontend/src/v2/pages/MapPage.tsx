import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getHunt } from '../../lib/api';
import { Screen, TopBar, Button, Card, Label, Skeleton, Meta } from '../components/UI';
import { TabBar } from '../components/TabBar';
import { MapPin, Scan, ExternalLink, Compass } from '../components/Icons';
import { findDemoHunt } from '../lib/demoHunts';
import type { Hunt } from '../lib/types';

/**
 * v2 directions screen.
 *
 * No map SDK is installed in this project, so rather than render a dead
 * placeholder (as v1 does), this hands off to the device's own map app via a
 * universal geo link — which actually works today, on desktop and mobile.
 * Dropping in Mapbox/Google Maps later replaces only the preview block.
 */
export default function V2Map() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [hunt, setHunt] = useState<Hunt | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function fetchHunt() {
            try {
                const res = await getHunt(id!);
                if (!cancelled) setHunt(res.data.hunt);
            } catch {
                if (!cancelled) setHunt(findDemoHunt(id));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchHunt();
        return () => { cancelled = true; };
    }, [id]);

    const lat = Number(hunt?.location_lat);
    const lng = Number(hunt?.location_lng);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    const mapsUrl = hasCoords
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        : null;

    return (
        <>
            <Screen>
                <TopBar
                    eyebrow={hunt?.business_name}
                    title="Directions"
                    onBack={() => navigate(id ? `/v2/hunt/${id}` : '/v2/hunts')}
                />

                {loading ? (
                    <Skeleton height={260} />
                ) : (
                    <>
                        {/* Location preview */}
                        <div
                            style={{
                                position: 'relative',
                                height: 240,
                                marginBottom: 22,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 14,
                                background: 'var(--v2-surface-1)',
                                border: '1px solid var(--v2-hairline)',
                                borderRadius: 'var(--v2-r-lg)',
                                overflow: 'hidden',
                            }}
                        >
                            {/* Grid texture so the panel reads as a map surface */}
                            <span
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    backgroundImage:
                                        'linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),' +
                                        'linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px)',
                                    backgroundSize: '34px 34px',
                                }}
                            />
                            <span
                                style={{
                                    position: 'relative',
                                    width: 54,
                                    height: 54,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'var(--v2-lime)',
                                    borderRadius: 999,
                                    color: '#0C0B0E',
                                    boxShadow: '0 0 0 9px rgba(204,255,77,.14), 0 10px 32px rgba(204,255,77,.22)',
                                }}
                            >
                                <MapPin className="v2-ic-lg" />
                            </span>
                            <div style={{ position: 'relative', textAlign: 'center' }}>
                                <div style={{ fontSize: 15.5, fontWeight: 650, marginBottom: 4 }}>
                                    {hunt?.location_name || 'Hunt location'}
                                </div>
                                {hasCoords && (
                                    <div
                                        style={{
                                            fontSize: 12,
                                            color: 'var(--v2-text-lo)',
                                            fontVariantNumeric: 'tabular-nums',
                                        }}
                                    >
                                        {lat.toFixed(4)}, {lng.toFixed(4)}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Details */}
                        <Label>Getting there</Label>
                        <Card variant="flat" style={{ marginBottom: 22 }}>
                            <div className="v2-stack v2-stack--12">
                                <Meta icon={<Compass />}>
                                    Head to the venue, then scan the Tr!vvo code on site.
                                </Meta>
                                {hunt?.title && (
                                    <Meta icon={<MapPin />} truncate>{hunt.title}</Meta>
                                )}
                            </div>
                        </Card>

                        {/* Actions */}
                        <div className="v2-stack v2-stack--12">
                            {mapsUrl && (
                                <a
                                    href={mapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="v2-btn v2-btn--secondary v2-btn--lg v2-btn--block"
                                >
                                    <ExternalLink />
                                    Open in Maps
                                </a>
                            )}
                            <Button
                                size="lg"
                                block
                                onClick={() => navigate('/v2/scan', { state: { hunt } })}
                            >
                                <Scan />
                                I'm here — scan QR
                            </Button>
                        </div>
                    </>
                )}
            </Screen>
            <TabBar />
        </>
    );
}
