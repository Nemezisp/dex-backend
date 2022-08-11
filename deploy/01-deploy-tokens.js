const { developmentChains } = require("../helper-hardhat-config");
const { network, ethers } = require("hardhat");
const { verify } = require("../utils/verify");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();

    const initialSupplyA = ethers.utils.parseEther("10000")
    const initialSupplyB = ethers.utils.parseEther("10000")

    const argsA = [initialSupplyA];
    const tokenA = await deploy("TokenA", {
        from: deployer,
        args: argsA,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    const argsB = [initialSupplyB];
    const tokenB = await deploy("TokenB", {
        from: deployer,
        args: argsB,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        await verify(tokenA.address, argsA);
        await verify(tokenB.address, argsB);
    }
    log("------------------------------------");
};

module.exports.tags = ["all", "tokens"];
