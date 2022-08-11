const { developmentChains } = require("../helper-hardhat-config");
const { network, getNamedAccounts, ethers, deployments } = require("hardhat");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Factory Unit Tests", function () {

        beforeEach(async function () {
            deployer = (await getNamedAccounts()).deployer;
            await deployments.fixture(["all"]);
            tokenA = await ethers.getContract("TokenA", deployer);
            tokenB = await ethers.getContract("TokenB", deployer);
            factory = await ethers.getContract("Factory", deployer);
            router = await ethers.getContract("Router", deployer)
        });

        describe("constructor", function() {
            it("sets the router address correctily", async function() {
                await assert.equal(router.address, await factory.i_router())
            })
        })

        describe("createPair", function () {
            it("reverts if same token given as both pair tokens", async function () {
                await expect(factory.createPair(tokenA.address, tokenA.address)).to.be.revertedWith(
                    "Factory__SameToken"
                );
            });

            it("reverts if zero address given as one of the tokens", async function () {
                await expect(factory.createPair(tokenA.address, ethers.constants.AddressZero)).to.be.revertedWith(
                    "Factory__ZeroAddress"
                );
            });

            it("reverts if pair exists", async function () {
                await factory.createPair(tokenA.address, tokenB.address)
                await expect(factory.createPair(tokenB.address, tokenA.address)).to.be.revertedWith(
                    "Factory__PairExists"
                );
            })

            it("updates pair mapping correctly after pair creation", async function () {
                const createTx = await factory.createPair(tokenA.address, tokenB.address)
                const createReceipt = await createTx.wait(1)
                const pairAddress = createReceipt.events[0].args[2]
                assert.equal(pairAddress, await(factory.getPairAddress(tokenA.address, tokenB.address)))
            })

            it("emits an event after pair created", async function() {
                await expect(factory.createPair(tokenB.address, tokenA.address)).to.emit(
                    factory,
                    "PairCreated"
                );
            })
        })
    });
