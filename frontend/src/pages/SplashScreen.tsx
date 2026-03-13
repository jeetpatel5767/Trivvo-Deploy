import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LogoT from '../assets/LogoT.png';

const SplashScreen: React.FC = () => {
    const navigate = useNavigate();
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(timer);
                    setTimeout(() => navigate('/login'), 500);
                    return 100;
                }
                return prev + 2;
            });
        }, 50);

        return () => clearInterval(timer);
    }, [navigate]);

    return (
        <div style={{
            width: '100%',
            maxWidth: '100%',
            height: '100vh',
            backgroundColor: '#F7F7F5',
            color: '#000000',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Top Decorative Elements */}
            <div style={{ position: 'absolute', top: '10%', left: '10%', fontSize: '24px' }}>✨</div>
            <div style={{ position: 'absolute', top: '15%', right: '15%', fontSize: '32px', transform: 'rotate(45deg)' }}>↘️</div>

            {/* Main Content */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                paddingBottom: '100px'
            }}>
                {/* Logo Container */}
                <div style={{
                    width: '140px',
                    height: '140px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '30px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'relative',
                    boxShadow: '4px 4px 0px rgba(0,0,0,0.1)',
                    marginBottom: '32px',
                    border: '2px solid #000'
                }}>
                    <img src={LogoT} alt="Tr!vvo Logo" style={{ width: '180px', height: '180px', objectFit: 'contain' }} />
                    <div style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '-10px',
                        width: '32px',
                        height: '32px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '50%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        border: '2px solid #000'
                    }}>
                        <span style={{ fontSize: '14px' }}>💎</span>
                    </div>
                </div>

                {/* App Name */}
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{
                        fontSize: '42px',
                        fontWeight: 900,
                        fontStyle: 'italic',
                        textTransform: 'uppercase',
                        color: '#000000',
                        margin: 0,
                        letterSpacing: '-2px',
                        lineHeight: '1'
                    }}>
                        TR!VVO
                    </h1>
                </div>
            </div>

            {/* Decorative Side Elements */}
            <div style={{ position: 'absolute', left: '-20px', top: '50%', fontSize: '60px', opacity: 0.2 }}>📍</div>
            <div style={{ position: 'absolute', right: '30px', top: '55%', fontSize: '24px' }}>⭐</div>

            {/* Bottom Panel */}
            <div style={{
                backgroundColor: '#FFFFFF',
                padding: '40px 30px',
                borderTopLeftRadius: '32px',
                borderTopRightRadius: '32px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '20px',
                boxShadow: '0 -10px 30px rgba(0,0,0,0.03)'
            }}>
                <div style={{ fontSize: '28px', transform: 'rotate(-45deg)', marginBottom: '-10px' }}>↙️</div>
                <h2 style={{
                    fontSize: '28px',
                    fontWeight: 800,
                    color: '#111827',
                    lineHeight: '1.2',
                    maxWidth: '240px',
                    margin: 0
                }}>
                    Explore the city.<br />Unlock its secrets.
                </h2>

                <div style={{ width: '100%', marginTop: '10px' }}>
                    <p style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color: '#000000',
                        letterSpacing: '1px',
                        marginBottom: '12px',
                        textTransform: 'uppercase'
                    }}>
                        FINDING ARTIFACTS...
                    </p>
                    <div style={{
                        width: '100%',
                        height: '10px',
                        backgroundColor: '#E5E7EB',
                        borderRadius: '5px',
                        border: '2px solid #000000',
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                        <div style={{
                            width: `${progress}%`,
                            height: '100%',
                            backgroundColor: '#FACC15',
                            transition: 'width 0.1s ease-out'
                        }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;
