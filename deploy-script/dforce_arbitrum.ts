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
  USX_USDC: "0x9340e3296121507318874ce9C04AFb4492aF0284", // need to change
  USDC: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
  comptroller: "0x8E7e9eA9023B81457Ae7E6D2a51b003D421E5408",
  rainMaker: "0xF45e2ae152384D50d4e9b08b8A1f65F0d96786C3",
  expense: "0x43ad0f0585659a68faA72FE276e48B9d2a23B117",
  storageAddress: "0xf62DF962140fB24FA74DbE15E8e8450a8d533245",
  multiLogicAddress: "0x192677acC6F9Eeb38B5aC5EB4b69A6C3C2aD7DCF",
  swapGatewayLibAddress: "0x1458A5233F573dC2b37C18b49c70a3669a5BdB87",
  swapGatewayAddress: "0xC3C0e851f441913B2Eb8FAf70dC9a212C1Cd1CFD",




  
  strategyStatisticsLibAddress: "0xaE8635c2DaDd100febCb75091383f4aECeB472Ee",
  dForceStatisticsAddress: "0xaD5B9972993D90C2A67bfEf11473A06Ab649afc2",
  dForceLogicAddress: "0xc0c32D453705148d32B083150FbdF6FA72712E01",
  lendBorrowLendStrategyHelperAddress: "0x823A790e7672afcAFe8CE408aA1f5EFf6bc3ccd7",
  dForceStrategyAddress: "0xA4f7CAA548bd1Cf778932F0b3Ccd9f599542FB2d"
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
  const swapGatewayLibFactory = await ethers.getContractFactory("SwapGatewayLib");
  let swapGatewayLib = await swapGatewayLibFactory.connect(contractDeployer).deploy();
  await swapGatewayLib.deployed();
  let swapGatewayLibAddress = swapGatewayLib.address;

  console.log("SwapGatewayLib Address:", swapGatewayLibAddress);

  console.log("Verifying: SwapGatewayLib ", swapGatewayLibAddress);
  await run("verify", {
    address: swapGatewayLibAddress,
    constructorArguments: [],
  });

  console.log("SwapGatewayLib deployed.");

  const swapGatewayFactory = await ethers.getContractFactory("SwapGateway", {
    libraries: {
      SwapGatewayLib: swapGatewayLibAddress,
    },
  });
  let swapGatewayContract = await upgrades.deployProxy(swapGatewayFactory, [], {
    initializer: "__SwapGateway_init",
    unsafeAllowLinkedLibraries: true,
    timeout: 0,
  });
  await swapGatewayContract.deployed();
  let swapGatewayAddress = swapGatewayContract.address;

  console.log("SwapGateway Address: ", swapGatewayAddress);

  tx = await swapGatewayContract.connect(contractDeployer).addSwapRouter("0xE592427A0AEce92De3Edee1F18E0157C05861564", 3); // add uniswapV3Router
  await tx.wait(1);
  tx = await swapGatewayContract.connect(contractDeployer).addSwapRouter("0x88CBf433471A0CD8240D2a12354362988b4593E5", 4); // add DODOV2Proxy02
  await tx.wait(1);

  console.log("Verifying: SwapGateway ", swapGatewayAddress);
  await run("verify", {
    address: swapGatewayAddress,
    constructorArguments: [],
  });

  console.log("SwapGateway deployed.");


  /************************************************** Deploy Statistics ************************************************************ */
  // const strategyStatisticsLibFactory = await ethers.getContractFactory("StrategyStatisticsLib");
  // let strategyStatisticsLib = await strategyStatisticsLibFactory.connect(contractDeployer).deploy();
  // await strategyStatisticsLib.deployed();
  // let strategyStatisticsLibAddress = strategyStatisticsLib.address;

  // console.log("StrategyStatisticsLib Address:", strategyStatisticsLibAddress);

  // await tenderly.verify({
  //   address: strategyStatisticsLibAddress,
  //   name: "StrategyStatisticsLib",
  // });

  // console.log("StrategyStatisticsLib deployed.");

  // const dForceStatisticsFactory = await ethers.getContractFactory("DForceStatistics", {
  //   libraries: {
  //     StrategyStatisticsLib: strategyStatisticsLibAddress,
  //   },
  // });
  // let dForceStatisticsContract = await dForceStatisticsFactory.connect(contractDeployer).deploy();
  // await dForceStatisticsContract.deployed();
  // let dForceStatisticsAddress = dForceStatisticsContract.address;

  // console.log("DForceStatistics Address: ", dForceStatisticsAddress);

  // tx = await dForceStatisticsContract.connect(contractDeployer).__StrategyStatistics_init();
  // await tx.wait(1);
  // tx = await dForceStatisticsContract.connect(contractDeployer).setSwapGateway("0x16477d927647acB01B88162Bbc40F54b38ae1f47");
  // await tx.wait(1);
  // tx = await dForceStatisticsContract.connect(contractDeployer).setRewardsXToken("0x6832364e9538Db15655FA84A497f2927F74A6cE6"); // iDF
  // await tx.wait(1);
  // tx = await dForceStatisticsContract.connect(contractDeployer).setBLID("0x048C6bAd48C51436764ed1FdB3c9D1c25d2C0ada"); // BLID
  // await tx.wait(1);
  // tx = await dForceStatisticsContract.connect(contractDeployer).setBLIDSwap("0xE592427A0AEce92De3Edee1F18E0157C05861564", ["0x048C6bAd48C51436764ed1FdB3c9D1c25d2C0ada", "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58"]); // uniswapV3Router, [blid, USDT]
  // await tx.wait(1);
  // tx = await dForceStatisticsContract.connect(contractDeployer).setPriceOracle("0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", "0xECef79E109e997bCA29c1c0897ec9d7b03647F5E"); // USDT
  // await tx.wait(1);
  // tx = await dForceStatisticsContract.connect(contractDeployer).setPriceOracle("0x9340e3296121507318874ce9C04AFb4492aF0284", "0x16a9FA2FDa030272Ce99B29CF780dFA30361E0f3"); // USX_USDC
  // await tx.wait(1);
  // tx = await dForceStatisticsContract.connect(contractDeployer).setPriceOracle("0x0000000000000000000000000000000000000000", "0x13e3Ee699D1909E989722E753853AE30b17e08c5"); // ETH
  // await tx.wait(1);
  // tx = await dForceStatisticsContract.connect(contractDeployer).setPriceOracle("0x7F5c764cBc14f9669B88837ca1490cCa17c31607", "0x16a9FA2FDa030272Ce99B29CF780dFA30361E0f3"); // USDC
  // await tx.wait(1);

  // await tenderly.verify({
  //   address: dForceStatisticsAddress,
  //   name: "DForceStatistics",
  // });

  // console.log("DForceStatistics deployed.");


  /************************************************** Deploy Logic ************************************************************ */
  // const dForceLogicFactory = await ethers.getContractFactory("DForceLogic");
  // let dForceLogicContract = await dForceLogicFactory.connect(contractDeployer).deploy();
  // await dForceLogicContract.deployed();
  // let dForceLogicAddress = dForceLogicContract.address;

  // console.log("DForceLogic Address: ", dForceLogicAddress);

  // tx = await dForceLogicContract.connect(contractDeployer).__LendingLogic_init("0xA300A84D8970718Dac32f54F61Bd568142d8BCF4", "0x870ac6a76A30742800609F205c741E86Db9b71a2");
  // await tx.wait(1);
  // tx = await dForceLogicContract.connect(contractDeployer).setExpenseAddress("0x43ad0f0585659a68faA72FE276e48B9d2a23B117");
  // await tx.wait(1);
  // tx = await dForceLogicContract.connect(contractDeployer).setMultiLogicProxy("0x755ae94087F3014f525CB5Bc6Eb577D261D759E1");
  // await tx.wait(1);
  // tx = await dForceLogicContract.connect(contractDeployer).setBLID("0x048C6bAd48C51436764ed1FdB3c9D1c25d2C0ada");
  // await tx.wait(1);
  // tx = await dForceLogicContract.connect(contractDeployer).setSwapGateway("0x16477d927647acB01B88162Bbc40F54b38ae1f47");
  // await tx.wait(1);
  // tx = await dForceLogicContract.connect(contractDeployer).approveTokenForSwap("0x16477d927647acB01B88162Bbc40F54b38ae1f47", "0x048C6bAd48C51436764ed1FdB3c9D1c25d2C0ada"); // BLID
  // await tx.wait(1);
  // tx = await dForceLogicContract.connect(contractDeployer).approveTokenForSwap("0x16477d927647acB01B88162Bbc40F54b38ae1f47", "0x9e5AAC1Ba1a2e6aEd6b32689DFcF62A509Ca96f3"); // DF
  // await tx.wait(1);
  // tx = await dForceLogicContract.connect(contractDeployer).approveTokenForSwap("0x16477d927647acB01B88162Bbc40F54b38ae1f47", "0x7F5c764cBc14f9669B88837ca1490cCa17c31607"); // USDC
  // await tx.wait(1);

  // await tenderly.verify({
  //   address: dForceLogicAddress,
  //   name: "DForceLogic",
  // });

  // console.log("DForceLogic deployed.");

  /************************************************** Deploy Strategy ************************************************************ */
  // const lendBorrowLendStrategyHelperFactory = await ethers.getContractFactory("LendBorrowLendStrategyHelper");
  // let lendBorrowLendStrategyHelper = await lendBorrowLendStrategyHelperFactory.connect(contractDeployer).deploy();
  // await lendBorrowLendStrategyHelper.deployed();
  // let lendBorrowLendStrategyHelperAddress = lendBorrowLendStrategyHelper.address;

  // console.log("LendBorrowLendStrategyHelper Address:", lendBorrowLendStrategyHelperAddress);

  // await tenderly.verify({
  //   address: lendBorrowLendStrategyHelperAddress,
  //   name: "LendBorrowLendStrategyHelper",
  // });

  // console.log("LendBorrowLendStrategyHelper deployed.");

  // const dForceStrategyFactory = await ethers.getContractFactory("DForceStrategy", {
  //   libraries: {
  //     LendBorrowLendStrategyHelper: lendBorrowLendStrategyHelperAddress,
  //   },
  // });
  // let dForceStrategyContract = await dForceStrategyFactory.connect(contractDeployer).deploy();
  // await dForceStrategyContract.deployed();
  // let dForceStrategyAddress = dForceStrategyContract.address;

  // console.log("DForceStrategy Address: ", dForceStrategyAddress);

  // tx = await dForceStrategyContract.connect(contractDeployer).__Strategy_init("0xA300A84D8970718Dac32f54F61Bd568142d8BCF4", "0xc0c32D453705148d32B083150FbdF6FA72712E01");
  // await tx.wait(1);
  // tx = await dForceStrategyContract.connect(contractDeployer).setBLID("0x048C6bAd48C51436764ed1FdB3c9D1c25d2C0ada");
  // await tx.wait(1);
  // tx = await dForceStrategyContract.connect(contractDeployer).setMultiLogicProxy("0x755ae94087F3014f525CB5Bc6Eb577D261D759E1");
  // await tx.wait(1);
  // tx = await dForceStrategyContract.connect(contractDeployer).setStrategyStatistics("0xaD5B9972993D90C2A67bfEf11473A06Ab649afc2");
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
  
  // let dForceLogicContract = DForceLogic__factory.connect("0xc0c32D453705148d32B083150FbdF6FA72712E01", contractDeployer);
  // tx = await dForceLogicContract.connect(contractDeployer).setAdmin(dForceStrategyAddress);
  // await tx.wait(1);

  // await tenderly.verify({
  //   address: dForceStrategyAddress,
  //   name: "DForceStrategy",
  // });

  // console.log("DForceStrategy deployed.");

  /************************************************** MultiLogic Init ************************************************************ */
  // let multiLogicContract = MultiLogic__factory.connect("0x755ae94087F3014f525CB5Bc6Eb577D261D759E1", contractDeployer);

  // const strategiesName = [
  //   "USDC-USDT",
  // ];
  // let strategies = [];
  // // @ts-ignore
  // strategies.push({
  //   logicContract: "0xc0c32D453705148d32B083150FbdF6FA72712E01",
  //   strategyContract: "0xA4f7CAA548bd1Cf778932F0b3Ccd9f599542FB2d",
  // });

  // tx = await multiLogicContract.connect(contractDeployer).initStrategies(strategiesName, strategies);
  // await tx.wait(1);
  // tx = await multiLogicContract.connect(contractDeployer).setPercentages("0x7F5c764cBc14f9669B88837ca1490cCa17c31607", [10000]); // USDC
  // await tx.wait(1);

  // console.log("MultiLogic initialized successfully");

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