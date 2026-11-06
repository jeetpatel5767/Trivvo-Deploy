// TrivvoHuntEscrow contract ABI (key functions)
export const HUNT_ESCROW_ABI = [
    {
        inputs: [{ name: '_rewardToken', type: 'address' }, { name: '_arrivalReward', type: 'uint256' }, { name: '_mainReward', type: 'uint256' }, { name: '_startTime', type: 'uint256' }, { name: '_endTime', type: 'uint256' }],
        name: 'createHunt',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: '_huntId', type: 'uint256' }, { name: '_amount', type: 'uint256' }],
        name: 'fundHunt',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: '_huntId', type: 'uint256' }],
        name: 'getHunt',
        outputs: [{
            components: [
                { name: 'huntId', type: 'uint256' },
                { name: 'vendor', type: 'address' },
                { name: 'rewardToken', type: 'address' },
                { name: 'arrivalReward', type: 'uint256' },
                { name: 'mainReward', type: 'uint256' },
                { name: 'remainingFunds', type: 'uint256' },
                { name: 'startTime', type: 'uint256' },
                { name: 'endTime', type: 'uint256' },
                { name: 'active', type: 'bool' },
            ],
            name: '',
            type: 'tuple',
        }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: '_huntId', type: 'uint256' }],
        name: 'isHuntActive',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: '_huntId', type: 'uint256' }],
        name: 'withdrawRemaining',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [],
        name: 'nextHuntId',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

// ERC20 ABI for token approval
export const ERC20_ABI = [
    {
        inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
        name: 'approve',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

// Contract addresses (update after deployment)
export const CONTRACTS = {
    HUNT_ESCROW: import.meta.env.VITE_HUNT_ESCROW_ADDRESS || '0x0000000000000000000000000000000000000000',
    USDC_TOKEN: import.meta.env.VITE_USDC_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000',
};
