# Decentralized Crypto Token Exchange - Backend
Frontend code in [repo](https://github.com/Nemezisp/dex-frontend).\
Live version at https://dexerc20.vercel.app/.

## Description
Swap between any ERC20 tokens (choose from the list or add any token using its address).\
Create new liquidity pairs, add or remove liquidity.

## Stack
Frontend built in **React + Next.js**.

Using **Moralis** for Web3 connection.

Backend - developed using **Hardhat**.

**Solidity** contracts deployed to Kovan testnet:
- sample ERC20 tokens
- Factory (responsible for new pair creation)
- Router (responsible for most actions, swapping tokens, adding and removing liquidity)
- Pair (for each created pair, holds all the pair liquidity, also acts as a liquidity token)

Set of smart contract **tests with Waffle/Mocha/Chai**.
