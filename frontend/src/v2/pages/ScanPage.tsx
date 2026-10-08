import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { scanQR } from '../../lib/api';
import { Screen, TopBar, Button, Card, Money, Label } from '../components/UI';
import { TabBar } from '../components/TabBar';
import { QrCode, AlertCircle, Zap } from '../components/Icons';
import { apiErrorMessage, type HuntNavState } from '../lib/types';

/** The four reticle corner brackets. */
const CORNERS: Array<{
    borderWidth: string;
    radius: string;
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
}> = [
        { top: 22, left: 22, borderWidth: '2.5px 0 0 2.5px', radius: '14px 0 0 0' },
        { top: 22, right: 22, borderWidth: '2.5px 2.5px 0 0', radius: '0 14px 0 0' },
        { bottom: 22, left: 22, borderWidth: '0 0 2.5px 2.5px', radius: '0 0 0 14px' },
        { bottom: 22, right: 22, borderWidth: '0 2.5px 2.5px 0', radius: '0 0 14px 0' },
    ];

/**
 * v2 scan screen.
 *
 * Note: no camera is opened here — neither v1 nor the Android app ever did.
 * The QR payload is entered manually in the format `huntId:qrSecret`.
 * Wiring a real camera is the top functional follow-up for this screen.
 */
export default function V2Scan() {
    const navigate = useNavigate();
    const location = useLocation();
    const hunt = (location.state as HuntNavState | null)?.hunt;
    const { address } = useAccount();

    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState('');
    const [manualInput, setManualInput] = useState('');

    const handleScan = async (data: string) => {
        if (scanning) return;
        setScanning(true);
        setError('');

        const parts = data.split(':');
        if (parts.length !== 2) {
            setError('That code is not in the expected format.');
            setScanning(false);
            return;
        }

        const [huntId, qrSecret] = parts;
        const walletAddress = address || '0xdemo';

        try {
            const res = await scanQR(huntId, qrSecret, walletAddress);
            if (res.data.success) {
                navigate('/v2/arrival-reward', {
                    state: {
                        arrivalReward: res.data.arrivalReward,
                        txHash: res.data.arrivalTxHash,
                        explorerUrl: res.data.explorerUrl,
                        tasks: res.data.tasks,
                        huntTitle: res.data.huntTitle,
                        businessName: res.data.businessName,
                        mainReward: hunt?.main_reward,
                        huntId,
                    },
                });
                return;
            }
            setError('Scan could not be verified.');
            setScanning(false);
        } catch (err: unknown) {
            setError(apiErrorMessage(err, 'Scan failed. Please try again.'));
            setScanning(false);
        }
    };

    return (
        <>
            <Screen>
                <TopBar
                    eyebrow={hunt?.business_name}
                    title="Scan to check in"
                    onBack={() => navigate(-1)}
                />

                {/* Reticle */}
                <div
                    style={{
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '1',
                        maxWidth: 290,
                        margin: '8px auto 28px',
                        background: 'var(--v2-surface-1)',
                        border: '1px solid var(--v2-hairline)',
                        borderRadius: 'var(--v2-r-xl)',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {/* Corner brackets */}
                    {CORNERS.map(({ borderWidth, radius, ...inset }, i) => (
                        <span
                            key={i}
                            style={{
                                position: 'absolute',
                                width: 34,
                                height: 34,
                                borderStyle: 'solid',
                                borderColor: 'var(--v2-lime)',
                                borderWidth,
                                borderRadius: radius,
                                ...inset,
                            }}
                        />
                    ))}

                    {/* Sweep line */}
                    <span
                        style={{
                            position: 'absolute',
                            left: 22,
                            right: 22,
                            height: 2,
                            background:
                                'linear-gradient(90deg, transparent, var(--v2-lime), transparent)',
                            boxShadow: '0 0 14px rgba(204,255,77,.75)',
                            animation: 'v2-sweep 2.6s ease-in-out infinite',
                        }}
                    />

                    <span style={{ color: 'var(--v2-text-lo)', opacity: 0.4 }}>
                        <QrCode className="v2-reticle-icon" />
                    </span>
                </div>

                <p
                    style={{
                        textAlign: 'center',
                        fontSize: 13.5,
                        color: 'var(--v2-text-mid)',
                        lineHeight: 1.55,
                        margin: '0 0 30px',
                    }}
                >
                    Find the Tr!vvo code at the venue and enter it below.
                </p>

                {/* Manual entry */}
                <Label>Hunt code</Label>
                <div className="v2-stack v2-stack--12">
                    <input
                        className="v2-input"
                        placeholder="huntId:secret"
                        value={manualInput}
                        onChange={(e) => {
                            setManualInput(e.target.value);
                            if (error) setError('');
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && manualInput.trim()) handleScan(manualInput.trim());
                        }}
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                    />

                    {error && (
                        <div
                            className="v2-row"
                            style={{
                                gap: 10,
                                padding: '13px 15px',
                                background: 'var(--v2-coral-soft)',
                                border: '1px solid rgba(255,107,90,.26)',
                                borderRadius: 'var(--v2-r-md)',
                            }}
                        >
                            <span style={{ color: 'var(--v2-coral)', display: 'flex', flexShrink: 0 }}>
                                <AlertCircle className="v2-ic-md" />
                            </span>
                            <span style={{ fontSize: 13.5, color: 'var(--v2-text-hi)', lineHeight: 1.45 }}>
                                {error}
                            </span>
                        </div>
                    )}

                    <Button
                        size="lg"
                        block
                        disabled={!manualInput.trim() || scanning}
                        onClick={() => handleScan(manualInput.trim())}
                    >
                        {scanning ? 'Verifying…' : 'Check in'}
                    </Button>
                </div>

                {/* What they get for scanning */}
                {hunt?.arrival_reward != null && (
                    <Card variant="flat" style={{ marginTop: 26 }}>
                        <div className="v2-row v2-row--between">
                            <div className="v2-row" style={{ gap: 10 }}>
                                <span style={{ color: 'var(--v2-lime)', display: 'flex' }}>
                                    <Zap className="v2-ic-md" />
                                </span>
                                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--v2-text-mid)' }}>
                                    Pays out instantly
                                </span>
                            </div>
                            <Money amount={hunt.arrival_reward} size="md" showPlus />
                        </div>
                    </Card>
                )}

                <style>{`
                    .v2-reticle-icon { width: 54px; height: 54px; }
                    @keyframes v2-sweep {
                        0%, 100% { top: 15%; opacity: .35; }
                        50% { top: 85%; opacity: 1; }
                    }
                `}</style>
            </Screen>
            <TabBar />
        </>
    );
}
