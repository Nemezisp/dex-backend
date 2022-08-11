// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPair is IERC20 {
    function initializePair(address firstToken, address secondToken) external returns (address pairAddress);

    function getTokenAmounts() external view returns (uint256 firstTokenAmount, uint256 secondTokenAmount);

    function getTokens() external view returns (address firstToken, address secondToken);

    function transferTo(address to, address token, uint256 amount) external;
    
    function mintLiquidityTokens(address to, uint256 firstAmountBefore, uint256 secondAmountBefore) external;

    function removeLiquidity(address to, uint256 liquidityTokenAmount) external;
}