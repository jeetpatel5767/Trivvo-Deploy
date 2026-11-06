const { ethers } = require("hardhat");

async function main() {
    const escrowAddress = "0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E";
    const escrow = await ethers.getContractAt("TrivvoHuntEscrow", escrowAddress);

    const nextId = await escrow.nextHuntId();
    console.log("Total Hunts:", nextId.toString());

    for (let i = 0; i < nextId; i++) {
        const hunt = await escrow.getHunt(i);
        console.log(`\nHunt #${i}:`);
        console.log("  Reward Token:", hunt.rewardToken);
        console.log("  Remaining Funds:", hunt.remainingFunds.toString());
        console.log("  Active:", hunt.active);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
