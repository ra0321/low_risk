import { ethers, tenderly } from "hardhat";
import "@openzeppelin/hardhat-upgrades";
import {
  StorageV3__factory,
  MultiLogic__factory,
  SwapGateway__factory,
  SwapGatewayLib__factory,
} from "../typechain-types";
import "@tenderly/hardhat-tenderly";

/*
  storageAddress: "0xd35Db39aF0755AfFbF63E15162EB6923409d021e",
  multiLogicAddress: "0x755ae94087F3014f525CB5Bc6Eb577D261D759E1",
  swapGatewayLibAddress: "0x1458A5233F573dC2b37C18b49c70a3669a5BdB87",
  swapGatewayAddress: "0x2B4704532b51CfF0f088F24aC8E67024ab715925"
*/

let tx;

async function main() {
  const [contractDeployer] = await ethers.getSigners();
  await contractDeployer.getAddress().catch((e) => {
    console.log("\nERROR: Ledger needs to be unlocked\n");
    process.exit(1);
  });
  await contractDeployer.getChainId().catch((e) => {
    console.log("\nERROR: Open Etheruem app on the Ledger.\n");
    process.exit(1);
  });

  /********************************************************* Deploy Storage ***************************************************** */
  // const storageFactory = await ethers.getContractFactory("StorageV3");
  // let storageContract = await storageFactory.connect(contractDeployer).deploy();
  // await storageContract.deployed();
  // let storageAddress = storageContract.address;

  // console.log("Storage Address: ", storageAddress);

  // await tenderly.verify({
  //   address: storageAddress,
  //   name: "StorageV3",
  // });

  // console.log("Storage deployed.");


  /********************************************** Deploy MultiLogic *************************************************************** */
  // const multiLogicFactory = await ethers.getContractFactory("MultiLogic");
  // let multiLogicContract = await multiLogicFactory.connect(contractDeployer).deploy();
  // await multiLogicContract.deployed();
  // let multiLogicAddress = multiLogicContract.address;

  // console.log("MultiLogic Address: ", multiLogicAddress);

  // tx = await multiLogicContract.connect(contractDeployer).__MultiLogicProxy_init();
  // await tx.wait(1);
  // tx = await multiLogicContract.connect(contractDeployer).setStorage("0xd35Db39aF0755AfFbF63E15162EB6923409d021e");
  // await tx.wait(1);

  // await tenderly.verify({
  //   address: multiLogicAddress,
  //   name: "MultiLogic",
  // });

  // console.log("MultiLogic deployed.");


  /************************************************** Deploy SwapGateway ************************************************************ */
  const swapGatewayLibFactory = await ethers.getContractFactory("SwapGatewayLib");
  let swapGatewayLib = await swapGatewayLibFactory.connect(contractDeployer).deploy();
  await swapGatewayLib.deployed();
  let swapGatewayLibAddress = swapGatewayLib.address;

  console.log("SwapGatewayLib Address:", swapGatewayLibAddress);

  await tenderly.verify({
    address: swapGatewayLibAddress,
    name: "SwapGatewayLib",
  });

  console.log("SwapGatewayLib deployed.");

  const swapGatewayFactory = await ethers.getContractFactory("SwapGateway", {
    libraries: {
      SwapGatewayLib: "0x1458A5233F573dC2b37C18b49c70a3669a5BdB87",
    },
  });
  let swapGatewayContract = await swapGatewayFactory.connect(contractDeployer).deploy();
  await swapGatewayContract.deployed();
  let swapGatewayAddress = swapGatewayContract.address;

  console.log("SwapGateway Address: ", swapGatewayAddress);

  tx = await swapGatewayContract.connect(contractDeployer).__SwapGateway_init();
  await tx.wait(1);
  tx = await swapGatewayContract.connect(contractDeployer).addSwapRouter("0xE592427A0AEce92De3Edee1F18E0157C05861564", 3); // add uniswapV3Router
  await tx.wait(1);
  tx = await swapGatewayContract.connect(contractDeployer).addSwapRouter("0xfD9D2827AD469B72B69329dAA325ba7AfbDb3C98", 4); // add DODOV2Proxy02
  await tx.wait(1);

  await tenderly.verify({
    address: swapGatewayAddress,
    name: "SwapGateway",
  });

  console.log("SwapGateway deployed.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });