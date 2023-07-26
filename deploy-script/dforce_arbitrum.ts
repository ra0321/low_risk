import { ethers, upgrades, run } from "hardhat";
import "@openzeppelin/hardhat-upgrades";
import {
  StorageV3__factory,
  MultiLogic__factory,
  SwapGateway__factory,
  SwapGatewayLib__factory,
  DForceStatistics__factory,
  StrategyStatisticsLib__factory,
  DForceLogic__factory,
  LendBorrowLendStrategyHelper__factory,
  DForceStrategy__factory,
} from "../typechain-types";
import "@tenderly/hardhat-tenderly";

/*
  uniswapV3Router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  DODOV2Proxy02: "0x88CBf433471A0CD8240D2a12354362988b4593E5",
  iDF: "0xaEa8e2e7C97C5B7Cd545d3b152F669bAE29C4a63",
  DF: "0xaE6aab43C4f3E0cea4Ab83752C278f8dEbabA689",
  BLID: "0x81dE4945807bb31425362F8F7109C18E3dc4f8F0",
  USDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
  USX_USDC: "0x9340e3296121507318874ce9C04AFb4492aF0284",
  USDC: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
  comptroller: "0x8E7e9eA9023B81457Ae7E6D2a51b003D421E5408",
  rainMaker: "0xF45e2ae152384D50d4e9b08b8A1f65F0d96786C3",
  expense: "0x43ad0f0585659a68faA72FE276e48B9d2a23B117",
  storageAddress: "0xf62DF962140fB24FA74DbE15E8e8450a8d533245",
  multiLogicAddress: "0x192677acC6F9Eeb38B5aC5EB4b69A6C3C2aD7DCF",
  swapGatewayLibAddress: "0x1458A5233F573dC2b37C18b49c70a3669a5BdB87",
  swapGatewayAddress: "0xC3C0e851f441913B2Eb8FAf70dC9a212C1Cd1CFD",
  strategyStatisticsLibAddress: "0x7e8136bdE9b66048fBFAa61a93F89eD97B47761d",
  dForceStatisticsAddress: "0x9320f256a99B331f070C5F88013eE72f3D70679a",
  dForceLogicAddress: "0x4029a95a8915900fF7DBDB483C920798e0C4BD78",
  lendBorrowLendStrategyHelperAddress: "0x16477d927647acB01B88162Bbc40F54b38ae1f47",
  dForceStrategyAddress: "0xE3ef4e4523ffa9a2E63cb3D8c85c603E94553120"
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
  // let storageContract = await upgrades.deployProxy(storageFactory, [], {
  //   initializer: "initialize",
  //   unsafeAllow: ["constructor"],
  // });
  // await storageContract.deployed();
  // let storageAddress = storageContract.address;

  // console.log("Storage Address: ", storageAddress);

  // console.log("Verifying: Storage ", storageAddress);
  // await run("verify", {
  //   address: storageAddress,
  //   constructorArguments: [],
  // });

  // console.log("Storage deployed.");


  /********************************************** Deploy MultiLogic *************************************************************** */
  // const multiLogicFactory = await ethers.getContractFactory("MultiLogic");
  // let multiLogicContract = await upgrades.deployProxy(multiLogicFactory, [], {
  //   initializer: "__MultiLogicProxy_init",
  // });
  // await multiLogicContract.deployed();
  // let multiLogicAddress = multiLogicContract.address;

  // console.log("MultiLogic Address: ", multiLogicAddress);

  // tx = await multiLogicContract.connect(contractDeployer).setStorage("0xf62DF962140fB24FA74DbE15E8e8450a8d533245");
  // await tx.wait(1);

  // console.log("Verifying: MultiLogic ", multiLogicAddress);
  // await run("verify", {
  //   address: multiLogicAddress,
  //   constructorArguments: [],
  // });

  // console.log("MultiLogic deployed.");


  /************************************************** Deploy SwapGateway ************************************************************ */
  // const swapGatewayLibFactory = await ethers.getContractFactory("SwapGatewayLib");
  // let swapGatewayLib = await swapGatewayLibFactory.connect(contractDeployer).deploy();
  // await swapGatewayLib.deployed();
  // let swapGatewayLibAddress = swapGatewayLib.address;

  // console.log("SwapGatewayLib Address:", swapGatewayLibAddress);

  // console.log("Verifying: SwapGatewayLib ", swapGatewayLibAddress);
  // await run("verify", {
  //   address: swapGatewayLibAddress,
  //   constructorArguments: [],
  // });

  // console.log("SwapGatewayLib deployed.");

  // const swapGatewayFactory = await ethers.getContractFactory("SwapGateway", {
  //   libraries: {
  //     SwapGatewayLib: swapGatewayLibAddress,
  //   },
  // });
  // let swapGatewayContract = await upgrades.deployProxy(swapGatewayFactory, [], {
  //   initializer: "__SwapGateway_init",
  //   unsafeAllowLinkedLibraries: true,
  //   timeout: 0,
  // });
  // await swapGatewayContract.deployed();
  // let swapGatewayAddress = swapGatewayContract.address;

  // console.log("SwapGateway Address: ", swapGatewayAddress);

  // tx = await swapGatewayContract.connect(contractDeployer).addSwapRouter("0xE592427A0AEce92De3Edee1F18E0157C05861564", 3); // add uniswapV3Router
  // await tx.wait(1);
  // tx = await swapGatewayContract.connect(contractDeployer).addSwapRouter("0x88CBf433471A0CD8240D2a12354362988b4593E5", 4); // add DODOV2Proxy02
  // await tx.wait(1);

  // console.log("Verifying: SwapGateway ", swapGatewayAddress);
  // await run("verify", {
  //   address: swapGatewayAddress,
  //   constructorArguments: [],
  // });

  // console.log("SwapGateway deployed.");


  /************************************************** Deploy Statistics ************************************************************ */
  // const strategyStatisticsLibFactory = await ethers.getContractFactory("StrategyStatisticsLib");
  // let strategyStatisticsLib = await strategyStatisticsLibFactory.connect(contractDeployer).deploy();
  // await strategyStatisticsLib.deployed();
  // let strategyStatisticsLibAddress = strategyStatisticsLib.address;

  // console.log("StrategyStatisticsLib Address:", strategyStatisticsLibAddress);

  // console.log("Verifying: StrategyStatisticsLib ", strategyStatisticsLibAddress);
  // await run("verify", {
  //   address: strategyStatisticsLibAddress,
  //   constructorArguments: [],
  // });

  // console.log("StrategyStatisticsLib deployed.");

  // const dForceStatisticsFactory = await ethers.getContractFactory("DForceStatistics", {
  //   libraries: {
  //     StrategyStatisticsLib: strategyStatisticsLibAddress,
  //   },
  // });
  // let dForceStatisticsContract = await upgrades.deployProxy(dForceStatisticsFactory, [], {
  //   initializer: "__StrategyStatistics_init",
  //   unsafeAllowLinkedLibraries: true,
  //   timeout: 0,
  // });
  // await dForceStatisticsContract.deployed();
  // let dForceStatisticsAddress = dForceStatisticsContract.address;

  // console.log("DForceStatistics Address: ", dForceStatisticsAddress);

  // console.log("Verifying: DForceStatistics ", dForceStatisticsAddress);
  // await run("verify", {
  //   address: dForceStatisticsAddress,
  //   constructorArguments: [],
  // });

  // tx = await dForceStatisticsContract.connect(contractDeployer).setSwapGateway("0xC3C0e851f441913B2Eb8FAf70dC9a212C1Cd1CFD");
  // await tx.wait(1);
  // tx = await dForceStatisticsContract.connect(contractDeployer).setRewardsXToken("0xaEa8e2e7C97C5B7Cd545d3b152F669bAE29C4a63"); // iDF
  // await tx.wait(1);
  // tx = await dForceStatisticsContract.connect(contractDeployer).setBLID("0x81dE4945807bb31425362F8F7109C18E3dc4f8F0"); // BLID
  // await tx.wait(1);
  // tx = await dForceStatisticsContract.connect(contractDeployer).setBLIDSwap("0xE592427A0AEce92De3Edee1F18E0157C05861564", ["0x81dE4945807bb31425362F8F7109C18E3dc4f8F0", "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"]); // uniswapV3Router, [blid, USDT]
  // await tx.wait(1);
  // tx = await dForceStatisticsContract.connect(contractDeployer).setPriceOracle("0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7"); // USDT
  // await tx.wait(1);
  // tx = await dForceStatisticsContract.connect(contractDeployer).setPriceOracle("0x9340e3296121507318874ce9C04AFb4492aF0284", "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3"); // USX_USDC
  // await tx.wait(1);
  // tx = await dForceStatisticsContract.connect(contractDeployer).setPriceOracle("0x0000000000000000000000000000000000000000", "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612"); // ETH
  // await tx.wait(1);
  // tx = await dForceStatisticsContract.connect(contractDeployer).setPriceOracle("0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3"); // USDC
  // await tx.wait(1);

  // console.log("DForceStatistics deployed.");


  /************************************************** Deploy Logic ************************************************************ */
  // const dForceLogicFactory = await ethers.getContractFactory("DForceLogic");
  // let dForceLogicContract = await upgrades.deployProxy(
  //   dForceLogicFactory,
  //   ["0x8E7e9eA9023B81457Ae7E6D2a51b003D421E5408", "0xF45e2ae152384D50d4e9b08b8A1f65F0d96786C3"],
  //   {
  //     initializer: "__LendingLogic_init",
  //     timeout: 0,
  //   }
  // );
  // await dForceLogicContract.deployed();
  // let dForceLogicAddress = dForceLogicContract.address;

  // console.log("DForceLogic Address: ", dForceLogicAddress);

  // tx = await dForceLogicContract.connect(contractDeployer).setExpenseAddress("0x43ad0f0585659a68faA72FE276e48B9d2a23B117");
  // await tx.wait(1);
  // tx = await dForceLogicContract.connect(contractDeployer).setMultiLogicProxy("0x192677acC6F9Eeb38B5aC5EB4b69A6C3C2aD7DCF");
  // await tx.wait(1);
  // tx = await dForceLogicContract.connect(contractDeployer).setBLID("0x81dE4945807bb31425362F8F7109C18E3dc4f8F0");
  // await tx.wait(1);
  // tx = await dForceLogicContract.connect(contractDeployer).setSwapGateway("0xC3C0e851f441913B2Eb8FAf70dC9a212C1Cd1CFD");
  // await tx.wait(1);
  // tx = await dForceLogicContract.connect(contractDeployer).approveTokenForSwap("0xC3C0e851f441913B2Eb8FAf70dC9a212C1Cd1CFD", "0x81dE4945807bb31425362F8F7109C18E3dc4f8F0"); // BLID
  // await tx.wait(1);
  // tx = await dForceLogicContract.connect(contractDeployer).approveTokenForSwap("0xC3C0e851f441913B2Eb8FAf70dC9a212C1Cd1CFD", "0xaE6aab43C4f3E0cea4Ab83752C278f8dEbabA689"); // DF
  // await tx.wait(1);
  // tx = await dForceLogicContract.connect(contractDeployer).approveTokenForSwap("0xC3C0e851f441913B2Eb8FAf70dC9a212C1Cd1CFD", "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8"); // USDC
  // await tx.wait(1);

  // await run("verify", {
  //   address: dForceLogicAddress,
  //   constructorArguments: [],
  // });

  // console.log("DForceLogic deployed.");

  /************************************************** Deploy Strategy ************************************************************ */
  // const lendBorrowLendStrategyHelperFactory = await ethers.getContractFactory("LendBorrowLendStrategyHelper");
  // let lendBorrowLendStrategyHelper = await lendBorrowLendStrategyHelperFactory.connect(contractDeployer).deploy();
  // await lendBorrowLendStrategyHelper.deployed();
  // let lendBorrowLendStrategyHelperAddress = lendBorrowLendStrategyHelper.address;

  // console.log("LendBorrowLendStrategyHelper Address:", lendBorrowLendStrategyHelperAddress);

  // await run("verify", {
  //   address: lendBorrowLendStrategyHelperAddress,
  //   constructorArguments: [],
  // });

  // console.log("LendBorrowLendStrategyHelper deployed.");

  // const dForceStrategyFactory = await ethers.getContractFactory("DForceStrategy", {
  //   libraries: {
  //     LendBorrowLendStrategyHelper: lendBorrowLendStrategyHelperAddress,
  //   },
  // });
  // let dForceStrategyContract = await upgrades.deployProxy(
  //   dForceStrategyFactory,
  //   ["0x8E7e9eA9023B81457Ae7E6D2a51b003D421E5408", "0x4029a95a8915900fF7DBDB483C920798e0C4BD78"],
  //   {
  //     initializer: "__Strategy_init",
  //     unsafeAllowLinkedLibraries: true,
  //     timeout: 0,
  //   }
  // );
  // await dForceStrategyContract.deployed();
  // let dForceStrategyAddress = dForceStrategyContract.address;

  // console.log("DForceStrategy Address: ", dForceStrategyAddress);

  // tx = await dForceStrategyContract.connect(contractDeployer).setBLID("0x81dE4945807bb31425362F8F7109C18E3dc4f8F0");
  // await tx.wait(1);
  // tx = await dForceStrategyContract.connect(contractDeployer).setMultiLogicProxy("0x192677acC6F9Eeb38B5aC5EB4b69A6C3C2aD7DCF");
  // await tx.wait(1);
  // tx = await dForceStrategyContract.connect(contractDeployer).setStrategyStatistics("0x9320f256a99B331f070C5F88013eE72f3D70679a");
  // await tx.wait(1);
  // tx = await dForceStrategyContract.connect(contractDeployer).setCirclesCount(10);
  // await tx.wait(1);
  // tx = await dForceStrategyContract.connect(contractDeployer).setAvoidLiquidationFactor(5);
  // await tx.wait(1);
  // tx = await dForceStrategyContract.connect(contractDeployer).setRebalanceParameter("800000000000000000", "850000000000000000");
  // await tx.wait(1);
  // tx = await dForceStrategyContract.connect(contractDeployer).setMinBLIDPerRewardsToken(0);
  // await tx.wait(1);
  // tx = await dForceStrategyContract.connect(contractDeployer).setRewardsTokenPriceDeviationLimit("3472222222200");
  // await tx.wait(1);
  
  // let dForceLogicContract = DForceLogic__factory.connect("0x4029a95a8915900fF7DBDB483C920798e0C4BD78", contractDeployer);
  // tx = await dForceLogicContract.connect(contractDeployer).setAdmin(dForceStrategyAddress);
  // await tx.wait(1);

  // await run("verify", {
  //   address: dForceStrategyAddress,
  //   constructorArguments: [],
  // });

  // console.log("DForceStrategy deployed.");

  /************************************************** MultiLogic Init ************************************************************ */
  let multiLogicContract = MultiLogic__factory.connect("0x192677acC6F9Eeb38B5aC5EB4b69A6C3C2aD7DCF", contractDeployer);

  const strategiesName = [
    "USDC-USX",
  ];
  let strategies = [];
  // @ts-ignore
  strategies.push({
    logicContract: "0x4029a95a8915900fF7DBDB483C920798e0C4BD78",
    strategyContract: "0xE3ef4e4523ffa9a2E63cb3D8c85c603E94553120",
  });

  tx = await multiLogicContract.connect(contractDeployer).initStrategies(strategiesName, strategies);
  await tx.wait(1);
  tx = await multiLogicContract.connect(contractDeployer).setPercentages("0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", [10000]); // USDC
  await tx.wait(1);

  console.log("MultiLogic initialized successfully");

  /************************************************** Storage Init ************************************************************ */
  // let storageContract = StorageV3__factory.connect("0xd35Db39aF0755AfFbF63E15162EB6923409d021e", contractDeployer);

  // tx = await storageContract.connect(contractDeployer).setBLID("0x048C6bAd48C51436764ed1FdB3c9D1c25d2C0ada");
  // await tx.wait(1);
  // tx = await storageContract.connect(contractDeployer).setMultiLogicProxy("0x755ae94087F3014f525CB5Bc6Eb577D261D759E1");
  // await tx.wait(1);
  // tx = await storageContract.connect(contractDeployer).addToken("0x7F5c764cBc14f9669B88837ca1490cCa17c31607", "0x16a9FA2FDa030272Ce99B29CF780dFA30361E0f3"); // USDC
  // await tx.wait(1);
  // tx = await storageContract.connect(contractDeployer).addToken("0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", "0xECef79E109e997bCA29c1c0897ec9d7b03647F5E"); // USDT
  // await tx.wait(1);

  // console.log("Storage initialized successfully");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });