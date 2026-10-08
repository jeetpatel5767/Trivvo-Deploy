import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useConnect } from 'wagmi';
import { login } from '../../lib/api';
import { Screen, Button, Card, Money } from '../components/UI';
import { Wallet, Store, MapPin, Coins, Compass } from '../components/Icons';

/**
 * v2 login. Same wallet-connect behaviour as v1: connecting signs the user in
 * as a customer and forwards to the hunt list; the vendor path goes straight
 * to the vendor dashboard.
 */
export default function V2Login() {
    const { isConnected, address } = useAccount();
    const { connect, connectors, isPending } = useConnect();
    const navigate = useNavigate();

    useEffect(() => {
        if (isConnected && address) {
            login(address, 'user').catch(() =>
                console.log('Backend not available — using demo mode')
            );
            navigate('/v2/hunts');
        }
    }, [isConnected, address, navigate]);

    const handleConnect = () => {
        const connector =
            connectors.find((c) => c.id === 'metaMask') ||
            connectors.find((c) => c.id === 'injected') ||
            connectors[0];
        if (connector) connect({ connector });
    };

    return (
        <Screen style={{ paddingBottom: 40 }}>
            {/* Brand */}
            <div className="v2-row" style={{ gap: 11, marginTop: 10, marginBottom: 52 }}>
                <span
                    style={{
                        width: 38,
                        height: 38,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--v2-lime)',
                        borderRadius: 13,
                        color: '#0C0B0E',
                    }}
                >
                    <Compass />
                </span>
                <span style={{ fontSize: 19, fontWeight: 750, letterSpacing: '-0.03em' }}>
                    Tr!vvo
                </span>
            </div>

            {/* Headline */}
            <h1
                style={{
                    fontSize: 36,
                    fontWeight: 780,
                    letterSpacing: '-0.045em',
                    lineHeight: 1.08,
                    margin: '0 0 14px',
                }}
            >
                Get paid to
                <br />
                explore your city.
            </h1>
            <p
                style={{
                    fontSize: 15.5,
                    fontWeight: 500,
                    color: 'var(--v2-text-mid)',
                    lineHeight: 1.55,
                    margin: '0 0 36px',
                    maxWidth: 320,
                }}
            >
                Local businesses stake real USDC. Show up, complete the task,
                and it lands in your wallet.
            </p>

            {/* Proof of the value prop, stated concretely */}
            <Card variant="flat" style={{ marginBottom: 32 }}>
                <div className="v2-row v2-row--between">
                    <div>
                        <div
                            style={{
                                fontSize: 10.5,
                                fontWeight: 650,
                                letterSpacing: '0.09em',
                                textTransform: 'uppercase',
                                color: 'var(--v2-text-lo)',
                                marginBottom: 6,
                            }}
                        >
                            Typical hunt pays
                        </div>
                        <Money amount={5.5} size="lg" />
                    </div>
                    <div className="v2-stack v2-stack--8" style={{ alignItems: 'flex-end' }}>
                        <span className="v2-meta">
                            <Coins />
                            <span>Paid instantly</span>
                        </span>
                        <span className="v2-meta">
                            <MapPin />
                            <span>No gas fees</span>
                        </span>
                    </div>
                </div>
            </Card>

            {/* Actions */}
            <div className="v2-stack v2-stack--12">
                <Button size="lg" block onClick={handleConnect} disabled={isPending}>
                    <Wallet />
                    {isPending ? 'Connecting…' : 'Connect wallet'}
                </Button>

                {/* The vendor side has not been redesigned yet, so this still
                    routes into the existing v1 dashboard. */}
                <Button variant="secondary" size="lg" block onClick={() => navigate('/vendor/dashboard')}>
                    <Store />
                    I'm a business
                </Button>
            </div>

            <p
                style={{
                    fontSize: 12.5,
                    color: 'var(--v2-text-lo)',
                    textAlign: 'center',
                    marginTop: 24,
                    lineHeight: 1.5,
                }}
            >
                Your wallet is your account. Nothing else to sign up for.
            </p>
        </Screen>
    );
}
