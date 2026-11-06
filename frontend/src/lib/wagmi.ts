import { http, createConfig } from 'wagmi';
import { hardhat, worldchainSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

/**
 * B3: the escrow lives on World Chain Sepolia (D8).
 * VITE_CHAIN_ID=31337 switches the app to a local Hardhat node for development.
 */
export const APP_CHAIN = Number(import.meta.env.VITE_CHAIN_ID) === hardhat.id ? hardhat : worldchainSepolia;

export const config = createConfig({
    chains: [worldchainSepolia, hardhat],
    connectors: [injected()],
    transports: {
        [worldchainSepolia.id]: http(),
        [hardhat.id]: http('http://127.0.0.1:8545'),
    },
});

/** Block-explorer link for a transaction on the app chain. */
export const explorerTx = (hash: string) =>
    `${APP_CHAIN.blockExplorers?.default.url ?? 'https://sepolia.worldscan.org'}/tx/${hash}`;
