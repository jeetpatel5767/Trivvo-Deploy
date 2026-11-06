/** T23: minimal reward token on Hedera Token Service (HTS). Created once with the SDK, no Solidity. */
import { TokenCreateTransaction, TokenType, TokenSupplyType, TransferTransaction, AccountId, TokenId } from '@hashgraph/sdk';
import { getHederaClient } from './hederaClient';

/**
 * F2: send one stamp to a hunter's EVM wallet (no Hedera account needed).
 * AccountId.fromEvmAddress(0,0,evm) lets Hedera auto-create a hollow account with
 * auto-association on first receipt (proven in S2). Returns the consensus tx id string.
 */
export async function sendStampToEvm(tokenId: string, evmAddress: string, amount = 1): Promise<string> {
    const client = getHederaClient();
    const operator = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID as string);
    const to = AccountId.fromEvmAddress(0, 0, evmAddress.replace(/^0x/, '0x'));
    const tx = await new TransferTransaction()
        .addTokenTransfer(TokenId.fromString(tokenId), operator, -amount)
        .addTokenTransfer(TokenId.fromString(tokenId), to, amount)
        .execute(client);
    const receipt = await tx.getReceipt(client);
    if (receipt.status.toString() !== 'SUCCESS') throw new Error(`HTS stamp status ${receipt.status.toString()}`);
    return tx.transactionId?.toString() || '';
}

export async function createRewardToken(name = 'Trivvo Stamp', symbol = 'TVSTAMP'): Promise<string> {
    const client = getHederaClient();
    const operator = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID as string);
    const tx = await new TokenCreateTransaction()
        .setTokenName(name)
        .setTokenSymbol(symbol)
        .setTokenType(TokenType.FungibleCommon)
        .setDecimals(0)
        .setInitialSupply(1000000)
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(1000000)
        .setTreasuryAccountId(operator)
        .execute(client);
    const receipt = await tx.getReceipt(client);
    if (!receipt.tokenId) throw new Error('HTS token was not created');
    return receipt.tokenId.toString();
}

/** Send one stamp to a hunter's Hedera account. Needs their association with the token first. */
export async function sendStamp(tokenId: string, toAccountId: string, amount = 1): Promise<string> {
    const client = getHederaClient();
    const operator = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID as string);
    const tx = await new TransferTransaction()
        .addTokenTransfer(TokenId.fromString(tokenId), operator, -amount)
        .addTokenTransfer(TokenId.fromString(tokenId), AccountId.fromString(toAccountId), amount)
        .execute(client);
    const receipt = await tx.getReceipt(client);
    return receipt.status.toString();
}
