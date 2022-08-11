const { network } = require("hardhat");

const sleep = (timeInMs) => {
    return new Promise((resolve) => setTimeout(resolve, timeInMs));
};

async function moveBlocks(amount, sleepAmount = 0) {
    console.log("Moving blocks...");
    for (let index = 0; index < amount; index++) {
        await network.provider.request({
            method: "evm_mine",
            params: [],
        });
        if (sleepAmount) {
            await sleep(sleepAmount);
        }
    }
}

module.exports = {
    moveBlocks,
    sleep,
};
