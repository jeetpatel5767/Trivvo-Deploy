import React, { useEffect } from 'react';
import { WagmiProvider, useAccount, useSignMessage } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '../lib/wagmi';
import { setSessionSigner } from '../lib/api';
import { MiniKit } from '@worldcoin/minikit-js';

const queryClient = new QueryClient();

// Inside World App, MiniKit must be installed before the World App wallet connector can be used.
MiniKit.install(import.meta.env.VITE_WORLD_APP_ID || 'app_a3038950a55b59d8386cb7bccf8dd633');

/** Hands the connected wallet's signer to the API layer, so it can sign in when a call needs it (A1). */
function SessionBridge() {
    const { address } = useAccount();
    const { signMessageAsync } = useSignMessage();
    useEffect(() => {
        setSessionSigner(address, address ? (message) => signMessageAsync({ message }) : null);
    }, [address, signMessageAsync]);
    return null;
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <SessionBridge />
                {children}
            </QueryClientProvider>
        </WagmiProvider>
    );
}
