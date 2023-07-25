import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-web3';
import '@openzeppelin/hardhat-upgrades';
import '@typechain/hardhat';
import "@nomicfoundation/hardhat-toolbox";

import * as tdly from "@tenderly/hardhat-tenderly";
import * as dotenv from "dotenv";

dotenv.config();
tdly.setup();

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
  networks: {
    arbitrumOne: {
      url: process.env.ARBITRUMONE_RPC_URL ?? "",
      accounts: [process.env.MAINNET_PRIVATE_KEY ?? ""],
    },
    arbitrumGoerli: {
      url: process.env.ARBITRUMGOERLI_RPC_URL ?? "",
      accounts: [process.env.MAINNET_PRIVATE_KEY ?? ""],
    },
    tenderly: {
      url: process.env.OPTIMISM_RPC_URL ?? "",
      accounts: [process.env.MAINNET_PRIVATE_KEY ?? ""],
    },
  },
  tenderly: {
    project: "Project",
    username: "alphanetra",
    privateVerification: true,
  },
  etherscan: {
    apiKey: {
      arbitrumOne: 'JWEPP1A57KZPWD7JPXK9B64AJRSJRTVTDG',
      arbitrumGoerli: 'JWEPP1A57KZPWD7JPXK9B64AJRSJRTVTDG'
    }
  }
};
