const { developmentChains } = require("../helper-hardhat-config");
const { network } = require("hardhat");
const { verify } = require("../utils/verify");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();

    const router = await ethers.getContract("Router", deployer)

    const args = [router.address];
    const factory = await deploy("Factory", {
        from: deployer,
        args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    await router.initializeFactoryAddress(factory.address)

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        await verify(factory.address, args);
    }
    log("------------------------------------");
};

module.exports.tags = ["all", "factory"];
