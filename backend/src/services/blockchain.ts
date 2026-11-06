import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const ESCROW_ABI = [
    'function createHunt(address _rewardToken, uint256 _arrivalReward, uint256 _mainReward, uint256 _startTime, uint256 _endTime) external returns (uint256)',
    'function fundHunt(uint256 _huntId, uint256 _amount) external',
    'function claimArrivalReward(uint256 _huntId, address _user) external',
    'function claimMainReward(uint256 _huntId, address _user) external',
    'function withdrawRemaining(uint256 _huntId) external',
    'function getHunt(uint256 _huntId) external view returns (tuple(uint256 huntId, address vendor, address rewardToken, uint256 arrivalReward, uint256 mainReward, uint256 remainingFunds, uint256 startTime, uint256 endTime, bool active))',
    'function isHuntActive(uint256 _huntId) external view returns (bool)',
];

class BlockchainService {
    private provider: ethers.JsonRpcProvider;
    private signer: ethers.Wallet | null = null;
    private escrowContract: ethers.Contract | null = null;
    private isConfigured = false;

    constructor() {
        const rpcUrl = process.env.AVALANCHE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';
        const privateKey = process.env.PRIVATE_KEY || '';
        const contractAddress = process.env.HUNT_ESCROW_ADDRESS || '';

        this.provider = new ethers.JsonRpcProvider(rpcUrl);

        // Only initialize wallet if a real private key is provided (64 hex chars with 0x prefix)
        if (privateKey && privateKey.length === 66 && privateKey.startsWith('0x') && !privateKey.includes('your_')) {
            try {
                this.signer = new ethers.Wallet(privateKey, this.provider);
                if (contractAddress && contractAddress.length === 42 && contractAddress.startsWith('0x') && !contractAddress.includes('your_')) {
                    this.escrowContract = new ethers.Contract(contractAddress, ESCROW_ABI, this.signer);
                    this.isConfigured = true;
                    console.log('🔗 Blockchain service configured');
                }
            } catch (_err) {
                console.log('⚠️ Blockchain: Invalid key — demo mode');
            }
        } else {
            console.log('⚠️ Blockchain: No private key — demo mode (rewards simulated)');
        }
    }

    async claimArrivalReward(huntId: number, userAddress: string): Promise<string> {
        if (!this.isConfigured || !this.escrowContract) {
            return `0xdemo_arrival_${huntId}_${Date.now()}`;
        }
        const tx = await this.escrowContract.claimArrivalReward(huntId, userAddress);
        const receipt = await tx.wait();
        return receipt.hash;
    }

    async claimMainReward(huntId: number, userAddress: string): Promise<string> {
        if (!this.isConfigured || !this.escrowContract) {
            return `0xdemo_main_${huntId}_${Date.now()}`;
        }
        const tx = await this.escrowContract.claimMainReward(huntId, userAddress);
        const receipt = await tx.wait();
        return receipt.hash;
    }

    async getHuntDetails(huntId: number) {
        if (!this.isConfigured || !this.escrowContract) return null;
        try {
            const hunt = await this.escrowContract.getHunt(huntId);
            // If the hunt doesn't exist, the vendor address will be the zero address
            if (!hunt.vendor || hunt.vendor === ethers.ZeroAddress) {
                return null;
            }
            return {
                huntId: Number(hunt.huntId),
                vendor: hunt.vendor,
                rewardToken: hunt.rewardToken,
                arrivalReward: ethers.formatUnits(hunt.arrivalReward, 6),
                mainReward: ethers.formatUnits(hunt.mainReward, 6),
                remainingFunds: ethers.formatUnits(hunt.remainingFunds, 6),
                startTime: Number(hunt.startTime),
                endTime: Number(hunt.endTime),
                active: hunt.active,
            };
        } catch (err) {
            console.error(`Error fetching hunt ${huntId} details:`, err);
            return null;
        }
    }

    async isHuntActive(huntId: number): Promise<boolean> {
        if (!this.isConfigured || !this.escrowContract) return true;
        return await this.escrowContract.isHuntActive(huntId);
    }

    getExplorerUrl(txHash: string): string {
        return `https://testnet.snowtrace.io/tx/${txHash}`;
    }
}

export const blockchainService = new BlockchainService();
