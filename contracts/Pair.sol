// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

error Pair__OnlyFactoryCanInitialize();
error Pair__OnlyRouterCanRequestTransfers();
error Pair__OnlyRouterCanRequestMint();
error Pair__OnlyRouterCanRequestRemoval();
error Pair__NotEnoughLiquidityBurned();

contract Pair is ERC20 {
    address immutable public i_factory;
    address immutable public i_router;

    address private s_firstToken;
    address private s_secondToken;
    
    constructor(address router) ERC20("LiquidityToken", "LQT") {
        i_factory = msg.sender;
        i_router = router;
    }

    function initializePair(address firstToken, address secondToken) external returns (address pairAddress) {
        if(msg.sender != i_factory) {
            revert Pair__OnlyFactoryCanInitialize(); 
        }
        s_firstToken = firstToken;
        s_secondToken = secondToken;

        return address(this);
    }

    function transferTo(address to, address token, uint256 amount) external {
        if (msg.sender != i_router) {
            revert Pair__OnlyRouterCanRequestTransfers(); 
        }
        ERC20(token).transfer(to, amount);
    }

    function mintLiquidityTokens(address to, uint256 firstAmountBefore, uint256 secondAmountBefore) external {
        if (msg.sender != i_router) {
            revert Pair__OnlyRouterCanRequestMint(); 
        }

        uint256 liquidityTokensAmount;
        (uint256 firstTokenAmount, uint256 secondTokenAmount) = getTokenAmounts();
        uint256 firstTokenTransferred = firstTokenAmount - firstAmountBefore;
        uint256 secondTokenTransferred = secondTokenAmount - secondAmountBefore;

        uint256 totalSupply = totalSupply();

        if (totalSupply == 0) {
            liquidityTokensAmount = sqrt(firstTokenTransferred * secondTokenTransferred);
        } else {
            liquidityTokensAmount = min(firstTokenTransferred*totalSupply/firstAmountBefore, secondTokenTransferred*totalSupply/secondAmountBefore);
        }

        _mint(to, liquidityTokensAmount);
    }

    function removeLiquidity(address to, uint256 liquidityTokenAmount) external {
        if (msg.sender != i_router) {
            revert Pair__OnlyRouterCanRequestRemoval(); 
        }

        uint256 totalSupply = totalSupply();
        (uint256 firstTokenAmount, uint256 secondTokenAmount) = getTokenAmounts();

        uint256 firstAmountToTransfer = liquidityTokenAmount * firstTokenAmount / totalSupply; 
        uint256 secondAmountToTransfer = liquidityTokenAmount * secondTokenAmount / totalSupply; 

        if(firstAmountToTransfer == 0 || secondAmountToTransfer == 0) {
            revert Pair__NotEnoughLiquidityBurned();
        } 

        _burn(address(this), liquidityTokenAmount);
        IERC20(s_firstToken).transfer(to, firstAmountToTransfer);
        IERC20(s_secondToken).transfer(to, secondAmountToTransfer);
    }

    function getRatesPerLiquidityToken() public view returns (address firstToken, uint256 firstTokenRate, address secondToken, uint256 secondTokenRate) {
        uint256 totalSupply = totalSupply();
        (uint256 firstTokenAmount, uint256 secondTokenAmount) = getTokenAmounts();

        return (s_firstToken, 1000000000000000000*firstTokenAmount/totalSupply, s_secondToken, 1000000000000000000*secondTokenAmount/totalSupply);
    }

    function getTokenAmounts() public view returns (uint256 firstTokenAmount, uint256 secondTokenAmount) {
        return (ERC20(s_firstToken).balanceOf(address(this)), ERC20(s_secondToken).balanceOf(address(this)));
    }

    function getTokens() public view returns (address firstToken, address secondToken) {
        return (s_firstToken, s_secondToken);
    }

    function sqrt(uint y) internal pure returns (uint z) {
        if (y > 3) {
            z = y;
            uint x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function min(uint x, uint y) internal pure returns (uint z) {
        z = x < y ? x : y;
    }
}