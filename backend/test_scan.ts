import axios from 'axios';
import { ethers } from 'ethers';

const ESCROW_ABI = [
    'function createHunt(address _rewardToken, uint256 _arrivalReward, uint256 _mainReward, uint256 _startTime, uint256 _endTime) external returns (uint256)',
    'function fundHunt(uint256 _huntId, uint256 _amount) external',
];

const ERC20_ABI = [
    'function approve(address spender, uint256 amount) external returns (bool)',
];

async function testFullFlow() {
    try {
        console.log("1. Authenticating as Vendor");
        const vendorWallet = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Hardhat deployer
        await axios.post('http://localhost:3002/api/login', { walletAddress: vendorWallet, role: 'vendor', businessName: 'Test Business' });

        console.log("2. Creating Hunt in DB");
        const createRes = await axios.post('http://localhost:3002/api/hunts', {
            vendorWallet, title: 'Debug Hunt', description: 'Testing smart contract',
            locationLat: 40, locationLng: -74, locationName: 'Test Loc',
            startTime: new Date().toISOString(), endTime: new Date(Date.now() + 86400000).toISOString(),
            arrivalReward: 0.5, mainReward: 5, tasks: ['Test Task']
        });
        const huntId = createRes.data.hunt.hunt_id;
        const qrSecret = createRes.data.hunt.qr_secret;

        console.log("3. Creating and Funding on Smart Contract");
        const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        const wallet = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
        const escrow = new ethers.Contract('0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512', ESCROW_ABI, wallet);
        const usdc = new ethers.Contract('0x5FbDB2315678afecb367f032d93F642f64180aa3', ERC20_ABI, wallet);

        const startTime = Math.floor(Date.now() / 1000) + 60;
        const endTime = startTime + 3600;

        const tx1 = await escrow.createHunt('0x5FbDB2315678afecb367f032d93F642f64180aa3', ethers.parseUnits('0.5', 6), ethers.parseUnits('5', 6), startTime, endTime);
        await tx1.wait();

        const tx2 = await usdc.approve('0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512', ethers.parseUnits('50', 6));
        await tx2.wait();

        // Let's assume the contractHuntId was 0 (the first one) or 1
        // (Just going to aggressively fund 0)
        try {
            const tx3 = await escrow.fundHunt(0, ethers.parseUnits('50', 6));
            await tx3.wait();
        } catch (e) {
            console.log("Maybe it's hunt 1? Trying 1...");
            const tx3 = await escrow.fundHunt(1, ethers.parseUnits('50', 6));
            await tx3.wait();
        }

        console.log("4. Recording Funding in DB");
        await axios.post('http://localhost:3002/api/hunts/fund', { huntId, contractHuntId: 0, txHash: '0xabc' });

        console.log("5. Testing QR Scan");
        const randomWallet = "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

        // Wait 65s so `hunt.startTime` has passed otherwise claimArrivalReward reverts with "Hunt not started"
        console.log("Waiting until start time is valid...");
        await new Promise(r => setTimeout(r, 65000));

        const res = await axios.post('http://localhost:3002/api/scan', {
            huntId, qrSecret, walletAddress: randomWallet
        });

        console.log("Scan success:", res.data);
    } catch (err: any) {
        console.log("Error during test:", err.response?.data || err.message);
    }
}

testFullFlow();
