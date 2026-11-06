import { ethers } from "hardhat";

/**
 * Deploy script for local Hardhat node.
 * Deploys: MockUSDC + TrivvoHuntEscrow
 * Also mints test USDC to the deployer.
 * 
 * Usage:
 *   Terminal 1: npx hardhat node
 *   Terminal 2: npx hardhat run scripts/deploy-local.ts --network localhost
 */
async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("=".repeat(50));
    console.log("🚀 Deploying Tr!vvo contracts to local Hardhat node");
    console.log("=".repeat(50));
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
    console.log("");

    // 1. Deploy MockUSDC
    console.log("1️⃣  Deploying MockUSDC...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    const usdcAddress = await usdc.getAddress();
    console.log("   MockUSDC deployed to:", usdcAddress);

    // Check deployer USDC balance
    const usdcBalance = await usdc.balanceOf(deployer.address);
    console.log("   Deployer USDC balance:", ethers.formatUnits(usdcBalance, 6), "USDC");
    console.log("");

    // 2. Deploy TrivvoHuntEscrow
    console.log("2️⃣  Deploying TrivvoHuntEscrow...");
    const TrivvoHuntEscrow = await ethers.getContractFactory("TrivvoHuntEscrow");
    const escrow = await TrivvoHuntEscrow.deploy(deployer.address);
    await escrow.waitForDeployment();
    const escrowAddress = await escrow.getAddress();
    console.log("   TrivvoHuntEscrow deployed to:", escrowAddress);
    console.log("");

    // 3. Summary
    console.log("=".repeat(50));
    console.log("✅ Deployment complete!");
    console.log("=".repeat(50));
    console.log("");
    console.log("📋 Add these to your backend/.env:");
    console.log(`   PRIVATE_KEY=${
        // Hardhat's default account #0 private key
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
        }`);
    console.log(`   HUNT_ESCROW_ADDRESS=${escrowAddress}`);
    console.log(`   USDC_TOKEN_ADDRESS=${usdcAddress}`);
    console.log(`   AVALANCHE_RPC_URL=http://127.0.0.1:8545`);
    console.log("");
    console.log("📋 Add these to your frontend/.env:");
    console.log(`   VITE_HUNT_ESCROW_ADDRESS=${escrowAddress}`);
    console.log(`   VITE_USDC_TOKEN_ADDRESS=${usdcAddress}`);
    console.log("");
    console.log("🦊 Add Hardhat network to MetaMask:");
    console.log("   Network Name: Hardhat Local");
    console.log("   RPC URL: http://127.0.0.1:8545");
    console.log("   Chain ID: 31337");
    console.log("   Currency: ETH");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
