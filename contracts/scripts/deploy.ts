import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    // 1. Deploy MockUSDC
    console.log("Deploying MockUSDC...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    const usdcAddress = await usdc.getAddress();
    console.log("MockUSDC deployed to:", usdcAddress);

    // 2. Deploy TrivvoHuntEscrow
    console.log("Deploying TrivvoHuntEscrow...");
    const TrivvoHuntEscrow = await ethers.getContractFactory("TrivvoHuntEscrow");
    // Using deployer as operator for initial verification
    const escrow = await TrivvoHuntEscrow.deploy(deployer.address);
    await escrow.waitForDeployment();
    const escrowAddress = await escrow.getAddress();
    console.log("TrivvoHuntEscrow deployed to:", escrowAddress);
    
    console.log("-----------------------------------------");
    console.log("DEPLOYMENT SUMMARY:");
    console.log("Network: Avalanche Fuji");
    console.log("Operator:", deployer.address);
    console.log("MockUSDC:", usdcAddress);
    console.log("TrivvoHuntEscrow:", escrowAddress);
    console.log("-----------------------------------------");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
