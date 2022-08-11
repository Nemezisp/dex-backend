const { developmentChains } = require("../helper-hardhat-config");
const { network, getNamedAccounts, ethers, deployments } = require("hardhat");
const { assert, expect } = require("chai");

const tokenATransferAmount = ethers.utils.parseEther("1000")
const tokenBTransferAmount = ethers.utils.parseEther("1000")
const tokenAAddLiquidityAmount = ethers.utils.parseEther("100")
const tokenBAddLiquidityAmount = ethers.utils.parseEther("200")
const quoteAmount = ethers.utils.parseEther("1");
const highQuoteAmount = ethers.utils.parseEther("1000")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Router Unit Tests", function () {

        beforeEach(async function () {
            deployer = (await getNamedAccounts()).deployer;
            user = (await getNamedAccounts()).user;
            await deployments.fixture(["all"]);
            tokenA = await ethers.getContract("TokenA", deployer);
            tokenB = await ethers.getContract("TokenB", deployer);
            tokenAUser = await ethers.getContract("TokenA", user);
            tokenBUser = await ethers.getContract("TokenB", user);
            factory = await ethers.getContract("Factory", deployer);
            router = await ethers.getContract("Router", deployer);
            routerUser = await ethers.getContract("Router", user)
            await tokenA.approve(router.address, ethers.utils.parseEther("10000"))
            await tokenB.approve(router.address, ethers.utils.parseEther("10000"))
            await tokenAUser.approve(router.address, ethers.utils.parseEther("10000"))
            await tokenBUser.approve(router.address, ethers.utils.parseEther("10000"))
        });

        describe("initializeFactoryAdrress", function () {
            it("sets factory address correctly", async function () {
                await assert.equal(factory.address, await router.s_factory())
            });

            it("reverts if we try to call it after address is already set", async function() {
                await expect(router.initializeFactoryAddress(factory.address)).to.be.revertedWith(
                    "Ownable: caller is not the owner"
                );
            })
        })

        
        describe("swapTokens", function () {
            beforeEach(async function () {
                const createTx = await factory.createPair(tokenA.address, tokenB.address)
                const creatReceipt = await createTx.wait(1)
                const pairAddress = creatReceipt.events[0].args[2]
                pair = await ethers.getContractAt("Pair", pairAddress)
                await router.addLiquidity(tokenA.address, tokenB.address, tokenAAddLiquidityAmount, tokenBAddLiquidityAmount)
            })

            it("reverts if quote too low", async function () {
                const tokensToSell = ethers.utils.parseEther("1")
                const minExpected = ethers.utils.parseEther("10")
                await expect(router.swapTokens(tokenA.address, tokenB.address, tokensToSell, minExpected)).to.be.revertedWith(
                    "Router__MinAmountTooLow"
                );
            })

            it("correctly swaps tokens", async function () {
                const deployerTokenABefore = await tokenA.balanceOf(deployer)
                const deployerTokenBBefore = await tokenB.balanceOf(deployer)
                const pairTokensBefore = await pair.getTokenAmounts()
                const pairTokenABefore = pairTokensBefore[0]
                const pairTokenBBefore = pairTokensBefore[1]
                const tokensToSell = ethers.utils.parseEther("1")
                const minExpected = await router.getQuote(tokenA.address, tokenB.address, tokensToSell)
                await router.swapTokens(tokenA.address, tokenB.address, tokensToSell, minExpected)
                const deployerTokenAAfter = await tokenA.balanceOf(deployer)
                const deployerTokenBAfter = await tokenB.balanceOf(deployer)
                const pairTokensAfter = await pair.getTokenAmounts()
                const pairTokenAAfter = pairTokensAfter[0]
                const pairTokenBAfter = pairTokensAfter[1]

                assert.equal(Number(deployerTokenBAfter) + Number(pairTokenBAfter), Number(deployerTokenBBefore) + Number(pairTokenBBefore))
                assert.equal(Number(deployerTokenAAfter) + Number(pairTokenAAfter), Number(deployerTokenABefore) + Number(pairTokenABefore))
                assert.isAbove(Number(deployerTokenBAfter), Number(deployerTokenBBefore))
                assert.isAbove(Number(pairTokenAAfter), Number(pairTokenABefore))
            })

            it("emits a swap event", async function() {
                const tokensToSell = ethers.utils.parseEther("1")
                const minExpected = await router.getQuote(tokenA.address, tokenB.address, tokensToSell)
                await expect(router.swapTokens(tokenA.address, tokenB.address, tokensToSell, minExpected)).to.emit(
                    router,
                    "Swap"
                );
            })
        })

        describe("getQuote", function () {
            it("reverts if pair does not exist", async function () {
                await expect(router.getQuote(tokenA.address, tokenB.address, quoteAmount)).to.be.revertedWith(
                    "Router__PairDoesNotExist"
                );
            })

            it("reverts if no liquidity", async function () {
                await factory.createPair(tokenA.address, tokenB.address)
                await expect(router.getQuote(tokenA.address, tokenB.address, quoteAmount)).to.be.revertedWith(
                    "Router__NoLiquidity"
                );
            })

            it("reverts if liquidity too low", async function () {
                await factory.createPair(tokenA.address, tokenB.address)
                await router.addLiquidity(tokenA.address, tokenB.address, tokenAAddLiquidityAmount, tokenBAddLiquidityAmount)
                await expect(router.getQuote(tokenA.address, tokenB.address, highQuoteAmount)).to.be.revertedWith(
                    "Router__LiquidityTooLow"
                );
            })

            it("returns the correct quote", async function () {
                const createTx = await factory.createPair(tokenA.address, tokenB.address)
                const creatReceipt = await createTx.wait(1)
                const pairAddress = creatReceipt.events[0].args[2]
                pair = await ethers.getContractAt("Pair", pairAddress)
                await router.addLiquidity(tokenA.address, tokenB.address, tokenAAddLiquidityAmount, tokenBAddLiquidityAmount)
                const quote = await router.getQuote(tokenA.address, tokenB.address, quoteAmount)
                assert.equal(quote.toString(), (quoteAmount.mul(tokenBAddLiquidityAmount).div(tokenAAddLiquidityAmount)).toString())
            })
        })

        describe("addLiquidity", function () {
            it("creates a new pair if pair does not exist", async function () {
                await router.addLiquidity(tokenA.address, tokenB.address, tokenAAddLiquidityAmount, tokenBAddLiquidityAmount)
                assert.notEqual(await factory.getPairAddress(tokenA.address, tokenB.address), ethers.constants.AddressZero)
            })

            it("adds full amounts if no tokens in the pool", async function () {
                const createTx = await factory.createPair(tokenA.address, tokenB.address)
                const creatReceipt = await createTx.wait(1)
                const pairAddress = creatReceipt.events[0].args[2]
                pair = await ethers.getContractAt("Pair", pairAddress)
                await router.addLiquidity(tokenA.address, tokenB.address, tokenAAddLiquidityAmount, tokenBAddLiquidityAmount)
                let tokenAmounts = await pair.getTokenAmounts()
                assert.equal(tokenAmounts[0].toString(), tokenAAddLiquidityAmount.toString())
                assert.equal(tokenAmounts[1].toString(), tokenBAddLiquidityAmount.toString())
            })

            it("adds optimal amount of tokens if tokens in the pool", async function() {
                const createTx = await factory.createPair(tokenA.address, tokenB.address)
                const creatReceipt = await createTx.wait(1)
                const pairAddress = creatReceipt.events[0].args[2]
                pair = await ethers.getContractAt("Pair", pairAddress)
                await tokenA.transfer(pair.address, tokenATransferAmount)
                await tokenB.transfer(pair.address, tokenBTransferAmount)
                await router.addLiquidity(tokenA.address, tokenB.address, tokenAAddLiquidityAmount, tokenBAddLiquidityAmount)
                let tokenAmounts = await pair.getTokenAmounts()
                // there is 1000 tokens A and 1000 tokens B in the pool, so we should add the same amount of both
                assert.equal((tokenAmounts[0] - tokenATransferAmount).toString(), tokenAAddLiquidityAmount.toString())
                assert.equal((tokenAmounts[1] - tokenBTransferAmount).toString(), tokenAAddLiquidityAmount.toString()) 
            })

            it("mints liquidity tokens and sends them to the person who added liquidity when adding liquidity first time", async function() {
                const createTx = await factory.createPair(tokenA.address, tokenB.address)
                const creatReceipt = await createTx.wait(1)
                const pairAddress = creatReceipt.events[0].args[2]
                pair = await ethers.getContractAt("Pair", pairAddress)
                await router.addLiquidity(tokenA.address, tokenB.address, ethers.utils.parseEther("100"), ethers.utils.parseEther("100"))
                assert.equal((await pair.totalSupply()).toString(), ethers.utils.parseEther("100").toString())
                assert.equal((await pair.balanceOf(deployer)).toString(), ethers.utils.parseEther("100").toString())
            })

            it("mints liquidity tokens and sends them to the person who added liquidity when liquidity present", async function() {
                const createTx = await factory.createPair(tokenA.address, tokenB.address)
                const creatReceipt = await createTx.wait(1)
                const pairAddress = creatReceipt.events[0].args[2]
                pair = await ethers.getContractAt("Pair", pairAddress)
                await router.addLiquidity(tokenA.address, tokenB.address, ethers.utils.parseEther("100"), ethers.utils.parseEther("100"))
                await tokenA.transfer(user, ethers.utils.parseEther("200"))
                await tokenB.transfer(user, ethers.utils.parseEther("400"))
                await routerUser.addLiquidity(tokenA.address, tokenB.address, ethers.utils.parseEther("200"), ethers.utils.parseEther("400"))
                assert.equal((await pair.totalSupply()).toString(), ethers.utils.parseEther("300").toString())
                assert.equal((await pair.balanceOf(user)).toString(), ethers.utils.parseEther("200").toString())
            })
        })

        describe("removeLiquidity", function () {
            it("reverts if pair does not exist", async function () {
                await expect(router.removeLiquidity(tokenA.address, tokenB.address, ethers.utils.parseEther("100"))).to.be.revertedWith(
                    "Router__PairDoesNotExist"
                );
            })

            it("reverts if we try to remove more liquidty than we should be able to", async function() {
                await factory.createPair(tokenA.address, tokenB.address)
                await router.addLiquidity(tokenA.address, tokenB.address, ethers.utils.parseEther("100"), ethers.utils.parseEther("100"))
                await tokenA.transfer(user, ethers.utils.parseEther("500"))
                await tokenB.transfer(user, ethers.utils.parseEther("500"))
                await routerUser.addLiquidity(tokenA.address, tokenB.address, ethers.utils.parseEther("500"), ethers.utils.parseEther("500"))
                await expect(router.removeLiquidity(tokenA.address, tokenB.address, ethers.utils.parseEther("300"))).to.be.reverted;
            })

            it("burns removed liquidity tokens", async function() {
                const createTx = await factory.createPair(tokenA.address, tokenB.address)
                const creatReceipt = await createTx.wait(1)
                const pairAddress = creatReceipt.events[0].args[2]
                pair = await ethers.getContractAt("Pair", pairAddress)
                await pair.approve(router.address, ethers.utils.parseEther("10000"))
                await router.addLiquidity(tokenA.address, tokenB.address, ethers.utils.parseEther("100"), ethers.utils.parseEther("100"))
                await tokenA.transfer(user, ethers.utils.parseEther("500"))
                await tokenB.transfer(user, ethers.utils.parseEther("500"))
                await routerUser.addLiquidity(tokenA.address, tokenB.address, ethers.utils.parseEther("500"), ethers.utils.parseEther("500"))
                await router.removeLiquidity(tokenA.address, tokenB.address, ethers.utils.parseEther("100"));
                assert.equal((await pair.totalSupply()).toString(), ethers.utils.parseEther("500").toString())
            })

            it("transfers correct amount of tokens to the user who removes liquidity", async function() {
                const createTx = await factory.createPair(tokenA.address, tokenB.address)
                const creatReceipt = await createTx.wait(1)
                const pairAddress = creatReceipt.events[0].args[2]
                pair = await ethers.getContractAt("Pair", pairAddress, user)
                await pair.approve(router.address, ethers.utils.parseEther("10000"))
                await router.addLiquidity(tokenA.address, tokenB.address, ethers.utils.parseEther("100"), ethers.utils.parseEther("100"))
                await tokenA.transfer(user, ethers.utils.parseEther("500"))
                await tokenB.transfer(user, ethers.utils.parseEther("500"))
                await routerUser.addLiquidity(tokenA.address, tokenB.address, ethers.utils.parseEther("500"), ethers.utils.parseEther("500"))
                assert.equal((await tokenA.balanceOf(user)).toString(), ethers.utils.parseEther("0").toString())
                assert.equal((await tokenB.balanceOf(user)).toString(), ethers.utils.parseEther("0").toString())
                await routerUser.removeLiquidity(tokenA.address, tokenB.address, ethers.utils.parseEther("300"));
                assert.equal((await tokenA.balanceOf(user)).toString(), ethers.utils.parseEther("300").toString())
                assert.equal((await tokenB.balanceOf(user)).toString(), ethers.utils.parseEther("300").toString())
            })
        })
    });
