import { http, createConfig } from 'wagmi';
import { hardhat, avalancheFuji } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

// Using Hardhat for local and Fuji for testnet
export const config = createConfig({
    chains: [hardhat, avalancheFuji],
    connectors: [
        injected(),
    ],
    transports: {
        [hardhat.id]: http('http://127.0.0.1:8545'),
        [avalancheFuji.id]: http('https://api.avax-test.network/ext/bc/C/rpc'),
    },
});
