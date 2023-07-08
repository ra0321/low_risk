/*******************************************
 * Test on hardhat
 *******************************************/

import {ethers, upgrades} from "hardhat";
import {TokenDistributionModel} from "./utils/TokenDistributionModel";
import {mine, time} from "@nomicfoundation/hardhat-network-helpers";

import {
  ERC20,
  StorageV21,
  Aggregator,
  AggregatorN3,
} from "../typechain-types";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {expect} from "chai";
import {BigNumber} from "ethers";

async function deployContracts(owner: SignerWithAddress) {
  let blid: ERC20,
    usdt: ERC20,
    usdtn2: ERC20,
    usdc: ERC20,
    aggregator: Aggregator,
    aggregator3: AggregatorN3,
    model: TokenDistributionModel;

  model = new TokenDistributionModel();
  const Aggregator = await ethers.getContractFactory("Aggregator", owner);
  const AggregatorN3 = await ethers.getContractFactory("AggregatorN3", owner);
  const USDT = await ethers.getContractFactory("ERC20", owner);
  const USDC = await ethers.getContractFactory("ERC20", owner);
  const BLID = await ethers.getContractFactory("ERC20", owner);
  const USDTN2 = await ethers.getContractFactory("ERC20", owner);

  aggregator = (await Aggregator.deploy()) as Aggregator;
  aggregator3 = (await AggregatorN3.deploy()) as AggregatorN3;
  blid = (await BLID.deploy("some erc20 as if BLID", "SERC")) as ERC20;
  usdt = (await USDT.deploy("some erc20", "SERC")) as ERC20;
  usdtn2 = (await USDTN2.deploy("some erc20", "SERC")) as ERC20;
  usdc = (await USDC.deploy("some erc20", "SERC")) as ERC20;

  let tx;

  return {
    blid,
    usdt,
    usdtn2,
    usdc,
    aggregator,
    aggregator3,
    model,
  };
}

const MaxBlidPerUSD: BigNumber = ethers.utils.parseEther("3");
const OverDepositPerUSD: BigNumber = ethers.utils.parseEther("1");
const BlidPerBlock: BigNumber = ethers.utils.parseEther("10"); // BLID
const MaxActiveBLID: BigNumber = ethers.utils.parseEther("1000"); // Very big value

const secondBlidPerBlock: BigNumber = ethers.utils.parseEther("7"); // BLID
const secondMaxBlidPerUSD: BigNumber = ethers.utils.parseEther("2"); // BLID
const firstUSDRate: BigNumber = BigNumber.from("100000000");
const secondUSDRate: BigNumber = BigNumber.from("80000000");

const amountUSDTDeposit: BigNumber = ethers.utils.parseEther("6"); // USDT

let startBlockUser1: number, startBlockUser2: number;
let user1DepositAmount: BigNumber;
let user2DepositAmount: BigNumber;

