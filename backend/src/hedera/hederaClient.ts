/**
 * T21: Hedera module, JS SDK only (No Solidity Allowed track).
 * Holds the public receipt trail (HCS) and the minimal reward token (HTS).
 * Escrow lives on World Chain (EVM). This folder contains no .sol files.
 */
import { Client, PrivateKey, AccountId } from '@hashgraph/sdk';

export function isHederaConfigured(): boolean {
    return !!(process.env.HEDERA_ACCOUNT_ID && process.env.HEDERA_PRIVATE_KEY);
}

/** Testnet client from HEDERA_ACCOUNT_ID / HEDERA_PRIVATE_KEY in backend/.env. */
export function getHederaClient(): Client {
    const id = process.env.HEDERA_ACCOUNT_ID;
    const key = process.env.HEDERA_PRIVATE_KEY;
    if (!id || !key) throw new Error('HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY are not set');
    const client = Client.forTestnet();
    const raw = key.trim().replace(/^0x/, '');
    const priv = process.env.HEDERA_KEY_TYPE === 'ed25519' ? PrivateKey.fromStringED25519(raw) : PrivateKey.fromStringECDSA(raw);
    client.setOperator(AccountId.fromString(id), priv);
    return client;
}
