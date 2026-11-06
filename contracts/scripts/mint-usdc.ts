import { ethers } from "hardhat";

/**
 * Top up test USDC (MockUSDC only) for any wallet.
 * Usage: MOCK_USDC=0x... TO=0x... AMOUNT=10000 npx hardhat run scripts/mint-usdc.ts --network worldchainSepolia
 */
async function main() {
    const { MOCK_USDC, TO, AMOUNT = "10000" } = process.env;
    if (!MOCK_USDC || !TO) throw new Error("Set MOCK_USDC and TO");
    const usdc = await ethers.getContractAt("MockUSDC", MOCK_USDC);
    await (await usdc.mint(TO, ethers.parseUnits(AMOUNT, 6))).wait();
    console.log(`Minted ${AMOUNT} USDC to ${TO}. Balance: ${ethers.formatUnits(await usdc.balanceOf(TO), 6)}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