describe("Boosting2.0", async () => {
  let blid: ERC20, usdt: ERC20, usdc: ERC20;
  let aggregator: Aggregator,
    aggregator3: AggregatorN3,
    model: TokenDistributionModel;
  let owner: SignerWithAddress,
    logicContract: SignerWithAddress,
    other1: SignerWithAddress,
    other2: SignerWithAddress,
    expenseer: SignerWithAddress;

  before(async () => {
    [owner, logicContract, other1, other2, expenseer] =
      await ethers.getSigners();
    const contracts = await deployContracts(owner);

    blid = contracts.blid;
    usdt = contracts.usdt;
    usdc = contracts.usdc;
    aggregator = contracts.aggregator;
    aggregator3 = contracts.aggregator3;
    model = contracts.model;
  });
  before(async () => {
    await usdt
      .connect(owner)
      .transfer(other1.address, ethers.utils.parseEther("100000"));

    await usdt
      .connect(owner)
      .transfer(other2.address, ethers.utils.parseEther("100000"));

    await usdc
      .connect(owner)
      .transfer(other1.address, ethers.utils.parseEther("100000"));

    await usdc
      .connect(owner)
      .transfer(other2.address, ethers.utils.parseEther("100000"));

    await blid
      .connect(owner)
      .transfer(other1.address, ethers.utils.parseEther("999999"));

    await blid
      .connect(owner)
      .transfer(other2.address, ethers.utils.parseEther("999999"));

    await blid
      .connect(owner)
      .transfer(logicContract.address, ethers.utils.parseEther("999999"));

    await blid
      .connect(owner)
      .transfer(expenseer.address, ethers.utils.parseEther("999999"));
  });

  describe("StorageV21", async () => {
    let storageV21: StorageV21;

    const calcDepositBLIDAmount = async (
      address: string,
      maxBlidPerUSD: BigNumber
    ): Promise<BigNumber> => {
      const userDepositAmount = (await storageV21.balanceOf(address))
        .mul(maxBlidPerUSD)
        .div(ethers.utils.parseEther("1"));

      const userBLIDBalance = await storageV21.getBoostingBLIDAmount(address);

      return userDepositAmount.gt(userBLIDBalance)
        ? userBLIDBalance
        : userDepositAmount;
    };

    before(async () => {
      const StorageV21 = await ethers.getContractFactory("StorageV21", owner);

      storageV21 = (await upgrades.deployProxy(StorageV21, [], {
        initializer: "initialize",
        unsafeAllow: ["constructor"],
      })) as StorageV21;
      await storageV21.deployed();
    });

    before(async () => {
      await storageV21.connect(owner).setBLID(blid.address);

      await storageV21
        .connect(owner)
        .addToken(usdt.address, aggregator3.address);

      await storageV21
        .connect(owner)
        .addToken(usdc.address, aggregator.address);

      await storageV21.connect(owner).setLogic(logicContract.address);

      await storageV21.connect(owner).setBoostingAddress(expenseer.address);

      let tx = await usdt
        .connect(other1)
        .approve(storageV21.address, ethers.utils.parseEther("10000000000"));

      tx = await usdt
        .connect(other2)
        .approve(storageV21.address, ethers.utils.parseEther("10000000000"));

      tx = await usdc
        .connect(other1)
        .approve(storageV21.address, ethers.utils.parseEther("10000000000"));

      tx = await usdc
        .connect(other2)
        .approve(storageV21.address, ethers.utils.parseEther("10000000000"));

      tx = await blid
        .connect(other1)
        .approve(storageV21.address, ethers.utils.parseEther("10000000000"));

      tx = await blid
        .connect(other2)
        .approve(storageV21.address, ethers.utils.parseEther("10000000000"));

      tx = await blid
        .connect(logicContract)
        .approve(storageV21.address, ethers.utils.parseEther("10000000000"));

      tx = await blid
        .connect(expenseer)
        .approve(storageV21.address, ethers.utils.parseEther("10000000000"));
    });

    describe("setBoostingInfo", async () => {
      it("only owner can set boosting info", async () => {
        const tx = await expect(
          storageV21
            .connect(other1)
            .setBoostingInfo(MaxBlidPerUSD, BlidPerBlock, MaxActiveBLID)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });
      it("set boosting info", async () => {
        const tx = await storageV21
          .connect(owner)
          .setBoostingInfo(MaxBlidPerUSD, BlidPerBlock, MaxActiveBLID);

        const maxBlidPerUSD = await storageV21.connect(owner).maxBlidPerUSD();
        const blidPerBlock = await storageV21.connect(owner).blidPerBlock();
        const maxActiveBLID = await storageV21.connect(owner).maxActiveBLID();

        expect(maxBlidPerUSD).to.be.equal(
          MaxBlidPerUSD,
          "maxBlidPerUSD should be same"
        );
        expect(blidPerBlock).to.be.equal(
          BlidPerBlock,
          "blidPerBlock should be same"
        );
        expect(maxActiveBLID).to.be.equal(
          MaxActiveBLID,
          "maxActiveBLID should be same"
        );
      });
    });

    describe("depositBLID", async () => {
      it("user must deposit stablecoin before deposit BLID", async () => {
        const tx = await expect(
          storageV21.connect(other1).depositBLID(amountUSDTDeposit)
        ).to.be.revertedWith("E11");
      });

      it("user deposit USDT", async () => {
        const beforeBalance = await usdt.balanceOf(other1.address);

        const tx = await storageV21
          .connect(other1)
          .deposit(amountUSDTDeposit, usdt.address);

        const afterBalance = await usdt.balanceOf(other1.address);
        expect(beforeBalance.toBigInt()).to.be.equal(
          afterBalance.add(amountUSDTDeposit).toBigInt(),
          "Deposit USDT"
        );
      });

      it("user deposit BLID for boosting", async () => {
        const beforeBlidbalance = await blid.balanceOf(other1.address);
        const depositAmount = amountUSDTDeposit
          .mul(MaxBlidPerUSD.add(OverDepositPerUSD))
          .div(ethers.utils.parseEther("1"));

        await storageV21.connect(other1).depositBLID(depositAmount);

        user1DepositAmount = (await storageV21.balanceOf(other1.address))
          .mul(MaxBlidPerUSD)
          .div(ethers.utils.parseEther("1"));

        const afterBlidbalance = await blid.balanceOf(other1.address);
        expect(beforeBlidbalance).to.be.equal(
          afterBlidbalance.add(depositAmount),
          "Deposit BLID"
        );
      });

      after(async () => {
        startBlockUser1 = await ethers.provider.getBlockNumber();
      });
    });

    describe("get Claimable Amount", async () => {
      before(async () => {
        await time.advanceBlock();
      });
      it("get boosting claimable BLID after one block", async () => {
        const claimableAmount = await storageV21.getBoostingClaimableBLID(
          other1.address
        );
        const blockCount =
          (await ethers.provider.getBlockNumber()) - startBlockUser1 + 1;

        expect(claimableAmount).to.be.equal(
          user1DepositAmount
            .mul(BlidPerBlock)
            .mul(blockCount)
            .div(ethers.utils.parseEther("1")),
          "Claimable amount for user 1 should be the same"
        );
      });
    });

    describe("second deposit", async () => {
      it("second user deposit USDT", async () => {
        const beforeBalance = await usdt.balanceOf(other2.address);

        const tx = await storageV21
          .connect(other2)
          .deposit(amountUSDTDeposit, usdt.address);

        const afterBalance = await usdt.balanceOf(other2.address);
        expect(beforeBalance.toBigInt()).to.be.equal(
          afterBalance.add(amountUSDTDeposit).toBigInt(),
          "Deposit USDT"
        );
      });
      it("second user deposit BLID", async () => {
        user2DepositAmount = (await storageV21.balanceOf(other2.address))
          .mul(MaxBlidPerUSD)
          .div(3)
          .div(ethers.utils.parseEther("1"));

        const tx = await storageV21
          .connect(other2)
          .depositBLID(user2DepositAmount);
      });

      after(async () => {
        startBlockUser2 = await ethers.provider.getBlockNumber();
      });
    });

    describe("getClaimableBLID after second deposit", async () => {
      before(async () => {
        await time.advanceBlock();
      });
      it("get claimable BLID for user1, user2 after 1 blocks", async () => {
        const claimableAmount1 = await storageV21.getBoostingClaimableBLID(
          other1.address
        );
        const claimableAmount2 = await storageV21.getBoostingClaimableBLID(
          other2.address
        );
        const blockCountUser1 =
          (await ethers.provider.getBlockNumber()) - startBlockUser1 + 1;

        const blockCountUser2 =
          (await ethers.provider.getBlockNumber()) - startBlockUser2 + 1;

        const beforeExpectUser1Amount = user1DepositAmount
          .mul(BlidPerBlock)
          .mul(blockCountUser1)
          .div(ethers.utils.parseEther("1"));
        const beforeExpectUser2Amount = user2DepositAmount
          .mul(BlidPerBlock)
          .mul(blockCountUser2)
          .div(ethers.utils.parseEther("1"));

        expect(claimableAmount1).to.be.equal(
          beforeExpectUser1Amount,
          "ClaimableBLId amout for User1"
        );
        expect(claimableAmount2).to.be.equal(
          beforeExpectUser2Amount,
          "ClaimableBLID amount for User2"
        );
      });
    });

    describe("update blidperblock", async () => {
      it("update boosting info", async () => {
        const tx = await storageV21
          .connect(owner)
          .setBoostingInfo(MaxBlidPerUSD, secondBlidPerBlock, MaxActiveBLID);

        const blidperBlock = await storageV21.blidPerBlock();
        expect(blidperBlock).to.be.equal(
          secondBlidPerBlock,
          "BlidPerBlock does not udpated"
        );
      });

      it("ClamableBLID sould be calculated with old blidPerBlock and new blidPerblock", async () => {
        await time.advanceBlock();
        await time.advanceBlock();
        await time.advanceBlock();

        const claimableAmount1 = await storageV21.getBoostingClaimableBLID(
          other1.address
        );
        const claimableAmount2 = await storageV21.getBoostingClaimableBLID(
          other2.address
        );

        const blockCountUser1 =
          (await ethers.provider.getBlockNumber()) - startBlockUser1 + 1;
        const blockCountUser2 =
          (await ethers.provider.getBlockNumber()) - startBlockUser2 + 1;

        const beforeExpectUser1Amount = user1DepositAmount
          .mul(BlidPerBlock)
          .mul(blockCountUser1 - 4)
          .div(ethers.utils.parseEther("1"))
          .add(
            user1DepositAmount
              .mul(secondBlidPerBlock)
              .mul(4)
              .div(ethers.utils.parseEther("1"))
          );
        const beforeExpectUser2Amount = user2DepositAmount
          .mul(BlidPerBlock)
          .mul(blockCountUser2 - 4)
          .div(ethers.utils.parseEther("1"))
          .add(
            user2DepositAmount
              .mul(secondBlidPerBlock)
              .mul(4)
              .div(ethers.utils.parseEther("1"))
          );

        expect(claimableAmount1).to.be.equal(
          beforeExpectUser1Amount,
          "ClaimableBLID amout for user1"
        );
        expect(claimableAmount2).to.be.equal(
          beforeExpectUser2Amount,
          "ClaimableBLID amount for user2"
        );
      });
    });

    describe("claim reward BLID", async () => {
      before(async () => {
        await blid
          .connect(expenseer)
          .approve(storageV21.address, ethers.utils.parseEther("100000"));

        await time.advanceBlock();
      });

      it("claim BLID for user1", async () => {
        const beforeBlidbalance = await blid.balanceOf(other1.address);
        const claimableBlid = await storageV21.getBoostingClaimableBLID(
          other1.address
        );

        const tx = await storageV21.connect(other1).claimBoostingRewardBLID();

        const afterBlidbalance = await blid.balanceOf(other1.address);
        expect(afterBlidbalance).to.be.above(
          beforeBlidbalance,
          "BLID balance of user1 should be increased"
        );

        expect(claimableBlid).to.be.equal(
          afterBlidbalance.sub(beforeBlidbalance),
          "ClaimableBLID should be the same as claim amount"
        );

        startBlockUser1 = await ethers.provider.getBlockNumber();
      });

      it("claim BLID for user2", async () => {
        await time.advanceBlock();
        const beforeBlidbalance = await blid.balanceOf(other2.address);
        const claimableBlid = await storageV21.getBoostingClaimableBLID(
          other2.address
        );

        const tx = await storageV21.connect(other2).claimBoostingRewardBLID();

        const afterBlidbalance = await blid.balanceOf(other2.address);
        expect(afterBlidbalance).to.be.above(
          beforeBlidbalance,
          "BLID balance of user2 should be increased"
        );

        expect(claimableBlid).to.be.equal(
          afterBlidbalance.sub(beforeBlidbalance),
          "ClaimableBLID should be the same as claim amount"
        );

        startBlockUser2 = await ethers.provider.getBlockNumber();
      });
    });

    describe("Change MaxBLIDPerUSD", async () => {
      before(async () => {
        await time.advanceBlock();
      });

      it("update boosting info", async () => {
        const tx = await storageV21
          .connect(owner)
          .setBoostingInfo(
            secondMaxBlidPerUSD,
            secondBlidPerBlock,
            MaxActiveBLID
          );
        await tx.wait(1);

        const _maxBlidPerUSD = await storageV21.maxBlidPerUSD();
        expect(_maxBlidPerUSD).to.be.equal(
          secondMaxBlidPerUSD,
          "MaxBlidPerUSD does not udpated"
        );
      });

      it("ClamableBLID sould be calculated with old MaxBlidPerUSD, new BlidPerBlock", async () => {
        await time.advanceBlock();

        const claimableAmount1 = await storageV21.getBoostingClaimableBLID(
          other1.address
        );
        const claimableAmount2 = await storageV21.getBoostingClaimableBLID(
          other2.address
        );

        const blockCountUser1 =
          (await ethers.provider.getBlockNumber()) - startBlockUser1 + 1;
        const blockCountUser2 =
          (await ethers.provider.getBlockNumber()) - startBlockUser2 + 1;

        const beforeExpectUser1Amount = user1DepositAmount
          .mul(secondBlidPerBlock)
          .mul(blockCountUser1)
          .div(ethers.utils.parseEther("1"));
        const beforeExpectUser2Amount = user2DepositAmount
          .mul(secondBlidPerBlock)
          .mul(blockCountUser2)
          .div(ethers.utils.parseEther("1"));

        expect(claimableAmount1).to.be.equal(
          beforeExpectUser1Amount,
          "ClaimableBLID amout for user1"
        );
        expect(claimableAmount2).to.be.equal(
          beforeExpectUser2Amount,
          "ClaimableBLID amount for user2"
        );
      });
    });

    describe("first withdraw", async () => {
      before(async () => {
        await time.advanceBlock();
      });

      it("User can't withdraw over balance", async () => {
        const withdrawAmount = user1DepositAmount
          .mul(MaxBlidPerUSD)
          .mul(100)
          .div(ethers.utils.parseEther("1"));

        await expect(
          storageV21.connect(other1).withdrawBLID(withdrawAmount)
        ).to.be.revertedWith("E12");
      });

      it("Withdraw of user 1 for OverDepositPerUSD, claimReward will be using MaxBlidPerUSD", async () => {
        const withdrawAmount = user1DepositAmount
          .mul(OverDepositPerUSD)
          .div(MaxBlidPerUSD.add(OverDepositPerUSD));
        const beforeBlidbalance = await blid.balanceOf(other1.address);

        const blockCountUser1 =
          (await ethers.provider.getBlockNumber()) - startBlockUser1 + 1;
        const claimableBLIDAmount = user1DepositAmount
          .mul(secondBlidPerBlock)
          .mul(blockCountUser1)
          .div(ethers.utils.parseEther("1"));
        const claimableBLIDAmountStorage =
          await storageV21.getBoostingClaimableBLID(other1.address);

        const tx = await storageV21
          .connect(other1)
          .withdrawBLID(withdrawAmount);

        const afterBlidbalance = await blid.balanceOf(other1.address);

        expect(afterBlidbalance).to.be.equal(
          beforeBlidbalance.add(withdrawAmount).add(claimableBLIDAmount),
          "Claimed BLID"
        );

        expect(claimableBLIDAmountStorage).to.be.equal(
          claimableBLIDAmount,
          "Claimed BLID should be matched with storage"
        );

        startBlockUser1 = await ethers.provider.getBlockNumber();
      });

      it("Withdraw of user 2 for 10%, claimReward will be using MaxBlidPerUSD", async () => {
        await time.advanceBlock();

        const withdrawAmount = (await storageV21.balanceOf(other2.address))
          .mul(MaxBlidPerUSD)
          .div(10)
          .div(ethers.utils.parseEther("1"));
        const beforeBlidbalance = await blid.balanceOf(other2.address);

        const blockCountUser2 =
          (await ethers.provider.getBlockNumber()) - startBlockUser2 + 1;
        const claimableBLIDAmount = user2DepositAmount
          .mul(secondBlidPerBlock)
          .mul(blockCountUser2)
          .div(ethers.utils.parseEther("1"));
        const claimableBLIDAmountStorage =
          await storageV21.getBoostingClaimableBLID(other2.address);

        const tx = await storageV21
          .connect(other2)
          .withdrawBLID(withdrawAmount);

        const afterBlidbalance = await blid.balanceOf(other2.address);

        expect(afterBlidbalance).to.be.equal(
          beforeBlidbalance.add(withdrawAmount).add(claimableBLIDAmount),
          "Claimed BLID"
        );

        expect(claimableBLIDAmountStorage).to.be.equal(
          claimableBLIDAmount,
          "Claimed BLID should be matched with storage"
        );

        startBlockUser2 = await ethers.provider.getBlockNumber();
      });
    });

    describe("Change USD Rate", async () => {
      before(async () => {
        await time.advanceBlock();
        user1DepositAmount = await calcDepositBLIDAmount(
          other1.address,
          secondMaxBlidPerUSD
        );
        user2DepositAmount = await calcDepositBLIDAmount(
          other2.address,
          secondMaxBlidPerUSD
        );
      });

      it("Update USD Rate", async () => {
        let depositUser1: BigNumber = await storageV21.balanceOf(
          other1.address
        );
        let depositUser2: BigNumber = await storageV21.balanceOf(
          other2.address
        );

        let tx = await aggregator3
          .connect(owner)
          .updateRate("8", secondUSDRate.toString());
        await tx.wait(1);

        tx = await storageV21.setOracleLatestAnswer(
          usdt.address,
          secondUSDRate.toString()
        );
        await tx.wait(1);

        let depositUser1New: BigNumber = await storageV21.balanceOf(
          other1.address
        );
        let depositUser2New: BigNumber = await storageV21.balanceOf(
          other2.address
        );

        expect(depositUser1New).to.be.equal(
          depositUser1.div(firstUSDRate).mul(secondUSDRate),
          "usdDeposit amount should be changed"
        );
        expect(depositUser2New).to.be.equal(
          depositUser2.div(firstUSDRate).mul(secondUSDRate),
          "usdDeposit amount should be changed"
        );
      });

      it("ClamableBLID sould be calculated with old USD Rate", async () => {
        await time.advanceBlock();

        const claimableAmount1 = await storageV21.getBoostingClaimableBLID(
          other1.address
        );
        const claimableAmount2 = await storageV21.getBoostingClaimableBLID(
          other2.address
        );

        const blockCountUser1 =
          (await ethers.provider.getBlockNumber()) - startBlockUser1 + 1;
        const blockCountUser2 =
          (await ethers.provider.getBlockNumber()) - startBlockUser2 + 1;

        const beforeExpectUser1Amount = user1DepositAmount
          .mul(secondBlidPerBlock)
          .mul(blockCountUser1)
          .div(ethers.utils.parseEther("1"));
        const beforeExpectUser2Amount = user2DepositAmount
          .mul(secondBlidPerBlock)
          .mul(blockCountUser2)
          .div(ethers.utils.parseEther("1"));

        expect(claimableAmount1).to.be.equal(
          beforeExpectUser1Amount,
          "ClaimableBLID amout for user1"
        );
        expect(claimableAmount2).to.be.equal(
          beforeExpectUser2Amount,
          "ClaimableBLID amount for user2"
        );
      });

      it("claim BLID for user1 with old USD Rate", async () => {
        const beforeBlidbalance = await blid.balanceOf(other1.address);
        const claimableBlid = await storageV21.getBoostingClaimableBLID(
          other1.address
        );

        const tx = await storageV21.connect(other1).claimBoostingRewardBLID();

        const afterBlidbalance = await blid.balanceOf(other1.address);
        expect(afterBlidbalance).to.be.above(
          beforeBlidbalance,
          "BLID balance of user1 should be increased"
        );

        expect(claimableBlid).to.be.equal(
          afterBlidbalance.sub(beforeBlidbalance),
          "ClaimableBLID should be the same as claim amount"
        );

        startBlockUser1 = await ethers.provider.getBlockNumber();
      });

      it("claim BLID for user2 with old USD Rate", async () => {
        await time.advanceBlock();
        const beforeBlidbalance = await blid.balanceOf(other2.address);
        const claimableBlid = await storageV21.getBoostingClaimableBLID(
          other2.address
        );

        const tx = await storageV21.connect(other2).claimBoostingRewardBLID();

        const afterBlidbalance = await blid.balanceOf(other2.address);
        expect(afterBlidbalance).to.be.above(
          beforeBlidbalance,
          "BLID balance of user2 should be increased"
        );

        expect(claimableBlid).to.be.equal(
          afterBlidbalance.sub(beforeBlidbalance),
          "ClaimableBLID should be the same as claim amount"
        );

        startBlockUser2 = await ethers.provider.getBlockNumber();
      });

      it("ClamableBLID sould be calculated with new USD Rate", async () => {
        await time.advanceBlock();
        await time.advanceBlock();
        await time.advanceBlock();
        await time.advanceBlock();
        user1DepositAmount = await calcDepositBLIDAmount(
          other1.address,
          secondMaxBlidPerUSD
        );
        user2DepositAmount = await calcDepositBLIDAmount(
          other2.address,
          secondMaxBlidPerUSD
        );

        const claimableAmount1 = await storageV21.getBoostingClaimableBLID(
          other1.address
        );
        const claimableAmount2 = await storageV21.getBoostingClaimableBLID(
          other2.address
        );

        const blockCountUser1 =
          (await ethers.provider.getBlockNumber()) - startBlockUser1 + 1;
        const blockCountUser2 =
          (await ethers.provider.getBlockNumber()) - startBlockUser2 + 1;

        const beforeExpectUser1Amount = user1DepositAmount
          .mul(secondBlidPerBlock)
          .mul(blockCountUser1)
          .div(ethers.utils.parseEther("1"));
        const beforeExpectUser2Amount = user2DepositAmount
          .mul(secondBlidPerBlock)
          .mul(blockCountUser2)
          .div(ethers.utils.parseEther("1"));

        expect(claimableAmount1).to.be.equal(
          beforeExpectUser1Amount,
          "ClaimableBLID amout for user1"
        );
        expect(claimableAmount2).to.be.equal(
          beforeExpectUser2Amount,
          "ClaimableBLID amount for user2"
        );
      });
    });

    describe("second withdraw", async () => {
      before(async () => {
        await time.advanceBlock();
      });

      it("Withdraw of user 1, claimReward will be using secondMaxBlidPerUSD", async () => {
        const withdrawAmount = (
          await calcDepositBLIDAmount(other1.address, secondMaxBlidPerUSD)
        )
          .mul(amountUSDTDeposit)
          .div(10)
          .div(ethers.utils.parseEther("1"));
        const beforeBlidbalance = await blid.balanceOf(other1.address);

        const blockCountUser1 =
          (await ethers.provider.getBlockNumber()) - startBlockUser1 + 1;
        const claimableBLIDAmount = (
          await calcDepositBLIDAmount(other1.address, secondMaxBlidPerUSD)
        )
          .mul(secondBlidPerBlock)
          .mul(blockCountUser1)
          .div(ethers.utils.parseEther("1"));
        const claimableBLIDAmountStorage =
          await storageV21.getBoostingClaimableBLID(other1.address);

        const tx = await storageV21
          .connect(other1)
          .withdrawBLID(withdrawAmount);

        const afterBlidbalance = await blid.balanceOf(other1.address);

        expect(afterBlidbalance).to.be.equal(
          beforeBlidbalance.add(withdrawAmount).add(claimableBLIDAmount),
          "Claimed BLID"
        );

        expect(claimableBLIDAmountStorage).to.be.equal(
          claimableBLIDAmount,
          "Claimed BLID should be matched with storage"
        );

        startBlockUser1 = await ethers.provider.getBlockNumber();
      });
    });

    describe("Change MaxBLIDPerUSD again (back)", async () => {
      before(async () => {
        await time.advanceBlock();
      });

      it("update boosting info", async () => {
        const tx = await storageV21
          .connect(owner)
          .setBoostingInfo(MaxBlidPerUSD, secondBlidPerBlock, MaxActiveBLID);
        await tx.wait(1);

        const _maxBlidPerUSD = await storageV21.maxBlidPerUSD();
        expect(_maxBlidPerUSD).to.be.equal(
          MaxBlidPerUSD,
          "MaxBlidPerUSD does not udpated"
        );
      });

      it("ClamableBLID sould be calculated with secondMaxBlidPerUSD", async () => {
        await time.advanceBlock();

        const claimableAmount1 = await storageV21.getBoostingClaimableBLID(
          other1.address
        );
        const claimableAmount2 = await storageV21.getBoostingClaimableBLID(
          other2.address
        );

        const blockCountUser1 =
          (await ethers.provider.getBlockNumber()) - startBlockUser1 + 1;
        const blockCountUser2 =
          (await ethers.provider.getBlockNumber()) - startBlockUser2 + 1;

        const beforeExpectUser1Amount = (
          await calcDepositBLIDAmount(other1.address, secondMaxBlidPerUSD)
        )
          .mul(secondBlidPerBlock)
          .mul(blockCountUser1)
          .div(ethers.utils.parseEther("1"));
        const beforeExpectUser2Amount = (
          await calcDepositBLIDAmount(other2.address, secondMaxBlidPerUSD)
        )
          .mul(secondBlidPerBlock)
          .mul(blockCountUser2)
          .div(ethers.utils.parseEther("1"));

        expect(claimableAmount1).to.be.equal(
          beforeExpectUser1Amount,
          "ClaimableBLID amout for user1"
        );
        expect(claimableAmount2).to.be.equal(
          beforeExpectUser2Amount,
          "ClaimableBLID amount for user2"
        );
      });
    });

    describe("third deposit", async () => {
      before(async () => {
        await time.advanceBlock();
      });

      it("deposit of user 1, claimReward will be using secondMaxBlidPerUSD", async () => {
        const depositAmount = (
          await calcDepositBLIDAmount(other1.address, secondMaxBlidPerUSD)
        )
          .mul(amountUSDTDeposit)
          .div(10)
          .div(ethers.utils.parseEther("1"));
        const beforeBlidbalance = await blid.balanceOf(other1.address);

        const blockCountUser1 =
          (await ethers.provider.getBlockNumber()) - startBlockUser1 + 1;
        const claimableBLIDAmount = (
          await calcDepositBLIDAmount(other1.address, secondMaxBlidPerUSD)
        )
          .mul(secondBlidPerBlock)
          .mul(blockCountUser1)
          .div(ethers.utils.parseEther("1"));
        const claimableBLIDAmountStorage =
          await storageV21.getBoostingClaimableBLID(other1.address);

        const tx = await storageV21.connect(other1).depositBLID(depositAmount);

        const afterBlidbalance = await blid.balanceOf(other1.address);

        expect(afterBlidbalance).to.be.equal(
          beforeBlidbalance.sub(depositAmount).add(claimableBLIDAmount),
          "Claimed BLID"
        );

        expect(claimableBLIDAmountStorage).to.be.equal(
          claimableBLIDAmount,
          "Claimed BLID should be matched with storage"
        );

        startBlockUser1 = await ethers.provider.getBlockNumber();
      });
    });

    describe("fourth withdraw", async () => {
      before(async () => {
        await time.advanceBlock();
      });

      it("withdraw of user 1, claimReward will be using MaxBlidPerUSD", async () => {
        const withdrawAmount = (
          await calcDepositBLIDAmount(other1.address, MaxBlidPerUSD)
        )
          .mul(amountUSDTDeposit)
          .div(10)
          .div(ethers.utils.parseEther("1"));
        const beforeBlidbalance = await blid.balanceOf(other1.address);

        const blockCountUser1 =
          (await ethers.provider.getBlockNumber()) - startBlockUser1 + 1;
        const claimableBLIDAmount = (
          await calcDepositBLIDAmount(other1.address, MaxBlidPerUSD)
        )
          .mul(secondBlidPerBlock)
          .mul(blockCountUser1)
          .div(ethers.utils.parseEther("1"));
        const claimableBLIDAmountStorage =
          await storageV21.getBoostingClaimableBLID(other1.address);

        const tx = await storageV21
          .connect(other1)
          .withdrawBLID(withdrawAmount);

        const afterBlidbalance = await blid.balanceOf(other1.address);

        expect(afterBlidbalance).to.be.equal(
          beforeBlidbalance.add(withdrawAmount).add(claimableBLIDAmount),
          "Claimed BLID"
        );

        expect(claimableBLIDAmountStorage).to.be.equal(
          claimableBLIDAmount,
          "Claimed BLID should be matched with storage"
        );

        startBlockUser1 = await ethers.provider.getBlockNumber();
      });
    });

    describe("Deposit USDT", async () => {
      before(async () => {
        await time.advanceBlock();
      });

      it("Change MaxBlidPerUSD as secondMaxBlidPerUSD", async () => {
        const tx = await storageV21
          .connect(owner)
          .setBoostingInfo(
            secondMaxBlidPerUSD,
            secondBlidPerBlock,
            MaxActiveBLID
          );
        await tx.wait(1);
      });

      it("user deposit USDT, claimReward will be using MaxBlidPerUSD", async () => {
        await time.advanceBlock();

        const beforeBlidbalance = await blid.balanceOf(other1.address);

        const blockCountUser1 =
          (await ethers.provider.getBlockNumber()) - startBlockUser1 + 1;
        const claimableBLIDAmount = (
          await calcDepositBLIDAmount(other1.address, MaxBlidPerUSD)
        )
          .mul(secondBlidPerBlock)
          .mul(blockCountUser1)
          .div(ethers.utils.parseEther("1"));
        const claimableBLIDAmountStorage =
          await storageV21.getBoostingClaimableBLID(other1.address);

        await storageV21
          .connect(other1)
          .deposit(amountUSDTDeposit, usdt.address);

        const afterBlidbalance = await blid.balanceOf(other1.address);

        expect(afterBlidbalance).to.be.equal(
          beforeBlidbalance.add(claimableBLIDAmount),
          "Claimed BLID"
        );

        expect(claimableBLIDAmountStorage).to.be.equal(
          claimableBLIDAmount,
          "Claimed BLID should be matched with storage"
        );

        startBlockUser1 = await ethers.provider.getBlockNumber();
      });

      it("withdraw of user 1, claimReward will be using secondMaxBlidPerUSD", async () => {
        await time.advanceBlock();

        const withdrawAmount = (
          await calcDepositBLIDAmount(other1.address, MaxBlidPerUSD)
        )
          .mul(amountUSDTDeposit)
          .div(10)
          .div(ethers.utils.parseEther("1"));
        const beforeBlidbalance = await blid.balanceOf(other1.address);

        const blockCountUser1 =
          (await ethers.provider.getBlockNumber()) - startBlockUser1 + 1;
        const claimableBLIDAmount = (
          await calcDepositBLIDAmount(other1.address, secondMaxBlidPerUSD)
        )
          .mul(secondBlidPerBlock)
          .mul(blockCountUser1)
          .div(ethers.utils.parseEther("1"));
        const claimableBLIDAmountStorage =
          await storageV21.getBoostingClaimableBLID(other1.address);

        const tx = await storageV21
          .connect(other1)
          .withdrawBLID(withdrawAmount);

        const afterBlidbalance = await blid.balanceOf(other1.address);

        expect(afterBlidbalance).to.be.equal(
          beforeBlidbalance.add(withdrawAmount).add(claimableBLIDAmount),
          "Claimed BLID"
        );

        expect(claimableBLIDAmountStorage).to.be.equal(
          claimableBLIDAmount,
          "Claimed BLID should be matched with storage"
        );

        startBlockUser1 = await ethers.provider.getBlockNumber();
      });
    });

    describe("Withdraw USDT", async () => {
      before(async () => {
        await time.advanceBlock();
      });

      it("Change MaxBlidPerUSD as MaxBlidPerUSD", async () => {
        const tx = await storageV21
          .connect(owner)
          .setBoostingInfo(MaxBlidPerUSD, secondBlidPerBlock, MaxActiveBLID);
        await tx.wait(1);
      });

      it("user withdraw USDT, claimReward will be using secondMaxBlidPerUSD", async () => {
        await time.advanceBlock();

        const beforeBlidbalance = await blid.balanceOf(other1.address);

        const blockCountUser1 =
          (await ethers.provider.getBlockNumber()) - startBlockUser1 + 1;
        const claimableBLIDAmount = (
          await calcDepositBLIDAmount(other1.address, secondMaxBlidPerUSD)
        )
          .mul(secondBlidPerBlock)
          .mul(blockCountUser1)
          .div(ethers.utils.parseEther("1"));
        const claimableBLIDAmountStorage =
          await storageV21.getBoostingClaimableBLID(other1.address);

        await storageV21
          .connect(other1)
          .withdraw(amountUSDTDeposit.mul(3).div(2), usdt.address);

        const afterBlidbalance = await blid.balanceOf(other1.address);

        expect(afterBlidbalance).to.be.equal(
          beforeBlidbalance.add(claimableBLIDAmount),
          "Claimed BLID"
        );

        expect(claimableBLIDAmountStorage).to.be.equal(
          claimableBLIDAmount,
          "Claimed BLID should be matched with storage"
        );

        startBlockUser1 = await ethers.provider.getBlockNumber();
      });

      it("withdraw of user 1, claimReward will be using MaxBlidPerUSD", async () => {
        await time.advanceBlock();

        const withdrawAmount = (
          await calcDepositBLIDAmount(other1.address, MaxBlidPerUSD)
        )
          .mul(amountUSDTDeposit)
          .div(10)
          .div(ethers.utils.parseEther("1"));
        const beforeBlidbalance = await blid.balanceOf(other1.address);

        const blockCountUser1 =
          (await ethers.provider.getBlockNumber()) - startBlockUser1 + 1;
        const claimableBLIDAmount = (
          await calcDepositBLIDAmount(other1.address, MaxBlidPerUSD)
        )
          .mul(secondBlidPerBlock)
          .mul(blockCountUser1)
          .div(ethers.utils.parseEther("1"));
        const claimableBLIDAmountStorage =
          await storageV21.getBoostingClaimableBLID(other1.address);

        const tx = await storageV21
          .connect(other1)
          .withdrawBLID(withdrawAmount);

        const afterBlidbalance = await blid.balanceOf(other1.address);

        expect(afterBlidbalance).to.be.equal(
          beforeBlidbalance.add(withdrawAmount).add(claimableBLIDAmount),
          "Claimed BLID"
        );

        expect(claimableBLIDAmountStorage).to.be.equal(
          claimableBLIDAmount,
          "Claimed BLID should be matched with storage"
        );

        startBlockUser1 = await ethers.provider.getBlockNumber();
      });
    });

    describe("withdraw total", async () => {
      before(async () => {
        await time.advanceBlock();
      });

      it("withdraw of user 1", async () => {
        const withdrawAmount = await storageV21.getBoostingBLIDAmount(
          other1.address
        );
        const beforeBlidbalance = await blid.balanceOf(other1.address);

        const blockCountUser1 =
          (await ethers.provider.getBlockNumber()) - startBlockUser1 + 1;
        const claimableBLIDAmount = (
          await calcDepositBLIDAmount(other1.address, MaxBlidPerUSD)
        )
          .mul(secondBlidPerBlock)
          .mul(blockCountUser1)
          .div(ethers.utils.parseEther("1"));
        const claimableBLIDAmountStorage =
          await storageV21.getBoostingClaimableBLID(other1.address);

        await storageV21.connect(other1).withdrawBLID(withdrawAmount);

        const afterBlidbalance = await blid.balanceOf(other1.address);

        expect(afterBlidbalance).to.be.equal(
          beforeBlidbalance.add(withdrawAmount).add(claimableBLIDAmount),
          "Claimed BLID"
        );

        expect(claimableBLIDAmountStorage).to.be.equal(
          claimableBLIDAmount,
          "Claimed BLID should be matched with storage"
        );

        expect(
          (await storageV21.getBoostingBLIDAmount(other1.address)).toString()
        ).to.be.equal("0");

        startBlockUser1 = await ethers.provider.getBlockNumber();
      });

      it("withdraw of user 2", async () => {
        await time.advanceBlock();

        const withdrawAmount = await storageV21.getBoostingBLIDAmount(
          other2.address
        );
        const beforeBlidbalance = await blid.balanceOf(other2.address);

        const claimableBLIDAmount = await storageV21.getBoostingClaimableBLID(
          other2.address
        );

        await storageV21.connect(other2).withdrawBLID(withdrawAmount);

        const afterBlidbalance = await blid.balanceOf(other2.address);

        expect(afterBlidbalance).to.be.equal(
          beforeBlidbalance.add(withdrawAmount).add(claimableBLIDAmount),
          "Claimed BLID"
        );

        expect(
          (await storageV21.getBoostingBLIDAmount(other2.address)).toString()
        ).to.be.equal("0");

        startBlockUser2 = await ethers.provider.getBlockNumber();
      });
    });

    describe("Claim Final", async () => {
      it("claim BLID for user1", async () => {
        await time.advanceBlock();
        const beforeBlidbalance = await blid.balanceOf(other1.address);
        const claimableBlid = await storageV21.getBoostingClaimableBLID(
          other1.address
        );

        const tx = await storageV21.connect(other1).claimBoostingRewardBLID();

        const afterBlidbalance = await blid.balanceOf(other1.address);

        expect(beforeBlidbalance).to.be.equal(
          afterBlidbalance,
          "BLID balance should not be changed"
        );

        expect(claimableBlid.toString()).to.be.equal(
          "0",
          "ClaimableBLID should be 0"
        );

        startBlockUser1 = await ethers.provider.getBlockNumber();
      });

      it("claim BLID for user2", async () => {
        await time.advanceBlock();
        const beforeBlidbalance = await blid.balanceOf(other2.address);
        const claimableBlid = await storageV21.getBoostingClaimableBLID(
          other2.address
        );

        const tx = await storageV21.connect(other2).claimBoostingRewardBLID();

        const afterBlidbalance = await blid.balanceOf(other2.address);

        expect(beforeBlidbalance).to.be.equal(
          afterBlidbalance,
          "BLID balance should not be changed"
        );

        expect(claimableBlid.toString()).to.be.equal(
          "0",
          "ClaimableBLID should be 0"
        );

        startBlockUser2 = await ethers.provider.getBlockNumber();
      });
    });

    describe("Total BLID supply", async () => {
      before(async () => {
        await time.advanceBlock();
      });

      it("after first BLID deposit for boosting", async () => {
        const beforeTotalBlidSupply = await storageV21.totalSupplyBLID();

        expect(beforeTotalBlidSupply).to.be.equal(
          0,
          "Total BLID supply should be 0"
        );

        await storageV21
          .connect(other1)
          .deposit(amountUSDTDeposit, usdt.address);

        const depositAmount = amountUSDTDeposit
          .mul(MaxBlidPerUSD.add(OverDepositPerUSD))
          .div(ethers.utils.parseEther("1"));

        await storageV21.connect(other1).depositBLID(depositAmount);

        const afterTotalBlidSupply = await storageV21.totalSupplyBLID();
        expect(afterTotalBlidSupply).to.be.equal(
          beforeTotalBlidSupply.add(depositAmount),
          "Total BLID supply should be updated after BLID deposit"
        );
      });

      it("after second BLID deposit for boosting", async () => {
        const beforeTotalBlidSupply = await storageV21.totalSupplyBLID();

        await storageV21
          .connect(other2)
          .deposit(amountUSDTDeposit, usdt.address);

        const depositAmount = amountUSDTDeposit
          .mul(MaxBlidPerUSD.add(OverDepositPerUSD))
          .div(ethers.utils.parseEther("1"));

        await storageV21.connect(other2).depositBLID(depositAmount);

        const afterTotalBlidSupply = await storageV21.totalSupplyBLID();
        expect(afterTotalBlidSupply).to.be.equal(
          beforeTotalBlidSupply.add(depositAmount),
          "Total BLID supply should be updated after BLID deposit"
        );
      });

      it("after claim BLID for user1", async () => {
        const beforeTotalBlidSupply = await storageV21.totalSupplyBLID();

        await storageV21.connect(other1).claimBoostingRewardBLID();

        const afterTotalBlidSupply = await storageV21.totalSupplyBLID();
        expect(afterTotalBlidSupply).to.be.equal(
          beforeTotalBlidSupply,
          "Total BLID supply should not be changed"
        );
      });

      it("after claim BLID for user2", async () => {
        const beforeTotalBlidSupply = await storageV21.totalSupplyBLID();

        await storageV21.connect(other2).claimBoostingRewardBLID();

        const afterTotalBlidSupply = await storageV21.totalSupplyBLID();
        expect(afterTotalBlidSupply).to.be.equal(
          beforeTotalBlidSupply,
          "Total BLID supply should not be changed"
        );
      });

      it("after withdraw BLID for user1 for OverDepositPerUSD", async () => {
        const beforeTotalBlidSupply = await storageV21.totalSupplyBLID();

        const withdrawAmount = user1DepositAmount
          .mul(OverDepositPerUSD)
          .div(MaxBlidPerUSD.add(OverDepositPerUSD));

        await storageV21.connect(other1).withdrawBLID(withdrawAmount);

        const afterTotalBlidSupply = await storageV21.totalSupplyBLID();
        expect(afterTotalBlidSupply).to.be.equal(
          beforeTotalBlidSupply.sub(withdrawAmount),
          "Total BLID supply should be updated after BLID withdraw"
        );
      });

      it("after withdraw BLID for user2 for 10%", async () => {
        const beforeTotalBlidSupply = await storageV21.totalSupplyBLID();

        const withdrawAmount = (await storageV21.balanceOf(other2.address))
          .mul(MaxBlidPerUSD)
          .div(10)
          .div(ethers.utils.parseEther("1"));

        await storageV21.connect(other2).withdrawBLID(withdrawAmount);

        const afterTotalBlidSupply = await storageV21.totalSupplyBLID();
        expect(afterTotalBlidSupply).to.be.equal(
          beforeTotalBlidSupply.sub(withdrawAmount),
          "Total BLID supply should be updated after BLID withdraw"
        );
      });

      it("after withdraw BLID for user 1, claimReward will be using secondMaxBlidPerUSD", async () => {
        const beforeTotalBlidSupply = await storageV21.totalSupplyBLID();

        const withdrawAmount = (
          await calcDepositBLIDAmount(other1.address, secondMaxBlidPerUSD)
        )
          .mul(amountUSDTDeposit)
          .div(10)
          .div(ethers.utils.parseEther("1"));

        await storageV21.connect(other1).withdrawBLID(withdrawAmount);

        const afterTotalBlidSupply = await storageV21.totalSupplyBLID();
        expect(afterTotalBlidSupply).to.be.equal(
          beforeTotalBlidSupply.sub(withdrawAmount),
          "Total BLID supply should be updated after BLID withdraw"
        );
      });

      it("after total withdraw for user 1", async () => {
        const beforeTotalBlidSupply = await storageV21.totalSupplyBLID();

        const withdrawAmount = await storageV21.getBoostingBLIDAmount(
          other1.address
        );

        await storageV21.connect(other1).withdrawBLID(withdrawAmount);

        const afterTotalBlidSupply = await storageV21.totalSupplyBLID();
        expect(afterTotalBlidSupply).to.be.equal(
          beforeTotalBlidSupply.sub(withdrawAmount),
          "Total BLID supply should be updated after BLID withdraw"
        );
      });

      it("after total withdraw for user 2", async () => {
        const beforeTotalBlidSupply = await storageV21.totalSupplyBLID();

        const withdrawAmount = await storageV21.getBoostingBLIDAmount(
          other2.address
        );

        await storageV21.connect(other2).withdrawBLID(withdrawAmount);

        const afterTotalBlidSupply = await storageV21.totalSupplyBLID();
        expect(afterTotalBlidSupply).to.be.equal(
          beforeTotalBlidSupply.sub(withdrawAmount),
          "Total BLID supply should be updated after BLID withdraw"
        );

        expect(afterTotalBlidSupply.toString()).to.be.equal(
          "0",
          "Total BLID supply should be 0"
        );
      });
    });

    describe("MaxActiveBLID", async () => {
      let USDTBalanceUser1: BigNumber;
      before(async () => {
        USDTBalanceUser1 = await storageV21.balanceOf(other1.address);
      });

      it("set boosting info MaxActiveBLID = User1 deposit amount + 10", async () => {
        const tx = await storageV21
          .connect(owner)
          .setBoostingInfo(
            MaxBlidPerUSD,
            BlidPerBlock,
            USDTBalanceUser1.mul(MaxBlidPerUSD)
              .div(ethers.utils.parseEther("1"))
              .add("10")
          );
      });

      it("user 1 deposit BLID for boosting (activeSupplyBLID < MaxActiveBLID)", async () => {
        const beforeBlidbalance = await blid.balanceOf(other1.address);
        const depositAmount = amountUSDTDeposit
          .mul(MaxBlidPerUSD.add(OverDepositPerUSD))
          .div(ethers.utils.parseEther("1"));

        await storageV21.connect(other1).depositBLID(depositAmount);

        user1DepositAmount = USDTBalanceUser1.mul(MaxBlidPerUSD).div(
          ethers.utils.parseEther("1")
        );

        const afterBlidbalance = await blid.balanceOf(other1.address);
        expect(beforeBlidbalance).to.be.equal(
          afterBlidbalance.add(depositAmount),
          "Deposit BLID"
        );

        startBlockUser1 = await ethers.provider.getBlockNumber();
      });

      it("get boosting claimable BLID for user1", async () => {
        await time.advanceBlock();

        const claimableAmount = await storageV21.getBoostingClaimableBLID(
          other1.address
        );
        const blockCount =
          (await ethers.provider.getBlockNumber()) - startBlockUser1 + 1;

        expect(claimableAmount).to.be.equal(
          user1DepositAmount
            .mul(BlidPerBlock)
            .mul(blockCount)
            .div(ethers.utils.parseEther("1")),
          "Claimable amount for user 1 should be the same"
        );
      });

      it("user 2 deposit BLID for boosting (activeSupplyBLID > MaxActiveBLID)", async () => {
        const beforeBlidbalance = await blid.balanceOf(other2.address);
        const depositAmount = amountUSDTDeposit
          .div(2)
          .mul(MaxBlidPerUSD.add(OverDepositPerUSD))
          .div(ethers.utils.parseEther("1"));

        await storageV21.connect(other2).depositBLID(depositAmount);

        user2DepositAmount = depositAmount;

        const afterBlidbalance = await blid.balanceOf(other2.address);
        expect(beforeBlidbalance).to.be.equal(
          afterBlidbalance.add(depositAmount),
          "Deposit BLID"
        );

        startBlockUser2 = await ethers.provider.getBlockNumber();
      });

      it("get boosting claimable BLID for user1, user2 (ClaimableBLID should be smaller than expected", async () => {
        await time.advanceBlock();

        const claimableAmount1 = await storageV21.getBoostingClaimableBLID(
          other1.address
        );
        const claimableAmount2 = await storageV21.getBoostingClaimableBLID(
          other2.address
        );
        const blockCountUser1 =
          (await ethers.provider.getBlockNumber()) - startBlockUser1 + 1;

        const blockCountUser2 =
          (await ethers.provider.getBlockNumber()) - startBlockUser2 + 1;

        const beforeExpectUser1Amount = user1DepositAmount
          .mul(BlidPerBlock)
          .mul(blockCountUser1)
          .div(ethers.utils.parseEther("1"));
        const beforeExpectUser2Amount = user2DepositAmount
          .mul(BlidPerBlock)
          .mul(blockCountUser2)
          .div(ethers.utils.parseEther("1"));

        expect(claimableAmount1).to.be.below(
          beforeExpectUser1Amount,
          "ClaimableBLId amout for User1"
        );
        expect(claimableAmount2).to.be.below(
          beforeExpectUser2Amount,
          "ClaimableBLID amount for User2"
        );
      });

      it("claim BLID for user1", async () => {
        await time.advanceBlock();

        const beforeBlidbalance = await blid.balanceOf(other1.address);
        const claimableBlid = await storageV21.getBoostingClaimableBLID(
          other1.address
        );

        const tx = await storageV21.connect(other1).claimBoostingRewardBLID();

        const afterBlidbalance = await blid.balanceOf(other1.address);
        expect(afterBlidbalance).to.be.above(
          beforeBlidbalance,
          "BLID balance of user1 should be increased"
        );

        expect(claimableBlid).to.be.equal(
          afterBlidbalance.sub(beforeBlidbalance),
          "ClaimableBLID should be the same as claim amount"
        );

        startBlockUser1 = await ethers.provider.getBlockNumber();
      });

      it("claim BLID for user2", async () => {
        await time.advanceBlock();
        const beforeBlidbalance = await blid.balanceOf(other2.address);
        const claimableBlid = await storageV21.getBoostingClaimableBLID(
          other2.address
        );

        const tx = await storageV21.connect(other2).claimBoostingRewardBLID();

        const afterBlidbalance = await blid.balanceOf(other2.address);
        expect(afterBlidbalance).to.be.above(
          beforeBlidbalance,
          "BLID balance of user2 should be increased"
        );

        expect(claimableBlid).to.be.equal(
          afterBlidbalance.sub(beforeBlidbalance),
          "ClaimableBLID should be the same as claim amount"
        );

        startBlockUser2 = await ethers.provider.getBlockNumber();
      });

      it("withdraw of user 1", async () => {
        await time.advanceBlock();

        const withdrawAmount = await storageV21.getBoostingBLIDAmount(
          other1.address
        );
        const beforeBlidbalance = await blid.balanceOf(other1.address);

        const claimableBLIDAmount = await storageV21.getBoostingClaimableBLID(
          other1.address
        );

        await storageV21.connect(other1).withdrawBLID(withdrawAmount);

        const afterBlidbalance = await blid.balanceOf(other1.address);

        expect(afterBlidbalance).to.be.equal(
          beforeBlidbalance.add(withdrawAmount).add(claimableBLIDAmount),
          "Claimed BLID"
        );

        expect(
          (await storageV21.getBoostingBLIDAmount(other1.address)).toString()
        ).to.be.equal("0");

        startBlockUser1 = await ethers.provider.getBlockNumber();
      });

      it("withdraw of user 2", async () => {
        await time.advanceBlock();

        const withdrawAmount = await storageV21.getBoostingBLIDAmount(
          other2.address
        );
        const beforeBlidbalance = await blid.balanceOf(other2.address);

        const claimableBLIDAmount = await storageV21.getBoostingClaimableBLID(
          other2.address
        );

        await storageV21.connect(other2).withdrawBLID(withdrawAmount);

        const afterBlidbalance = await blid.balanceOf(other2.address);

        expect(afterBlidbalance).to.be.equal(
          beforeBlidbalance.add(withdrawAmount).add(claimableBLIDAmount),
          "Claimed BLID"
        );

        expect(
          (await storageV21.getBoostingBLIDAmount(other2.address)).toString()
        ).to.be.equal("0");

        startBlockUser2 = await ethers.provider.getBlockNumber();
      });
    });

    describe("Time Subtraction Check", async () => {
      const _maxBlidPerUSD = ethers.utils.parseEther("1");
      const _blidPerBlock = ethers.utils.parseEther("0.000000028538812785");
      const _maxActiveBLID = ethers.utils.parseEther("1000");
      const _depositAmount = ethers.utils.parseEther("5");
      const _smallAmount = ethers.utils.parseEther("4.9999999");
      const _addEarnAmount = ethers.utils.parseEther("50");

      let tokenTimeUser1: BigNumber, tokenTimeUser2: BigNumber;

      it("Withdraw total USDT", async () => {
        await storageV21
          .connect(other1)
          .withdraw(
            await storageV21.getTokenDeposit(other1.address, usdt.address),
            usdt.address
          );

        await storageV21
          .connect(other2)
          .withdraw(
            await storageV21.getTokenDeposit(other2.address, usdt.address),
            usdt.address
          );

        expect(
          (await storageV21.getTokenDeposited(usdt.address)).toString()
        ).to.be.equal("0", "USDT in storage should be 0");

        expect(
          (await storageV21.balanceOf(other1.address)).toString()
        ).to.be.equal("0", "User 1 balance should be 0");

        expect(
          (await storageV21.balanceOf(other2.address)).toString()
        ).to.be.equal("0", "User 2 balance should be 0");
      });

      it("Start new epic", async () => {
        await storageV21.connect(logicContract).addEarn(_addEarnAmount);
      });

      it("Update Boosting Info", async () => {
        await storageV21
          .connect(owner)
          .setBoostingInfo(_maxBlidPerUSD, _blidPerBlock, _maxActiveBLID);
      });

      it("Deposit, Withdraw to storage", async () => {
        let tx;

        tx = await storageV21
          .connect(other1)
          .deposit(_depositAmount, usdt.address);
        await tx.wait();
        tokenTimeUser1 = _depositAmount.mul(await time.latest());

        await mine(100);

        tx = await storageV21
          .connect(other2)
          .deposit(_depositAmount, usdt.address);
        await tx.wait();
        tokenTimeUser2 = _depositAmount.mul(await time.latest());

        await mine(100);

        tx = await storageV21
          .connect(other1)
          .withdraw(_smallAmount, usdt.address);
        await tx.wait();
        tokenTimeUser1 = tokenTimeUser1.sub(
          _smallAmount.mul(await time.latest())
        );

        await mine(100);

        tx = await storageV21
          .connect(other1)
          .deposit(_depositAmount, usdt.address);
        await tx.wait();
        tokenTimeUser1 = tokenTimeUser1.add(
          _depositAmount.mul(await time.latest())
        );

        await mine(100);

        tx = await storageV21
          .connect(other1)
          .withdraw(_smallAmount, usdt.address);
        await tx.wait();
        tokenTimeUser1 = tokenTimeUser1.sub(
          _smallAmount.mul(await time.latest())
        );

        await mine(100);

        tx = await storageV21
          .connect(other1)
          .deposit(_depositAmount, usdt.address);
        await tx.wait();
        tokenTimeUser1 = tokenTimeUser1.add(
          _depositAmount.mul(await time.latest())
        );

        await mine(100);

        tx = await storageV21
          .connect(other1)
          .withdraw(_smallAmount, usdt.address);
        await tx.wait();
        tokenTimeUser1 = tokenTimeUser1.sub(
          _smallAmount.mul(await time.latest())
        );

        await mine(100);

        tx = await storageV21
          .connect(other1)
          .deposit(_depositAmount, usdt.address);
        await tx.wait();
        tokenTimeUser1 = tokenTimeUser1.add(
          _depositAmount.mul(await time.latest())
        );

        await mine(100);

        tx = await storageV21
          .connect(other1)
          .withdraw(_smallAmount, usdt.address);
        await tx.wait();
        tokenTimeUser1 = tokenTimeUser1.sub(
          _smallAmount.mul(await time.latest())
        );

        await mine(100);

        tx = await storageV21
          .connect(other1)
          .deposit(_depositAmount, usdt.address);
        await tx.wait();
        tokenTimeUser1 = tokenTimeUser1.add(
          _depositAmount.mul(await time.latest())
        );

        await mine(100);

        tx = await storageV21
          .connect(other1)
          .withdraw(_smallAmount, usdt.address);
        await tx.wait();
        tokenTimeUser1 = tokenTimeUser1.sub(
          _smallAmount.mul(await time.latest())
        );

        await mine(100);

        tx = await storageV21
          .connect(other1)
          .deposit(_depositAmount, usdt.address);
        await tx.wait();
        tokenTimeUser1 = tokenTimeUser1.add(
          _depositAmount.mul(await time.latest())
        );

        await mine(100);

        tx = await storageV21
          .connect(other1)
          .withdraw(_smallAmount, usdt.address);
        await tx.wait();
        tokenTimeUser1 = tokenTimeUser1.sub(
          _smallAmount.mul(await time.latest())
        );

        await mine(100);
      });

      it("Add Earn 50", async () => {
        const blidBalanceLogicBefore = await blid.balanceOf(
          logicContract.address
        );
        const blidBalanceStorageBefore = await blid.balanceOf(
          storageV21.address
        );

        await storageV21.connect(logicContract).addEarn(_addEarnAmount);

        const blidBalanceLogicAfter = await blid.balanceOf(
          logicContract.address
        );
        const blidBalanceStorageAfter = await blid.balanceOf(
          storageV21.address
        );

        expect(
          blidBalanceLogicBefore.sub(_addEarnAmount).sub(blidBalanceLogicAfter)
        ).to.be.equal(
          0,
          "Logic BLID balance should be decreased by addEarn amount"
        );

        expect(
          blidBalanceStorageBefore
            .add(_addEarnAmount)
            .sub(blidBalanceStorageAfter)
        ).to.be.equal(
          0,
          "Storage BLID balance should be increased by addEarn amount"
        );

        // Calculate final tokenTime
        tokenTimeUser1 = (
          await storageV21.getTokenDeposit(other1.address, usdt.address)
        )
          .mul(await time.latest())
          .sub(tokenTimeUser1);

        tokenTimeUser2 = _depositAmount
          .mul(await time.latest())
          .sub(tokenTimeUser2);
      });

      it("Check of earning", async () => {
        const earned1 = await storageV21.balanceEarnBLID(other1.address);
        const earned2 = await storageV21.balanceEarnBLID(other2.address);

        // Check earning total
        expect(earned1.add(earned2)).to.be.closeTo(_addEarnAmount, 1);

        expect(earned1.add(earned2).lte(_addEarnAmount)).to.be.equal(
          true,
          "Sum should be smaller than total"
        );

        // Check individual earning
        const earnedExpected1 = _addEarnAmount
          .mul(tokenTimeUser1)
          .div(tokenTimeUser1.add(tokenTimeUser2));

        const earnedExpected2 = _addEarnAmount
          .mul(tokenTimeUser2)
          .div(tokenTimeUser1.add(tokenTimeUser2));

        expect(earned1.eq(earnedExpected1)).to.be.equal(
          true,
          "user1 earned is the same as expected"
        );
        expect(earned2.eq(earnedExpected2)).to.be.equal(
          true,
          "user2 earned is the same as expected"
        );
      });
    });

    describe("Oracle KillSwitch", async () => {
      it("deposit success", async () => {
        await storageV21
          .connect(other1)
          .deposit(ethers.utils.parseEther("0.01"), usdt.address);
        await storageV21
          .connect(other1)
          .deposit(ethers.utils.parseEther("0.01"), usdc.address);
      });

      it("Change USDT rate oracle to be 200%", async () => {
        await aggregator3.connect(owner).updateRate(8, 200000000);
      });

      it("withdraw success", async () => {
        await storageV21
          .connect(other1)
          .withdraw(ethers.utils.parseEther("0.001"), usdt.address);
        await storageV21
          .connect(other1)
          .withdraw(ethers.utils.parseEther("0.001"), usdc.address);
      });

      it("Add earn should be failed", async () => {
        await expect(
          storageV21.connect(logicContract).addEarn("50")
        ).to.be.revertedWith("E19");
      });

      it("Update latestAnswer for USDT", async () => {
        await storageV21
          .connect(owner)
          .setOracleLatestAnswer(usdt.address, 200000000);
      });

      it("Add earn should be success", async () => {
        await storageV21.connect(logicContract).addEarn("50");
      });
    });
  });
});
