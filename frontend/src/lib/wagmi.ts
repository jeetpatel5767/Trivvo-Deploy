import { http, createConfig } from 'wagmi';
import { hardhat, worldchain, worldchainSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { worldApp } from '@worldcoin/minikit-js/wagmi';

/**
 * B3: the escrow lives on World Chain Sepolia (D8).
 * VITE_CHAIN_ID=31337 switches the app to a local Hardhat node for development.
 */
export const APP_CHAIN = Number(import.meta.env.VITE_CHAIN_ID) === hardhat.id ? hardhat : worldchainSepolia;

export const config = createConfig({
    // worldchain (480) is listed because the World App wallet always reports it; hunters there only sign messages.
    chains: [worldchainSepolia, worldchain, hardhat],
    // Inside World App the hunter's own World App wallet is used (MiniKit); everywhere else a browser wallet.
    connectors: [worldApp(), injected()],
    transports: {
        [worldchainSepolia.id]: http(),
        [worldchain.id]: http(),
        [hardhat.id]: http('http://127.0.0.1:8545'),
    },
});

/** Block-explorer link for a transaction on the app chain. */
export const explorerTx = (hash: string) =>
    `${APP_CHAIN.blockExplorers?.default.url ?? 'https://sepolia.worldscan.org'}/tx/${hash}`;
