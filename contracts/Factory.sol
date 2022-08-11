// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./Pair.sol";

error Factory__SameToken();
error Factory__ZeroAddress();
error Factory__PairExists();

contract Factory {

    address immutable public i_router;

    mapping(address => mapping(address => address)) private s_pairs;
    
    event PairCreated(address indexed firstToken, address indexed secondToken, address pairAddress);

    constructor(address router) {
        i_router = router;
    }

    function createPair(address firstToken, address secondToken) external returns (address pairAddress) {
        if (firstToken == secondToken) {
            revert Factory__SameToken();
        }

        if (firstToken == address(0) || secondToken == address(0)) {
            revert Factory__ZeroAddress();
        }

        if (s_pairs[firstToken][secondToken] != address(0)) {
            revert Factory__PairExists();
        }

        Pair tokenPair = new Pair(i_router);
        address newPairAddress = tokenPair.initializePair(firstToken, secondToken);
        s_pairs[firstToken][secondToken] = newPairAddress;
        s_pairs[secondToken][firstToken] = newPairAddress;
        emit PairCreated(firstToken, secondToken, newPairAddress);
        return newPairAddress;
    }

    function getPairAddress(address firstToken, address secondToken) public view returns (address pairAddress) {
        return s_pairs[firstToken][secondToken];
    }
}