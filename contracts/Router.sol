// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./interfaces/IFactory.sol";
import "./interfaces/IPair.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error Router__PairDoesNotExist();
error Router__NoLiquidity();
error Router__MinAmountTooLow();
error Router__LiquidityTooLow();
error Router__FactoryAlreadyInitialized();

contract Router is Ownable{

    event Swap(address indexed firstToken, address indexed secondToken, uint256 firstSold, uint256 secondBought);

    address public s_factory;

    function initializeFactoryAddress(address factory) public onlyOwner{
        s_factory = factory;
        renounceOwnership();
    }

    function addLiquidity(address firstToken, address secondToken, uint256 firstAmount, uint256 secondAmount) external {
        address pairAddress = IFactory(s_factory).getPairAddress(firstToken, secondToken);
        if (pairAddress == address(0)) {
            pairAddress = IFactory(s_factory).createPair(firstToken, secondToken);
        }

        uint256 firstAmountIn;
        uint256 secondAmountIn;
        (address firstTokenInPair, ) = IPair(pairAddress).getTokens();
        if (firstToken == firstTokenInPair) {
             (firstAmountIn, secondAmountIn) = IPair(pairAddress).getTokenAmounts();
        } else {
             (secondAmountIn, firstAmountIn) = IPair(pairAddress).getTokenAmounts();
        }

        uint256 firstAmountToTransfer;
        uint256 secondAmountToTransfer;
        if (firstAmountIn == 0 && secondAmountIn == 0) {
            firstAmountToTransfer = firstAmount;
            secondAmountToTransfer = secondAmount;
        } else {
            uint256 optimalSecondAmount = firstAmount*secondAmountIn/firstAmountIn;
            if (optimalSecondAmount > secondAmount) {
                uint256 optimalFirstAmount = secondAmount*secondAmountIn/firstAmountIn;
                firstAmountToTransfer = optimalFirstAmount;
                secondAmountToTransfer = secondAmount;
            } else {
                firstAmountToTransfer = firstAmount;
                secondAmountToTransfer = optimalSecondAmount;
            }
        }

        IERC20(firstToken).transferFrom(msg.sender, pairAddress, firstAmountToTransfer);
        IERC20(secondToken).transferFrom(msg.sender, pairAddress, secondAmountToTransfer);

        IPair(pairAddress).mintLiquidityTokens(msg.sender, firstAmountIn, secondAmountIn);
    }

    function removeLiquidity (address firstToken, address secondToken, uint256 amount) external {
        address pairAddress = IFactory(s_factory).getPairAddress(firstToken, secondToken);
        if (pairAddress == address(0)) {
            revert Router__PairDoesNotExist();
        }

        IERC20(pairAddress).transferFrom(msg.sender, pairAddress, amount);
        IPair(pairAddress).removeLiquidity(msg.sender, amount);
    }

    function getQuote(address tokenToSell, address tokenToBuy, uint256 tokenToSellAmount) public view returns(uint256) {
        address pairAddress = IFactory(s_factory).getPairAddress(tokenToSell, tokenToBuy);
        if (pairAddress == address(0)) {
            revert Router__PairDoesNotExist();
        }

        (address firstToken, ) = IPair(pairAddress).getTokens();
        uint256 sellTokenAmount;
        uint256 buyTokenAmount;
        if (firstToken == tokenToSell) {
            (sellTokenAmount, buyTokenAmount) = IPair(pairAddress).getTokenAmounts();
        } else {
            (buyTokenAmount, sellTokenAmount) = IPair(pairAddress).getTokenAmounts();
        }

        if (sellTokenAmount == 0 || buyTokenAmount == 0) {
            revert Router__NoLiquidity();
        }

        uint256 quote = tokenToSellAmount*buyTokenAmount/sellTokenAmount;
        if (quote > buyTokenAmount) {
            revert Router__LiquidityTooLow();
        }

        return quote;
    }

    function swapTokens(address tokenToSell, address tokenToBuy, uint256 amountToSell, uint256 minAmountToBuy) external {
        uint256 quote = getQuote(tokenToSell, tokenToBuy, amountToSell);
        if (quote < minAmountToBuy) {
            revert Router__MinAmountTooLow();
        }

        address pairAddress = IFactory(s_factory).getPairAddress(tokenToSell, tokenToBuy);

        IERC20(tokenToSell).transferFrom(msg.sender, pairAddress, amountToSell);
        IPair(pairAddress).transferTo(msg.sender, tokenToBuy, quote);

        emit Swap(tokenToSell, tokenToBuy, amountToSell, quote);
    }
}