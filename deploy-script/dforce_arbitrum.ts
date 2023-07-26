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
  iUSDC: "0x8dc3312c68125a94916d62B97bb5D925f84d4aE0",
  USX: "0x641441c631e2F909700d2f41FD87F0aA6A6b4EDb",
  iUSX: "0x0385F851060c09A552F1A28Ea3f612660256cBAA",
  DF_USX: "0x19E5910F61882Ff6605b576922507F1E1A0302FE",
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

const uniswapV3Router = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const DODOV2Proxy02 = "0x88CBf433471A0CD8240D2a12354362988b4593E5";
const iDF = "0xaEa8e2e7C97C5B7Cd545d3b152F669bAE29C4a63";
const DF = "0xaE6aab43C4f3E0cea4Ab83752C278f8dEbabA689";
const BLID = "0x81dE4945807bb31425362F8F7109C18E3dc4f8F0";
const USDT = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
const USX_USDC = "0x9340e3296121507318874ce9C04AFb4492aF0284";
const USDC = "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8";
const iUSDC = "0x8dc3312c68125a94916d62B97bb5D925f84d4aE0";
const USX = "0x641441c631e2F909700d2f41FD87F0aA6A6b4EDb";
const iUSX = "0x0385F851060c09A552F1A28Ea3f612660256cBAA";
const DF_USX = "0x19E5910F61882Ff6605b576922507F1E1A0302FE";
const comptroller = "0x8E7e9eA9023B81457Ae7E6D2a51b003D421E5408";
const rainMaker = "0xF45e2ae152384D50d4e9b08b8A1f65F0d96786C3";
const expense = "0x43ad0f0585659a68faA72FE276e48B9d2a23B117";

