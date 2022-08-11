const { ethers, network } = require("hardhat");
const { moveBlocks } = require("../utils/move-blocks");

const addLiquidity = async () => {
    const addAmountA = ethers.utils.parseEther("100")
    const addAmountB = ethers.utils.parseEther("300")

    const router = await ethers.getContract("Router");
    const tokenA = await ethers.getContract("TokenA")
    const tokenB = await ethers.getContract("TokenB")

    await tokenA.approve(router.address, addAmountA)
    await tokenB.approve(router.address, addAmountB)

    console.log("Adding...");
    const tx = await router.addLiquidity(tokenA.address, tokenB.address, addAmountA, addAmountB);
    await tx.wait(1);
    console.log("Liquidity Added!");

    if (network.config.chainId == "31337") {
        await moveBlocks(2, 1000);
    }
};

addLiquidity()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
