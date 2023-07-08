
const { deployProxy } = require('@openzeppelin/truffle-upgrades');

const StorageV2 = artifacts.require("StorageV2");

module.exports = async function (deployer, something, accounts) {
  await deployProxy(StorageV2, [accounts[1]], { deployer: deployer, initializer: 'initialize' });
};