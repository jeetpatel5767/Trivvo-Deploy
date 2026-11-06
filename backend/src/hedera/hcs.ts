/** T22: public receipt trail on Hedera Consensus Service (HCS). */
import { TopicCreateTransaction, TopicMessageSubmitTransaction } from '@hashgraph/sdk';
import { getHederaClient } from './hederaClient';

/** Create a topic once. Store its id in HEDERA_TOPIC_ID. */
export async function createReceiptTopic(memo = 'Tr!vvo receipts'): Promise<string> {
    const client = getHederaClient();
    const tx = await new TopicCreateTransaction().setTopicMemo(memo).execute(client);
    const receipt = await tx.getReceipt(client);
    if (!receipt.topicId) throw new Error('HCS topic was not created');
    return receipt.topicId.toString();
}

/**
 * Publish one receipt line. Returns the consensus sequence number and the topic id,
 * which the receipt page links to.
 */
export async function publishReceipt(message: object): Promise<{ topicId: string; sequenceNumber: string }> {
    const topicId = process.env.HEDERA_TOPIC_ID;
    if (!topicId) throw new Error('HEDERA_TOPIC_ID is not set');
    const client = getHederaClient();
    const tx = await new TopicMessageSubmitTransaction({ topicId, message: JSON.stringify(message) }).execute(client);
    const receipt = await tx.getReceipt(client);
    return { topicId, sequenceNumber: String(receipt.topicSequenceNumber ?? '') };
}
