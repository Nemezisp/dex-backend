// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

interface IFactory {
    event PairCreated(address indexed firstToken, address indexed secondToken, address pairAddress);

    function createPair(address firstToken, address secondToken) external returns (address pairAddress);

    function getPairAddress(address firstToken, address secondToken) external view returns (address pairAddress);
}