import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-web3';
import '@openzeppelin/hardhat-upgrades';
import '@typechain/hardhat';
import "@nomicfoundation/hardhat-toolbox";

module.exports = {
  solidity: {
    version: '0.8.13',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  typechain: {
    outDir: 'typechain-types',
    target: 'ethers-v5',
  },
};
