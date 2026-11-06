const { ethers } = require('ethers');

async function main() {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    const address = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';

    console.log(`Checking bytecode for ${address}`);
    const code = await provider.getCode(address);
    console.log(`Bytecode length: ${code.length}`);
    if (code === '0x') {
        console.log('NO CONTRACT DEPLOYED HERE!');
        return;
    }

    // Check nextHuntId selector: 0x685511dc
    // Check getHunt selector: 0x937827e8
    console.log('Contains nextHuntId? ' + code.includes('685511dc'));
    console.log('Contains getHunt? ' + code.includes('937827e8'));

    const abi = [
        'function nextHuntId() external view returns (uint256)',
        'function getHunt(uint256 _huntId) external view returns (tuple(uint256 huntId, address vendor, address rewardToken, uint256 arrivalReward, uint256 mainReward, uint256 remainingFunds, uint256 startTime, uint256 endTime, bool active))'
    ];

    const contract = new ethers.Contract(address, abi, provider);

    try {
        const nextId = await contract.nextHuntId();
        console.log('nextHuntId():', nextId.toString());
    } catch (e) {
        console.error('nextHuntId error:', e.message);
    }

    try {
        const hunt = await contract.getHunt(0);
        console.log('getHunt(0):', hunt);
    } catch (e) {
        console.error('getHunt error:', e.message);
    }
}

main().catch(console.error);
