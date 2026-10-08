import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../components/UI';
import { Compass, MapPin, Coins } from '../components/Icons';

/**
 * v2 splash. Same 2.5s auto-advance behaviour as v1, but the loading state
 * explains what the product is instead of showing a decorative progress bar.
 */
export default function V2Splash() {
    const navigate = useNavigate();
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(timer);
                    setTimeout(() => navigate('/v2/login'), 420);
                    return 100;
                }
                return prev + 2;
            });
        }, 48);
        return () => clearInterval(timer);
    }, [navigate]);

    return (
        <Screen centered>
            <div style={{ textAlign: 'center' }}>
                {/* Mark */}
                <div
                    style={{
                        width: 86,
                        height: 86,
                        margin: '0 auto 30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--v2-lime)',
                        borderRadius: 28,
                        color: '#0C0B0E',
                        boxShadow: '0 0 0 1px rgba(204,255,77,.4), 0 16px 48px rgba(204,255,77,.22)',
                        animation: 'v2-enter .7s var(--v2-spring) both',
                    }}
                >
                    <Compass className="v2-splash-mark" />
                </div>

                <h1
                    style={{
                        fontSize: 42,
                        fontWeight: 800,
                        letterSpacing: '-0.045em',
                        margin: '0 0 12px',
                        lineHeight: 1,
                    }}
                >
                    Tr!vvo
                </h1>

                <p
                    style={{
                        fontSize: 16,
                        fontWeight: 500,
                        color: 'var(--v2-text-mid)',
                        margin: '0 auto',
                        maxWidth: 250,
                        lineHeight: 1.5,
                    }}
                >
                    Explore real places.
                    <br />
                    Get paid in{' '}
                    <strong style={{ color: 'var(--v2-lime)', fontWeight: 700 }}>USDC</strong>{' '}
                    for showing up.
                </p>

                {/* What the product does, as three honest beats */}
                <div
                    className="v2-stack v2-stack--12"
                    style={{ marginTop: 44, textAlign: 'left', maxWidth: 270, marginInline: 'auto' }}
                >
                    {[
                        { Icon: MapPin, text: 'Find a hunt near you' },
                        { Icon: Compass, text: 'Scan the QR when you arrive' },
                        { Icon: Coins, text: 'Earn USDC on the spot' },
                    ].map(({ Icon, text }, i) => (
                        <div
                            key={text}
                            className="v2-row"
                            style={{
                                gap: 13,
                                opacity: progress > (i + 1) * 22 ? 1 : 0.25,
                                transform: progress > (i + 1) * 22 ? 'none' : 'translateY(5px)',
                                transition: 'all .5s var(--v2-ease)',
                            }}
                        >
                            <span
                                style={{
                                    width: 32,
                                    height: 32,
                                    flexShrink: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'var(--v2-surface-2)',
                                    border: '1px solid var(--v2-hairline)',
                                    borderRadius: 999,
                                    color: 'var(--v2-lime)',
                                }}
                            >
                                <Icon className="v2-ic-md" />
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 550, color: 'var(--v2-text-mid)' }}>
                                {text}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`.v2-splash-mark { width: 40px; height: 40px; }`}</style>
        </Screen>
    );
}