let storageAddress = "0xf62DF962140fB24FA74DbE15E8e8450a8d533245";
let multiLogicAddress = "0x192677acC6F9Eeb38B5aC5EB4b69A6C3C2aD7DCF";
let swapGatewayLibAddress = "0x1458A5233F573dC2b37C18b49c70a3669a5BdB87";
let swapGatewayAddress = "0xC3C0e851f441913B2Eb8FAf70dC9a212C1Cd1CFD";
let strategyStatisticsLibAddress = "0x7e8136bdE9b66048fBFAa61a93F89eD97B47761d";
let dForceStatisticsAddress = "0x9320f256a99B331f070C5F88013eE72f3D70679a";
let dForceLogicAddress = "0x4029a95a8915900fF7DBDB483C920798e0C4BD78";
let lendBorrowLendStrategyHelperAddress = "0x16477d927647acB01B88162Bbc40F54b38ae1f47";
let dForceStrategyAddress = "0xE3ef4e4523ffa9a2E63cb3D8c85c603E94553120";

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

  // tx = await multiLogicContract.connect(contractDeployer).setStorage(storageAddress);
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

  // tx = await swapGatewayContract.connect(contractDeployer).addSwapRouter(uniswapV3Router, 3); // add uniswapV3Router
  // await tx.wait(1);
  // tx = await swapGatewayContract.connect(contractDeployer).addSwapRouter(DODOV2Proxy02, 4); // add DODOV2Proxy02
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

  // tx = await dForceStatisticsContract.connect(contractDeployer).setSwapGateway(swapGatewayAddress);
  // await tx.wait(1);
  // tx = await dForceStatisticsContract.connect(contractDeployer).setRewardsXToken(iDF); // iDF
  // await tx.wait(1);
  // tx = await dForceStatisticsContract.connect(contractDeployer).setBLID(BLID); // BLID
  // await tx.wait(1);
  // tx = await dForceStatisticsContract.connect(contractDeployer).setBLIDSwap(uniswapV3Router, [BLID, USDT]); // uniswapV3Router, [blid, USDT]
  // await tx.wait(1);
  // tx = await dForceStatisticsContract.connect(contractDeployer).setPriceOracle(USDT, "0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7"); // USDT
  // await tx.wait(1);
  // tx = await dForceStatisticsContract.connect(contractDeployer).setPriceOracle(USX_USDC, "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3"); // USX_USDC
  // await tx.wait(1);
  // tx = await dForceStatisticsContract.connect(contractDeployer).setPriceOracle("0x0000000000000000000000000000000000000000", "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612"); // ETH
  // await tx.wait(1);
  // tx = await dForceStatisticsContract.connect(contractDeployer).setPriceOracle(USDC, "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3"); // USDC
  // await tx.wait(1);

  // console.log("DForceStatistics deployed.");


  /************************************************** Deploy Logic ************************************************************ */
  // const dForceLogicFactory = await ethers.getContractFactory("DForceLogic");
  // let dForceLogicContract = await upgrades.deployProxy(
  //   dForceLogicFactory,
  //   [comptroller, rainMaker],
  //   {
  //     initializer: "__LendingLogic_init",
  //     timeout: 0,
  //   }
  // );
  // await dForceLogicContract.deployed();
  // let dForceLogicAddress = dForceLogicContract.address;

  // console.log("DForceLogic Address: ", dForceLogicAddress);

  // tx = await dForceLogicContract.connect(contractDeployer).setExpenseAddress(expense);
  // await tx.wait(1);
  // tx = await dForceLogicContract.connect(contractDeployer).setMultiLogicProxy(multiLogicAddress);
  // await tx.wait(1);
  // tx = await dForceLogicContract.connect(contractDeployer).setBLID(BLID);
  // await tx.wait(1);
  // tx = await dForceLogicContract.connect(contractDeployer).setSwapGateway(swapGatewayAddress);
  // await tx.wait(1);
  // tx = await dForceLogicContract.connect(contractDeployer).approveTokenForSwap(swapGatewayAddress, BLID); // BLID
  // await tx.wait(1);
  // tx = await dForceLogicContract.connect(contractDeployer).approveTokenForSwap(swapGatewayAddress, DF); // DF
  // await tx.wait(1);
  // tx = await dForceLogicContract.connect(contractDeployer).approveTokenForSwap(swapGatewayAddress, USDC); // USDC
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
  //   [comptroller, dForceLogicAddress],
  //   {
  //     initializer: "__Strategy_init",
  //     unsafeAllowLinkedLibraries: true,
  //     timeout: 0,
  //   }
  // );
  // await dForceStrategyContract.deployed();
  // let dForceStrategyAddress = dForceStrategyContract.address;

  // console.log("DForceStrategy Address: ", dForceStrategyAddress);

  // tx = await dForceStrategyContract.connect(contractDeployer).setBLID(BLID);
  // await tx.wait(1);
  // tx = await dForceStrategyContract.connect(contractDeployer).setMultiLogicProxy(multiLogicAddress);
  // await tx.wait(1);
  // tx = await dForceStrategyContract.connect(contractDeployer).setStrategyStatistics(dForceStatisticsAddress);
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
  
  // let dForceLogicContract = DForceLogic__factory.connect(dForceLogicAddress, contractDeployer);
  // tx = await dForceLogicContract.connect(contractDeployer).setAdmin(dForceStrategyAddress);
  // await tx.wait(1);

  // await run("verify", {
  //   address: dForceStrategyAddress,
  //   constructorArguments: [],
  // });

  // console.log("DForceStrategy deployed.");

  /************************************************** MultiLogic Init ************************************************************ */
  // let multiLogicContract = MultiLogic__factory.connect(multiLogicAddress, contractDeployer);

  // const strategiesName = [
  //   "USDC-USX",
  // ];
  // let strategies = [];
  // // @ts-ignore
  // strategies.push({
  //   logicContract: dForceLogicAddress,
  //   strategyContract: dForceStrategyAddress,
  // });

  // tx = await multiLogicContract.connect(contractDeployer).initStrategies(strategiesName, strategies);
  // await tx.wait(1);
  // tx = await multiLogicContract.connect(contractDeployer).setPercentages(USDC, [10000]); // USDC
  // await tx.wait(1);

  // console.log("MultiLogic initialized successfully");

  /************************************************** Storage Init ************************************************************ */
  // let storageContract = StorageV3__factory.connect(storageAddress, contractDeployer);

  // tx = await storageContract.connect(contractDeployer).setBLID(BLID);
  // await tx.wait(1);
  // tx = await storageContract.connect(contractDeployer).setMultiLogicProxy(multiLogicAddress);
  // await tx.wait(1);
  // tx = await storageContract.connect(contractDeployer).addToken(USDC, "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3"); // USDC
  // await tx.wait(1);
  // tx = await storageContract.connect(contractDeployer).addToken(USDT, "0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7"); // USDT
  // await tx.wait(1);

  // console.log("Storage initialized successfully");

  /************************************************** USDC - USX Strategy ************************************************************ */
  let strategyContract = DForceStrategy__factory.connect(dForceStrategyAddress, contractDeployer);

  console.log("setSupplyXToken - iUSDC")
  tx = await strategyContract.connect(contractDeployer).setSupplyXToken(iUSDC);
  await tx.wait(1);
  console.log("setStrategyXToken - iUSX")
  tx = await strategyContract.connect(contractDeployer).setStrategyXToken(iUSX);
  await tx.wait(1);
  console.log("setMinStorageAvailable - 1 USD");
  tx = await strategyContract.connect(contractDeployer).setMinStorageAvailable("1000000");
  await tx.wait(1);

  console.log(
    "RewardsToBLID - DODOV2Proxy02:DF-USX-USDC, UniswapV3:USDC-USDT-BLID"
  );
  tx = await strategyContract.connect(contractDeployer).setSwapInfo(
    {
      swapRouters: [DODOV2Proxy02, uniswapV3Router],
      paths: [
        [
          DF,
          DF_USX,
          USX_USDC,
          USDC,
        ],
        [
          USDC,
          USDT,
          BLID
        ],
      ],
    },
    0
  );
  await tx.wait(1);

  console.log("RewardsToStrategy - DODOV2Proxy02:DF-USX");
  tx = await strategyContract.connect(contractDeployer).setSwapInfo(
    {
      swapRouters: [DODOV2Proxy02],
      paths: [
        [
          DF,
          DF_USX,
          USX,
        ],
      ],
    },
    1
  );
  await tx.wait(1);

  console.log("StrategyToBLID - DODOV2Proxy02:USX-USDC, UniswapV3:USDC-USDT-BLID");
  tx = await strategyContract.connect(contractDeployer).setSwapInfo(
    {
      swapRouters: [DODOV2Proxy02, uniswapV3Router],
      paths: [
        [
          USX,
          USX_USDC,
          USDC,
        ],
        [
          USDC,
          USDT,
          BLID
        ],
      ],
    },
    2
  );
  await tx.wait(1);

  console.log("StrategyToSupply - DODOV2Proxy02:USX-USDC");
  tx = await strategyContract.connect(contractDeployer).setSwapInfo(
    {
      swapRouters: [DODOV2Proxy02],
      paths: [
        [
          USX,
          USX_USDC,
          USDC,
        ],
      ],
    },
    3
  );
  await tx.wait(1);

  console.log("SupplyToBLID - UniswapV3:USDC-USDT-BLID");
  tx = await strategyContract.connect(contractDeployer).setSwapInfo(
    {
      swapRouters: [uniswapV3Router],
      paths: [
        [
          USDC,
          USDT,
          BLID
        ],
      ],
    },
    4
  );
  await tx.wait(1);

  console.log("Strategy setup successfully");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });