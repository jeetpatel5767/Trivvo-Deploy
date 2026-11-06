import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/** Set KEY=value in a .env file, replacing an existing line or appending it. */
function patchEnv(file: string, updates: Record<string, string>) {
    if (!fs.existsSync(file)) return false;
    let text = fs.readFileSync(file, "utf8");
    for (const [key, value] of Object.entries(updates)) {
        const line = `${key}=${value}`;
        const re = new RegExp(`^${key}=.*$`, "m");
        text = re.test(text) ? text.replace(re, line) : text.replace(/\s*$/, `\n${line}\n`);
    }
    fs.writeFileSync(file, text);
    return true;
}

/**
 * B1: deploy TrivvoHuntEscrow to World Chain Sepolia (D8). The contract is unchanged; only the network moves.
 * The escrow works with any ERC20 (each hunt names its token), so the reward token is just config:
 *   USDC_MODE=mock   (default) also deploys our MockUSDC and mints test USDC to the shop wallet
 *   USDC_MODE=circle uses Circle's official test USDC (for the final demo)
 *
 * contracts/.env:
 *   PRIVATE_KEY=0x...        deployer + backend operator, with test ETH on World Chain Sepolia
 *   VENDOR_ADDRESS=0x...     optional: who gets the minted MockUSDC
 *
 * Usage: npx hardhat run scripts/deploy-worldchain.ts --network worldchainSepolia
 */
const USDC_CIRCLE = "0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88"; // checked on chain: USDC, 6 decimals
const EXPLORER = "https://sepolia.worldscan.org";
const MINT_TO_VENDOR = 10_000;

async function main() {
    const local = network.name === "hardhat" || network.name === "localhost"; // dry runs
    if (network.config.chainId !== 4801 && !local) throw new Error("Run with --network worldchainSepolia");
    const [deployer] = await ethers.getSigners();
    if (!deployer) throw new Error("PRIVATE_KEY is not set in contracts/.env");
    const eth = await ethers.provider.getBalance(deployer.address);
    console.log("Deployer:", deployer.address, `(${ethers.formatEther(eth)} ETH)`);
    if (eth === 0n) throw new Error("Deployer has no ETH. Send it some test ETH on World Chain Sepolia first.");

    const escrow = await (await ethers.getContractFactory("TrivvoHuntEscrow")).deploy(deployer.address);
    await escrow.waitForDeployment();
    const escrowAddress = await escrow.getAddress();
    console.log("TrivvoHuntEscrow:", escrowAddress);

    let usdc = USDC_CIRCLE;
    if ((process.env.USDC_MODE || "mock") === "mock") {
        const mock = await (await ethers.getContractFactory("MockUSDC")).deploy();
        await mock.waitForDeployment();
        usdc = await mock.getAddress();
        console.log("MockUSDC:        ", usdc);
        if (process.env.VENDOR_ADDRESS) {
            await (await mock.mint(process.env.VENDOR_ADDRESS, ethers.parseUnits(String(MINT_TO_VENDOR), 6))).wait();
            console.log(`Minted ${MINT_TO_VENDOR} USDC to shop wallet ${process.env.VENDOR_ADDRESS}`);
        }
    }

    console.log("\nExplorer:", `${EXPLORER}/address/${escrowAddress}`);

    // On a real deploy, wire the addresses straight into the env files so there's no copy-paste.
    if (!local) {
        const root = path.resolve(__dirname, "..", "..");
        const backendEnv = path.join(root, "backend", ".env");
        const frontendEnv = path.join(root, "frontend", ".env");
        const b = patchEnv(backendEnv, { HUNT_ESCROW_ADDRESS: escrowAddress, USDC_TOKEN_ADDRESS: usdc });
        // frontend/.env may not exist yet — create it with the two VITE vars.
        if (!fs.existsSync(frontendEnv)) {
            fs.writeFileSync(
                frontendEnv,
                `VITE_HUNT_ESCROW_ADDRESS=${escrowAddress}\nVITE_USDC_TOKEN_ADDRESS=${usdc}\n`
            );
        } else {
            patchEnv(frontendEnv, { VITE_HUNT_ESCROW_ADDRESS: escrowAddress, VITE_USDC_TOKEN_ADDRESS: usdc });
        }
        console.log(`\nWrote: backend/.env ${b ? "✓" : "(missing)"}, frontend/.env ✓`);
    } else {
        console.log("\n(dry run — env files not touched)");
        console.log("backend/.env:  HUNT_ESCROW_ADDRESS, USDC_TOKEN_ADDRESS");
        console.log("frontend/.env: VITE_HUNT_ESCROW_ADDRESS, VITE_USDC_TOKEN_ADDRESS");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
