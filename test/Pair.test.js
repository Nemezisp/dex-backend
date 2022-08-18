const { developmentChains } = require("../helper-hardhat-config");
const { network, getNamedAccounts, ethers, deployments } = require("hardhat");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Pair Unit Tests", function () {

        beforeEach(async function () {
            deployer = (await getNamedAccounts()).deployer;
            await deployments.fixture(["all"]);
            tokenA = await ethers.getContract("TokenA", deployer);
            tokenB = await ethers.getContract("TokenB", deployer);
            router = await ethers.getContract("Router", deployer)
            factory = await ethers.getContract("Factory", deployer);
            const createTx = await factory.createPair(tokenA.address, tokenB.address)
            const createReceipt = await createTx.wait(1)
            const pairAddress = createReceipt.events[0].args[2]
            pair = await ethers.getContractAt("Pair", pairAddress)
            factoryPair = await ethers.getContractAt("Pair", pairAddress, factory.address)
        });

        describe("constructor", function () {
            it("sets factory address correctly", async function () {
                await assert.equal(factory.address, await pair.i_factory())
            });
        })

        describe("mintLiquidityTokens", function () {
            it("reverts if called by not factory", async function() {
                await expect(pair.mintLiquidityTokens(deployer, 1, 1)).to.be.revertedWith(
                    "Pair__OnlyRouterCanRequestMint"
                );
            })
        })

        describe("removeLiquidity", function () {
            it("reverts if called by not factory", async function() {
                await expect(pair.removeLiquidity(deployer, 100)).to.be.revertedWith(
                    "Pair__OnlyRouterCanRequestRemoval"
                );
            })
        })

        describe("initializePair", function () {
            it("reverts if initialize called by not factory", async function () {
                await expect(pair.initializePair(tokenA.address, tokenB.address)).to.be.revertedWith(
                    "Pair__OnlyFactoryCanInitialize"
                );
            })

            it("correctly sets token addresses", async function() {
                const pairTokenAddresses = await pair.getTokens()
                assert.equal(tokenA.address, pairTokenAddresses[0])
                assert.equal(tokenB.address, pairTokenAddresses[1])
            })
        })

        describe("getTokenAmounts", function() {
            it("correctly returns token amounts in contract", async function() {
                const tokenTransferAmount = ethers.utils.parseEther("1000")
                await tokenA.transfer(pair.address, tokenTransferAmount)
                const tokenAmounts = await pair.getTokenAmounts()
                assert.equal(tokenAmounts[0].toString(), tokenTransferAmount.toString())
                assert.equal(tokenAmounts[1].toString(), "0")
            })
        })

        describe("transferTo", function() {
            it("reverts when called by not router", async function() {
                const tokenTransferAmount = ethers.utils.parseEther("1")
                await expect(pair.transferTo(deployer, tokenA.address, tokenTransferAmount)).to.be.revertedWith(
                    "Pair__OnlyRouterCanRequestTransfers"
                );
            })
        })

        describe("getRatesPerLiquidityToken", function() {
            it("returns correct rates", async function() {
                const tokenAAddLiquidityAmount = ethers.utils.parseEther("1000")
                const tokenBAddLiquidityAmount = ethers.utils.parseEther("1000")
                await tokenA.approve(router.address, tokenAAddLiquidityAmount)
                await tokenB.approve(router.address, tokenBAddLiquidityAmount)
                await router.addLiquidity(tokenA.address, tokenB.address, tokenAAddLiquidityAmount, tokenBAddLiquidityAmount)
                const response = await pair.getRatesPerLiquidityToken()
                const firstTokenRate = response[1]
                const secondTokenRate = response[3]
                assert.equal(ethers.utils.formatEther(firstTokenRate), 1)
                assert.equal(ethers.utils.formatEther(secondTokenRate), 1)
            })
        })
    });
