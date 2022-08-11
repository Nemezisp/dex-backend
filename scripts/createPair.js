const { ethers, network } = require("hardhat");
const { moveBlocks } = require("../utils/move-blocks");

const create = async () => {
    const factory = await ethers.getContract("Factory");
    const tokenA = await ethers.getContract("TokenA")
    const tokenB = await ethers.getContract("TokenB")

    console.log("Creating...");
    const tx = await factory.createPair(tokenA.address, tokenB.address);
    const receipt = await tx.wait(1);
    console.log("Created!");

    if (network.config.chainId == "31337") {
        await moveBlocks(2, 1000);
    }
};

create()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
