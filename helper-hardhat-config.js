const networkConfig = {
    4: {
        name: "rinkeby",
        blockConfirmations: 6,
    },
    31337: {
        name: "hardhat",
    },
};

const developmentChains = ["hardhat", "localhost"];

module.exports = {
    networkConfig,
    developmentChains,
};
