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
    'event HuntFunded(uint256 indexed huntId, uint256 amount, uint256 totalFunds)',
    'event FundsWithdrawn(uint256 indexed huntId, address indexed vendor, uint256 amount)',
];

/** World Chain Sepolia by default (D8). Any EVM chain works through env. */
const RPC_URL = process.env.CHAIN_RPC_URL || 'https://worldchain-sepolia.g.alchemy.com/public';
const EXPLORER_URL = (process.env.EXPLORER_URL || 'https://sepolia.worldscan.org').replace(/\/$/, '');
const USDC_DECIMALS = 6;

export interface FundingCheck {
    contractHuntId: number;
    vendor: string;           // lowercase
    arrivalReward: string;    // human units, e.g. "0.5"
    mainReward: string;
    startTime: number;        // unix seconds
    endTime: number;
    active: boolean;
}

class BlockchainService {
    private provider: ethers.JsonRpcProvider;
    private signer: ethers.Wallet | null = null;
    private escrowContract: ethers.Contract | null = null;
    private escrowAddress = '';
    private isConfigured = false;

    constructor() {
        const rpcUrl = RPC_URL;
        const privateKey = process.env.PRIVATE_KEY || '';
        const contractAddress = process.env.HUNT_ESCROW_ADDRESS || '';

        this.provider = new ethers.JsonRpcProvider(rpcUrl);

        // Only initialize wallet if a real private key is provided (64 hex chars with 0x prefix)
        if (privateKey && privateKey.length === 66 && privateKey.startsWith('0x') && !privateKey.includes('your_')) {
            try {
                this.signer = new ethers.Wallet(privateKey, this.provider);
                if (contractAddress && contractAddress.length === 42 && contractAddress.startsWith('0x') && !contractAddress.includes('your_')) {
                    this.escrowContract = new ethers.Contract(contractAddress, ESCROW_ABI, this.signer);
                    this.escrowAddress = contractAddress.toLowerCase();
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
        return `${EXPLORER_URL}/tx/${txHash}`;
    }

    get configured(): boolean {
        return this.isConfigured;
    }

    /**
     * B4: read a vendor's fundHunt transaction from the chain itself (never trust the browser).
     * Returns the escrow hunt it funded, as the contract stores it, or an error code.
     */
    async readFunding(txHash: string): Promise<{ hunt?: FundingCheck; code?: string }> {
        if (!this.isConfigured || !this.escrowContract) return { code: 'chain_not_configured' };
        if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return { code: 'bad_tx_hash' };
        const receipt = await this.provider.getTransactionReceipt(txHash);
        if (!receipt) return { code: 'tx_not_found' };
        if (receipt.status !== 1) return { code: 'tx_failed' };
        const iface = this.escrowContract.interface;
        const funded = receipt.logs
            .filter((l) => l.address.toLowerCase() === this.escrowAddress)
            .map((l) => { try { return iface.parseLog(l); } catch { return null; } })
            .find((e) => e?.name === 'HuntFunded');
        if (!funded) return { code: 'not_a_funding_tx' };
        const id = Number(funded.args.huntId);
        const h = await this.escrowContract.getHunt(id);
        return {
            hunt: {
                contractHuntId: id,
                vendor: String(h.vendor).toLowerCase(),
                arrivalReward: ethers.formatUnits(h.arrivalReward, USDC_DECIMALS),
                mainReward: ethers.formatUnits(h.mainReward, USDC_DECIMALS),
                startTime: Number(h.startTime),
                endTime: Number(h.endTime),
                active: Boolean(h.active),
            },
        };
    }

    /** Read a vendor's withdrawRemaining transaction from the chain (same rule as funding). */
    async readWithdrawal(txHash: string): Promise<{ contractHuntId?: number; vendor?: string; amount?: string; code?: string }> {
        if (!this.isConfigured || !this.escrowContract) return { code: 'chain_not_configured' };
        if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return { code: 'bad_tx_hash' };
        const receipt = await this.provider.getTransactionReceipt(txHash);
        if (!receipt) return { code: 'tx_not_found' };
        if (receipt.status !== 1) return { code: 'tx_failed' };
        const iface = this.escrowContract.interface;
        const ev = receipt.logs
            .filter((l) => l.address.toLowerCase() === this.escrowAddress)
            .map((l) => { try { return iface.parseLog(l); } catch { return null; } })
            .find((e) => e?.name === 'FundsWithdrawn');
        if (!ev) return { code: 'not_a_withdrawal_tx' };
        return {
            contractHuntId: Number(ev.args.huntId),
            vendor: String(ev.args.vendor).toLowerCase(),
            amount: ethers.formatUnits(ev.args.amount, USDC_DECIMALS),
        };
    }
}

export const blockchainService = new BlockchainService();
