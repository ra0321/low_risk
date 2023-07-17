import { ethers, tenderly } from "hardhat";
import "@openzeppelin/hardhat-upgrades";
import {
  StorageV3__factory,
  MultiLogic__factory,
} from "../typechain-types";
import "@tenderly/hardhat-tenderly";

/*
  storageAddress: "0xd35Db39aF0755AfFbF63E15162EB6923409d021e",
  multiLogicAddress: ""
*/

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

  const storageFactory = await ethers.getContractFactory("StorageV3");
  const multiLogicFactory = await ethers.getContractFactory("MultiLogic");

  // // Deploy Storage
  // let storageContract = await storageFactory.connect(contractDeployer).deploy();
  // await storageContract.deployed();
  // let storageAddress = storageContract.address;

  // console.log("Storage Address: ", storageAddress);

  // await tenderly.verify({
  //   address: storageAddress,
  //   name: "StorageV3",
  // });

  // console.log("Storage deployed.");


  // Deploy MultiLogic
  let multiLogicContract = await upgrades.deployProxy(multiLogicFactory, [], {
    initializer: "__MultiLogicProxy_init",
  });
  await multiLogicContract.deployed();
  let multiLogicAddress = multiLogicContract.address;

  console.log("MultiLogic Address: ", multiLogicAddress);

  await hre.run("verify:verify", {
    address: multiLogicAddress,
    constructorArguments: [],
  });

  console.log("MultiLogic deployed.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });