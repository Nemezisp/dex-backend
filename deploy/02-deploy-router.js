const { developmentChains } = require("../helper-hardhat-config");
const { network, ethers } = require("hardhat");
const { verify } = require("../utils/verify");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();

    const args = [];
    const router = await deploy("Router", {
        from: deployer,
        args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        await verify(router.address, args);
    }
    log("------------------------------------");
};

module.exports.tags = ["all", "router"];
