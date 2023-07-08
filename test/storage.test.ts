/*******************************************
 * Test on hardhat
 *******************************************/

import {ethers, upgrades} from "hardhat";
import {TokenDistributionModel} from "./utils/TokenDistributionModel";
import {time} from "@openzeppelin/test-helpers";
import {
  ERC20,
  StorageV21,
  Aggregator,
  AggregatorN2,
} from "../typechain-types";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {expect} from "chai";
import {BigNumber} from "ethers";
import type {ContractTransaction} from "ethers";

async function getTimestampTransaction(transaction: ContractTransaction) {
  const open = transaction.blockHash;
  return (await ethers.provider.getBlock(open!)).timestamp;
}

async function deployContracts(
  owner: SignerWithAddress,
  logicContract: SignerWithAddress
) {
  let blid: ERC20,
    usdt: ERC20,
    usdtn2: ERC20,
    usdc: ERC20,
    storage: StorageV21,
    aggregator: Aggregator,
    aggregator2: AggregatorN2,
    model: TokenDistributionModel;

  model = new TokenDistributionModel();

  const Storage = await ethers.getContractFactory("StorageV21", owner);
  const Aggregator = await ethers.getContractFactory("Aggregator", owner);
  const AggregatorN2 = await ethers.getContractFactory("AggregatorN2", owner);
  const USDT = await ethers.getContractFactory("ERC20", owner);
  const USDC = await ethers.getContractFactory("ERC20", owner);
  const BLID = await ethers.getContractFactory("ERC20", logicContract);
  const USDTN2 = await ethers.getContractFactory("ERC20", owner);

  aggregator = (await Aggregator.deploy()) as Aggregator;
  aggregator2 = (await AggregatorN2.deploy()) as AggregatorN2;
  blid = (await BLID.deploy("some erc20 as if BLID", "SERC")) as ERC20;
  usdt = (await USDT.deploy("some erc20", "SERC")) as ERC20;
  usdtn2 = (await USDTN2.deploy("some erc20", "SERC")) as ERC20;
  usdc = (await USDC.deploy("some erc20", "SERC")) as ERC20;

  storage = (await upgrades.deployProxy(Storage, [], {
    initializer: "initialize",
    unsafeAllow: ["constructor"],
  })) as StorageV21;
  await storage.deployed();

  let tx;
  tx = await storage.connect(owner).setBLID(blid.address);
  await tx.wait(1);

  tx = await storage.connect(owner).setLogic(logicContract.address);
  await tx.wait(1);

  return {
    blid,
    usdt,
    usdtn2,
    usdc,
    storage,
    aggregator,
    aggregator2,
    model,
  };
}

describe("StorageV21", async () => {
  let blid: ERC20, usdt: ERC20, usdtn2: ERC20, usdc: ERC20;
  let storage: StorageV21,
    aggregator: Aggregator,
    aggregator2: AggregatorN2,
    startTime: typeof time,
    model: TokenDistributionModel,
    transationTime: number,
    balance: BigNumber;
  let owner: SignerWithAddress,
    logicContract: SignerWithAddress,
    Alexander: SignerWithAddress,
    Dmitry: SignerWithAddress,
    Victor: SignerWithAddress,
    other1: SignerWithAddress,
    other2: SignerWithAddress;

  before(async () => {
    [owner, logicContract, Alexander, Dmitry, Victor, other1, other2] =
      await ethers.getSigners();
    const contracts = await deployContracts(owner, logicContract);

    blid = contracts.blid;
    usdt = contracts.usdt;
    usdtn2 = contracts.usdtn2;
    usdc = contracts.usdc;
    storage = contracts.storage;
    aggregator = contracts.aggregator;
    aggregator2 = contracts.aggregator2;
    model = contracts.model;
  });
  before(async () => {
    await usdt
      .connect(owner)
      .transfer(Alexander.address, ethers.utils.parseEther("1"));
    await usdt
      .connect(owner)
      .transfer(Dmitry.address, ethers.utils.parseEther("1"));
    await usdt
      .connect(owner)
      .transfer(Victor.address, ethers.utils.parseEther("1"));
  });

  describe("deployment", async () => {
    it("deploys blid successfully", async () => {
      const address = await blid.address;
      expect(address).to.be.not.eql(0x0);
      expect(address).to.be.not.eql("");
      expect(address).to.be.not.eql(null);
      expect(address).to.be.not.eql(undefined);
    });

    it("deploys storage successfully", async () => {
      const address = await storage.address;
      expect(address).to.be.not.eql(0x0);
      expect(address).to.be.not.eql("");
      expect(address).to.be.not.eql(null);
      expect(address).to.be.not.eql(undefined);
    });

    it("deploys usdt successfully", async () => {
      const address = await usdt.address;
      expect(address).to.be.not.eql(0x0);
      expect(address).to.be.not.eql("");
      expect(address).to.be.not.eql(null);
      expect(address).to.be.not.eql(undefined);
    });
  });

  describe("add tokens", async () => {
    it("add tokens", async () => {
      await storage.connect(owner).addToken(usdt.address, aggregator.address);
      await storage.connect(owner).addToken(usdc.address, aggregator.address);
    });

    it("_isUsedToken", async () => {
      let isUsedToken = await storage._isUsedToken(usdt.address);
      expect(isUsedToken.toString()).to.be.eql("true", "usdt is used");

      isUsedToken = await storage._isUsedToken(usdc.address);
      expect(isUsedToken.toString()).to.be.eql("true", "usdc is used");

      isUsedToken = await storage._isUsedToken(usdtn2.address);
      expect(isUsedToken.toString()).to.be.eql("false", "usdtn2 is not used");
    });
  });

  describe("standard scence", async () => {
    it("can not use deposit unknown token address", async () => {
      await expect(
        storage.connect(Alexander).deposit(1000, other2.address)
      ).to.be.revertedWith("E1");
    });

    it("not can used returnToken when small allowance", async () => {
      await expect(
        storage
          .connect(Alexander)
          .deposit(ethers.utils.parseEther("5"), usdt.address)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("deposit", async () => {
      await usdt
        .connect(Alexander)
        .approve(storage.address, ethers.utils.parseEther("0.000001"));
      startTime = await time.latest();
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Alexander)
          .deposit(ethers.utils.parseEther("0.000001"), usdt.address)
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );
      startTime = startTime.add(time.duration.hours(300));
      await time.increaseTo(startTime);

      await usdt
        .connect(Dmitry)
        .approve(storage.address, ethers.utils.parseEther("0.000001"));
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Dmitry)
          .deposit(ethers.utils.parseEther("0.000001"), usdt.address)
      );
      model.deposit(
        Dmitry.address,
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );

      balance = await storage.balanceOf(Alexander.address);
      expect(balance.toString()).to.be.eql("999970690000");
      balance = await storage.balanceOf(Dmitry.address);
      expect(balance.toString()).to.be.eql("999970690000");
      balance = await storage.getTokenBalance(usdt.address);
      expect(balance.toString()).to.be.eql("2000000000000");
    });

    it("can not take token more than you have", async () => {
      await expect(
        storage
          .connect(logicContract)
          .takeToken(ethers.utils.parseEther("0.00001"), usdt.address)
      ).to.be.revertedWith("E18");
    });

    it("take token", async () => {
      await storage.connect(logicContract).takeToken(4000, usdt.address);
      balance = await usdt.balanceOf(logicContract.address);
      expect(balance.toString()).to.be.eql("4000");
      balance = await usdt.balanceOf(storage.address);
      expect(balance.toString()).to.be.eql("1999999996000");
    });

    it("not can used returnToken when small allowance", async () => {
      await usdt.connect(logicContract).approve(storage.address, 4000);
      await expect(
        storage.connect(logicContract).returnToken(5000, usdt.address)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("not can used returnToken unknown token address", async () => {
      await usdt.connect(logicContract).approve(storage.address, 4000);
      await expect(
        storage.connect(logicContract).returnToken(4000, other2.address)
      ).to.be.revertedWith("E1");
    });

    it("add earn", async () => {
      await usdt.connect(logicContract).approve(storage.address, 4000);
      await storage.connect(logicContract).returnToken(4000, usdt.address);
      await blid
        .connect(logicContract)
        .approve(storage.address, ethers.utils.parseEther("0.000002"));
      startTime = startTime.add(time.duration.hours(100));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000001"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );
      balance = await storage.balanceEarnBLID(Dmitry.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getEarn(Dmitry.address)),
        10 ** 3
      );
      balance = await storage.balanceEarnBLID(Alexander.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getEarn(Alexander.address)),
        10 ** 3
      );
    });

    it("second add earn", async () => {
      await usdt
        .connect(Victor)
        .approve(storage.address, ethers.utils.parseEther("0.000001"));
      startTime = startTime.add(time.duration.hours(100));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Victor)
          .deposit(ethers.utils.parseEther("0.000001"), usdt.address)
      );
      model.deposit(
        Victor.address,
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );
      startTime = startTime.add(time.duration.hours(100));
      await time.increaseTo(startTime);

      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000001"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );
      balance = await storage.balanceEarnBLID(Dmitry.address);

      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getEarn(Dmitry.address)),
        10 ** 3
      );
      balance = await storage.balanceEarnBLID(Victor.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getEarn(Victor.address)),
        10 ** 3
      );
      balance = await storage.balanceEarnBLID(Alexander.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getEarn(Alexander.address)),
        10 ** 3
      );
    });

    it("take earn", async () => {
      await storage.connect(Dmitry).interestFee(Dmitry.address);
      await storage.connect(Victor).interestFee(Victor.address);
      model.claim(Dmitry.address);
      model.claim(Victor.address);
      balance = await blid.balanceOf(Victor.address);

      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getBalance(Victor.address)),
        10 ** 3
      );

      balance = await blid.balanceOf(Dmitry.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getBalance(Dmitry.address)),
        10 ** 3
      );

      balance = await storage.balanceEarnBLID(Dmitry.address);
      expect(balance.toString()).to.be.eql("0");
    });

    it("withdraw when amount more then have user", async () => {
      await expect(
        storage.connect(Dmitry).withdraw("999999999999999999", usdt.address)
      ).to.be.revertedWith("E4");
    });

    it("withdraw when amount equal zero", async () => {
      await expect(
        storage.connect(Dmitry).withdraw("0", usdt.address)
      ).to.be.revertedWith("E4");
    });

    it("deposit when amount equal zero", async () => {
      await expect(
        storage.connect(Dmitry).deposit("0", usdt.address)
      ).to.be.revertedWith("E3");
    });

    it("withdraw", async () => {
      startTime = startTime.add(time.duration.hours(100));
      await time.increaseTo(startTime);
      balance = await usdt.balanceOf(Dmitry.address);
      expect(balance.toString()).to.be.eql("999999000000000000");
      balance = await storage.balanceOf(Dmitry.address);
      expect(balance.toString()).to.be.eql("999970690000");
      balance = await usdt.balanceOf(storage.address);
      expect(balance.toString()).to.be.eql("3000000000000");
      transationTime = await getTimestampTransaction(
        await storage.connect(Dmitry).withdraw(3000, usdt.address)
      );
      balance = await usdt.balanceOf(Dmitry.address);
      expect(balance.toString()).to.be.eql("999999000000003000");
      balance = await storage.balanceOf(Dmitry.address);
      expect(balance.toString()).to.be.eql("999970687000");
      balance = await usdt.balanceOf(storage.address);
      expect(balance.toString()).to.be.eql("2999999997000");
    });

    it("add earn", async () => {
      await usdt.connect(logicContract).approve(storage.address, 4000);
      await blid
        .connect(logicContract)
        .approve(storage.address, ethers.utils.parseEther("0.000002"));
      startTime = startTime.add(time.duration.seconds(100));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000001"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );
      balance = await storage.balanceEarnBLID(Dmitry.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getEarn(Dmitry.address)),
        10 ** 3
      );
      balance = await storage.balanceEarnBLID(Alexander.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getEarn(Alexander.address)),
        10 ** 3
      );
    });
  });

  describe("small seconds scence", async () => {
    before(async () => {
      const contracts = await deployContracts(owner, logicContract);

      blid = contracts.blid;
      usdt = contracts.usdt;
      usdtn2 = contracts.usdtn2;
      storage = contracts.storage;
      aggregator = contracts.aggregator;
      aggregator2 = contracts.aggregator2;
      model = contracts.model;
    });
    before(async () => {
      startTime = await time.latest();

      await usdt
        .connect(owner)
        .transfer(Alexander.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Dmitry.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Victor.address, ethers.utils.parseEther("1"));
    });

    it("add tokens", async () => {
      await storage.connect(owner).addToken(usdt.address, aggregator.address);
    });

    it("deposit", async () => {
      await usdt
        .connect(Alexander)
        .approve(storage.address, ethers.utils.parseEther("0.000001"));
      startTime = await time.latest();
      startTime = startTime.add(time.duration.seconds(20));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Alexander)
          .deposit(ethers.utils.parseEther("0.000001"), usdt.address)
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );
      startTime = startTime.add(time.duration.seconds(30));

      await usdt
        .connect(Dmitry)
        .approve(storage.address, ethers.utils.parseEther("0.000001"));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Dmitry)
          .deposit(ethers.utils.parseEther("0.000001"), usdt.address)
      );
      model.deposit(
        Dmitry.address,
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );

      balance = await storage.balanceOf(Alexander.address);
      expect(balance.toString()).to.be.eql("999970690000");
      balance = await storage.balanceOf(Dmitry.address);
      expect(balance.toString()).to.be.eql("999970690000");
      balance = await storage.connect(Dmitry).getTokenBalance(usdt.address);
      expect(balance.toString()).to.be.eql("2000000000000");
    });

    it("add earn", async () => {
      await usdt.connect(logicContract).approve(storage.address, 4000);
      await blid
        .connect(logicContract)
        .approve(storage.address, ethers.utils.parseEther("0.000002"));
      startTime = startTime.add(time.duration.seconds(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000001"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );
      balance = await storage.balanceEarnBLID(Dmitry.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getEarn(Dmitry.address)),
        10000
      );
      balance = await storage.balanceEarnBLID(Alexander.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getEarn(Alexander.address)),
        10000
      );
    });
  });

  describe("small third scence", async () => {
    before(async () => {
      const contracts = await deployContracts(owner, logicContract);

      blid = contracts.blid;
      usdt = contracts.usdt;
      usdtn2 = contracts.usdtn2;
      storage = contracts.storage;
      aggregator = contracts.aggregator;
      aggregator2 = contracts.aggregator2;
      model = contracts.model;
    });
    before(async () => {
      startTime = await time.latest();

      await usdt
        .connect(owner)
        .transfer(Alexander.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Dmitry.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Victor.address, ethers.utils.parseEther("1"));
    });
    it("add tokens", async () => {
      await storage.connect(owner).addToken(usdt.address, aggregator.address);
    });
    it("deposit", async () => {
      await usdt
        .connect(Alexander)
        .approve(storage.address, ethers.utils.parseEther("0.000001"));
      startTime = await time.latest();
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Alexander)
          .deposit(ethers.utils.parseEther("0.000001"), usdt.address)
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );
      startTime = startTime.add(time.duration.hours(30));

      await usdt
        .connect(Dmitry)
        .approve(storage.address, ethers.utils.parseEther("0.000002"));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Dmitry)
          .deposit(ethers.utils.parseEther("0.000002"), usdt.address)
      );
      model.deposit(
        Dmitry.address,
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );

      balance = await storage.balanceOf(Alexander.address);
      expect(balance.toString()).to.be.eql("999970690000");
      balance = await storage.balanceOf(Dmitry.address);
      expect(balance.toString()).to.be.eql("1999941380000");
      balance = await storage.connect(Dmitry).getTokenBalance(usdt.address);
      expect(balance.toString()).to.be.eql("3000000000000");
    });

    it("add earn", async () => {
      await usdt.connect(logicContract).approve(storage.address, 4000);
      await blid
        .connect(logicContract)
        .approve(storage.address, ethers.utils.parseEther("0.000002"));
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000001"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );
      balance = await storage.balanceEarnBLID(Dmitry.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getEarn(Dmitry.address)),
        10 ** 3
      );

      balance = await storage.balanceEarnBLID(Alexander.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getEarn(Alexander.address)),
        10 ** 3
      );
    });
  });

  describe("new token", async () => {
    before(async () => {
      const contracts = await deployContracts(owner, logicContract);

      blid = contracts.blid;
      usdt = contracts.usdt;
      usdtn2 = contracts.usdtn2;
      storage = contracts.storage;
      aggregator = contracts.aggregator;
      aggregator2 = contracts.aggregator2;
      model = contracts.model;
    });

    before(async () => {
      startTime = await time.latest();
      await usdt
        .connect(owner)
        .transfer(Alexander.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Dmitry.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Victor.address, ethers.utils.parseEther("1"));
    });

    before(async () => {
      await usdtn2
        .connect(owner)
        .transfer(Alexander.address, ethers.utils.parseEther("1"));
      await usdtn2
        .connect(owner)
        .transfer(Dmitry.address, ethers.utils.parseEther("1"));
      await usdtn2
        .connect(owner)
        .transfer(Victor.address, ethers.utils.parseEther("1"));
    });
    it("add tokens", async () => {
      await storage.connect(owner).addToken(usdt.address, aggregator.address);
      await storage
        .connect(owner)
        .addToken(usdtn2.address, aggregator2.address);
    });
    it("deposit", async () => {
      await usdt
        .connect(Alexander)
        .approve(storage.address, ethers.utils.parseEther("0.000001"));
      startTime = await time.latest();
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Alexander)
          .deposit(ethers.utils.parseEther("0.000001"), usdt.address)
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );
      startTime = startTime.add(time.duration.hours(30));
    });

    it("deposit", async () => {
      await usdtn2
        .connect(Dmitry)
        .approve(storage.address, ethers.utils.parseEther("0.000002"));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Dmitry)
          .deposit(ethers.utils.parseEther("0.000001"), usdtn2.address)
      );
      model.deposit(
        Dmitry.address,
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()) * 2,
        transationTime
      );

      balance = await storage.balanceOf(Alexander.address);
      expect(balance.toString()).to.be.eql("999970690000");
      balance = await storage.balanceOf(Dmitry.address);
      expect(balance.toString()).to.be.eql("1999941380000");
      balance = await storage.connect(Dmitry).getTokenBalance(usdt.address);
      expect(balance.toString()).to.be.eql("1000000000000");
    });

    it("add earn", async () => {
      await usdt.connect(logicContract).approve(storage.address, 4000);
      await blid
        .connect(logicContract)
        .approve(storage.address, ethers.utils.parseEther("0.000002"));
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000001"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );
      balance = await storage.balanceEarnBLID(Dmitry.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getEarn(Dmitry.address)),
        10 ** 3
      );

      balance = await storage.balanceEarnBLID(Alexander.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getEarn(Alexander.address)),
        10 ** 3
      );
    });
  });

  describe("double deposit", async () => {
    before(async () => {
      const contracts = await deployContracts(owner, logicContract);

      blid = contracts.blid;
      usdt = contracts.usdt;
      usdtn2 = contracts.usdtn2;
      storage = contracts.storage;
      aggregator = contracts.aggregator;
      aggregator2 = contracts.aggregator2;
      model = contracts.model;
    });
    before(async () => {
      startTime = await time.latest();

      await usdt
        .connect(owner)
        .transfer(Alexander.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Dmitry.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Victor.address, ethers.utils.parseEther("1"));
    });

    it("add tokens", async () => {
      await storage.connect(owner).addToken(usdt.address, aggregator.address);
    });

    it("first deposit", async () => {
      await usdt
        .connect(Dmitry)
        .approve(storage.address, ethers.utils.parseEther("0.000002"));
      await usdt
        .connect(Alexander)
        .approve(storage.address, ethers.utils.parseEther("0.000007"));
      startTime = await time.latest();
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Dmitry)
          .deposit(ethers.utils.parseEther("0.000001"), usdt.address)
      );
      model.deposit(
        Dmitry.address,
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Alexander)
          .deposit(ethers.utils.parseEther("0.000002"), usdt.address)
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("first add earn", async () => {
      await usdt.connect(logicContract).approve(storage.address, 4000);
      await blid
        .connect(logicContract)
        .approve(storage.address, ethers.utils.parseEther("0.00001"));
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000001"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );
    });

    it("second deposit", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Alexander)
          .deposit(ethers.utils.parseEther("0.000002"), usdt.address)
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
      balance = await storage.balanceEarnBLID(Alexander.address);
    });

    it("second add earn", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000002"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
      balance = await storage.balanceEarnBLID(Dmitry.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getEarn(Dmitry.address)),
        10 ** 3
      );
      balance = await storage.balanceEarnBLID(Alexander.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getEarn(Alexander.address)),
        10 ** 3
      );
    });
  });

  describe("double deposit - depositOnBehalf", async () => {
    before(async () => {
      const contracts = await deployContracts(owner, logicContract);

      blid = contracts.blid;
      usdt = contracts.usdt;
      usdtn2 = contracts.usdtn2;
      storage = contracts.storage;
      aggregator = contracts.aggregator;
      aggregator2 = contracts.aggregator2;
      model = contracts.model;
    });
    before(async () => {
      startTime = await time.latest();

      await usdt
        .connect(owner)
        .transfer(Alexander.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Dmitry.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Victor.address, ethers.utils.parseEther("1"));
    });

    it("add tokens", async () => {
      await storage.connect(owner).addToken(usdt.address, aggregator.address);
    });

    it("first deposit", async () => {
      await usdt
        .connect(owner)
        .approve(storage.address, ethers.utils.parseEther("0.000002"));
      await usdt
        .connect(owner)
        .approve(storage.address, ethers.utils.parseEther("0.000007"));
      startTime = await time.latest();
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(owner)
          .depositOnBehalf(
            ethers.utils.parseEther("0.000001"),
            usdt.address,
            Dmitry.address
          )
      );
      model.deposit(
        Dmitry.address,
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(owner)
          .depositOnBehalf(
            ethers.utils.parseEther("0.000002"),
            usdt.address,
            Alexander.address
          )
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("first add earn", async () => {
      await usdt.connect(logicContract).approve(storage.address, 4000);
      await blid
        .connect(logicContract)
        .approve(storage.address, ethers.utils.parseEther("0.00001"));
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000001"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );
    });

    it("second deposit", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(owner)
          .depositOnBehalf(
            ethers.utils.parseEther("0.000002"),
            usdt.address,
            Alexander.address
          )
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
      balance = await storage.balanceEarnBLID(Alexander.address);
    });

    it("second add earn", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000002"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
      balance = await storage.balanceEarnBLID(Dmitry.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getEarn(Dmitry.address)),
        10 ** 3
      );
      balance = await storage.balanceEarnBLID(Alexander.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getEarn(Alexander.address)),
        10 ** 3
      );
    });
  });

  describe("deposit all withdraw addEarn interestFee", async () => {
    before(async () => {
      const contracts = await deployContracts(owner, logicContract);

      blid = contracts.blid;
      usdt = contracts.usdt;
      usdtn2 = contracts.usdtn2;
      storage = contracts.storage;
      aggregator = contracts.aggregator;
      aggregator2 = contracts.aggregator2;
      model = contracts.model;
    });
    before(async () => {
      startTime = await time.latest();

      await usdt
        .connect(owner)
        .transfer(Alexander.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Dmitry.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Victor.address, ethers.utils.parseEther("1"));
    });
    it("add tokens", async () => {
      await storage.connect(owner).addToken(usdt.address, aggregator.address);
    });
    it("first deposit", async () => {
      await usdt
        .connect(Dmitry)
        .approve(storage.address, ethers.utils.parseEther("0.000002"));
      await usdt
        .connect(Alexander)
        .approve(storage.address, ethers.utils.parseEther("0.000007"));
      startTime = await time.latest();
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Dmitry)
          .deposit(ethers.utils.parseEther("0.000001"), usdt.address)
      );
      model.deposit(
        Dmitry.address,
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Alexander)
          .deposit(ethers.utils.parseEther("0.000002"), usdt.address)
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );

      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Dmitry)
          .withdraw(ethers.utils.parseEther("0.000001"), usdt.address)
      );
      model.deposit(
        Dmitry.address,
        -Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );

      balance = await blid.balanceOf(Dmitry.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getBalance(Dmitry.address)),
        10 ** 3
      );
      expect(balance.toString()).to.be.eql("0");
    });

    it("first add earn", async () => {
      await usdt.connect(logicContract).approve(storage.address, 4000);
      await blid
        .connect(logicContract)
        .approve(storage.address, ethers.utils.parseEther("0.00001"));
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000001"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );
      await storage.connect(Alexander).interestFee(Alexander.address);
      model.claim(Alexander.address);
      balance = await blid.balanceOf(Alexander.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getBalance(Alexander.address)),
        10 ** 3
      );
      expect(Number.parseInt(balance.toString())).closeTo(
        666666666666,
        7000000
      );
    });
  });

  describe("zero deposit one add earn", async () => {
    before(async () => {
      const contracts = await deployContracts(owner, logicContract);

      blid = contracts.blid;
      usdt = contracts.usdt;
      usdtn2 = contracts.usdtn2;
      storage = contracts.storage;
      aggregator = contracts.aggregator;
      aggregator2 = contracts.aggregator2;
      model = contracts.model;
    });
    before(async () => {
      startTime = await time.latest();

      await usdt
        .connect(owner)
        .transfer(Alexander.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Dmitry.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Victor.address, ethers.utils.parseEther("1"));
    });
    it("add tokens", async () => {
      await storage.connect(owner).addToken(usdt.address, aggregator.address);
    });
    it("first add earn", async () => {
      await usdt.connect(logicContract).approve(storage.address, 4000);
      await blid
        .connect(logicContract)
        .approve(storage.address, ethers.utils.parseEther("0.00001"));
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      await expect(
        storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000001"))
      ).to.be.revertedWith("E16");
    });
  });

  describe("two deposit one earn", async () => {
    before(async () => {
      const contracts = await deployContracts(owner, logicContract);

      blid = contracts.blid;
      usdt = contracts.usdt;
      usdtn2 = contracts.usdtn2;
      storage = contracts.storage;
      aggregator = contracts.aggregator;
      aggregator2 = contracts.aggregator2;
      model = contracts.model;
    });

    before(async () => {
      startTime = await time.latest();
      await usdt
        .connect(owner)
        .transfer(Alexander.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Dmitry.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Victor.address, ethers.utils.parseEther("1"));
    });

    it("add tokens", async () => {
      await storage.connect(owner).addToken(usdt.address, aggregator.address);
    });

    it("first deposit", async () => {
      await usdt
        .connect(Dmitry)
        .approve(storage.address, ethers.utils.parseEther("0.000002"));
      await usdt
        .connect(Alexander)
        .approve(storage.address, ethers.utils.parseEther("0.000007"));
      startTime = await time.latest();
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Dmitry)
          .deposit(ethers.utils.parseEther("0.000001"), usdt.address)
      );
      model.deposit(
        Dmitry.address,
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Alexander)
          .deposit(ethers.utils.parseEther("0.000002"), usdt.address)
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("first add earn", async () => {
      await usdt.connect(logicContract).approve(storage.address, 4000);
      await blid
        .connect(logicContract)
        .approve(storage.address, ethers.utils.parseEther("0.00001"));
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000001"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );
    });

    it("second deposit", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Alexander)
          .deposit(ethers.utils.parseEther("0.000002"), usdt.address)
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
      balance = await blid.balanceOf(Alexander.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getBalance(Alexander.address)),
        10 ** 3
      );
    });
  });

  describe("deposit withdraw addEarn interestFee", async () => {
    before(async () => {
      const contracts = await deployContracts(owner, logicContract);

      blid = contracts.blid;
      usdt = contracts.usdt;
      usdtn2 = contracts.usdtn2;
      storage = contracts.storage;
      aggregator = contracts.aggregator;
      aggregator2 = contracts.aggregator2;
      model = contracts.model;
    });
    before(async () => {
      startTime = await time.latest();
      await usdt
        .connect(owner)
        .transfer(Alexander.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Dmitry.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Victor.address, ethers.utils.parseEther("1"));
    });

    it("add tokens", async () => {
      await storage.connect(owner).addToken(usdt.address, aggregator.address);
    });

    it("first deposit", async () => {
      await usdt
        .connect(Dmitry)
        .approve(storage.address, ethers.utils.parseEther("0.000002"));
      await usdt
        .connect(Alexander)
        .approve(storage.address, ethers.utils.parseEther("0.000007"));
      startTime = await time.latest();
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Dmitry)
          .deposit(ethers.utils.parseEther("0.000001"), usdt.address)
      );
      model.deposit(
        Dmitry.address,
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Alexander)
          .deposit(ethers.utils.parseEther("0.000002"), usdt.address)
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );

      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Dmitry)
          .withdraw(ethers.utils.parseEther("0.0000005"), usdt.address)
      );
      model.deposit(
        Dmitry.address,
        -Number.parseInt(ethers.utils.parseEther("0.0000005").toString()),
        transationTime
      );

      balance = await blid.balanceOf(Dmitry.address);
      expect(balance.toString()).to.be.eql("0");
    });

    it("first add earn", async () => {
      await usdt.connect(logicContract).approve(storage.address, 4000);
      await blid
        .connect(logicContract)
        .approve(storage.address, ethers.utils.parseEther("0.00001"));
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000001"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );
      await storage.connect(Alexander).interestFee(Alexander.address);
      model.claim(Alexander.address);
      balance = await blid.balanceOf(Alexander.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getBalance(Alexander.address)),
        10 ** 3
      );
    });
  });

  describe("many deposit", async () => {
    before(async () => {
      const contracts = await deployContracts(owner, logicContract);

      blid = contracts.blid;
      usdt = contracts.usdt;
      usdtn2 = contracts.usdtn2;
      usdc = contracts.usdc;
      storage = contracts.storage;
      aggregator = contracts.aggregator;
      aggregator2 = contracts.aggregator2;
      model = contracts.model;
    });

    before(async () => {
      startTime = await time.latest();

      await usdt
        .connect(owner)
        .transfer(Alexander.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Dmitry.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Victor.address, ethers.utils.parseEther("1"));
    });

    before(async () => {
      startTime = await time.latest();

      await usdc
        .connect(owner)
        .transfer(Alexander.address, ethers.utils.parseEther("1"));
      await usdc
        .connect(owner)
        .transfer(Dmitry.address, ethers.utils.parseEther("1"));
      await usdc
        .connect(owner)
        .transfer(Victor.address, ethers.utils.parseEther("1"));
    });

    it("add tokens", async () => {
      await storage.connect(owner).addToken(usdt.address, aggregator.address);
      await storage.connect(owner).addToken(usdc.address, aggregator2.address);
    });

    it("first deposit", async () => {
      await usdt
        .connect(Dmitry)
        .approve(storage.address, ethers.utils.parseEther("0.00005"));
      await usdt
        .connect(Alexander)
        .approve(storage.address, ethers.utils.parseEther("0.00005"));

      await usdc
        .connect(Dmitry)
        .approve(storage.address, ethers.utils.parseEther("0.00005"));
      await usdc
        .connect(Alexander)
        .approve(storage.address, ethers.utils.parseEther("0.00005"));
      startTime = await time.latest();
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Alexander)
          .deposit(ethers.utils.parseEther("0.000002"), usdt.address)
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("first add earn", async () => {
      await usdt.connect(logicContract).approve(storage.address, 4000);
      await blid
        .connect(logicContract)
        .approve(storage.address, ethers.utils.parseEther("0.00001"));
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000001"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );
    });

    it("deposit", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Dmitry)
          .deposit(ethers.utils.parseEther("0.000002"), usdc.address)
      );
      model.deposit(
        Dmitry.address,
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()) * 2,
        transationTime
      );
    });

    it("deposit", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Alexander)
          .deposit(ethers.utils.parseEther("0.000002"), usdt.address)
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
      balance = await storage.balanceEarnBLID(Alexander.address);
    });

    it("add earn", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000002"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("deposit", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Alexander)
          .deposit(ethers.utils.parseEther("0.000002"), usdt.address)
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("deposit", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Dmitry)
          .deposit(ethers.utils.parseEther("0.000002"), usdc.address)
      );
      model.deposit(
        Dmitry.address,
        Number.parseInt(
          (ethers.utils.parseEther("0.000002").toNumber() * 2).toString()
        ),
        transationTime
      );
    });

    it("add earn", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000002"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("deposit", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Alexander)
          .deposit(ethers.utils.parseEther("0.000002"), usdc.address)
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(
          (ethers.utils.parseEther("0.000002").toNumber() * 2).toString()
        ),
        transationTime
      );
    });

    it("deposit", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Dmitry)
          .deposit(ethers.utils.parseEther("0.000002"), usdt.address)
      );
      model.deposit(
        Dmitry.address,
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
      balance = await storage.balanceEarnBLID(Alexander.address);
    });

    it("add earn", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000002"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("claim", async () => {
      await storage.connect(Dmitry).interestFee(Dmitry.address);
      await storage.connect(Alexander).interestFee(Alexander.address);
      model.claim(Dmitry.address);
      model.claim(Alexander.address);
      balance = await blid.balanceOf(Alexander.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getBalance(Alexander.address)),
        10 ** 3
      );
      balance = await blid.balanceOf(Dmitry.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getBalance(Dmitry.address)),
        10 ** 3
      );
    });
  });

  describe("many deposit - depositOnBehalf", async () => {
    before(async () => {
      const contracts = await deployContracts(owner, logicContract);

      blid = contracts.blid;
      usdt = contracts.usdt;
      usdtn2 = contracts.usdtn2;
      usdc = contracts.usdc;
      storage = contracts.storage;
      aggregator = contracts.aggregator;
      aggregator2 = contracts.aggregator2;
      model = contracts.model;
    });

    before(async () => {
      startTime = await time.latest();

      await usdt
        .connect(owner)
        .transfer(Alexander.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Dmitry.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Victor.address, ethers.utils.parseEther("1"));
    });

    before(async () => {
      startTime = await time.latest();

      await usdc
        .connect(owner)
        .transfer(Alexander.address, ethers.utils.parseEther("1"));
      await usdc
        .connect(owner)
        .transfer(Dmitry.address, ethers.utils.parseEther("1"));
      await usdc
        .connect(owner)
        .transfer(Victor.address, ethers.utils.parseEther("1"));
    });

    it("add tokens", async () => {
      await storage.connect(owner).addToken(usdt.address, aggregator.address);
      await storage.connect(owner).addToken(usdc.address, aggregator2.address);
    });

    it("first deposit", async () => {
      await usdt
        .connect(owner)
        .approve(storage.address, ethers.utils.parseEther("0.0001"));

      await usdc
        .connect(owner)
        .approve(storage.address, ethers.utils.parseEther("0.0001"));
      startTime = await time.latest();
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(owner)
          .depositOnBehalf(
            ethers.utils.parseEther("0.000002"),
            usdt.address,
            Alexander.address
          )
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("first add earn", async () => {
      await usdt.connect(logicContract).approve(storage.address, 4000);
      await blid
        .connect(logicContract)
        .approve(storage.address, ethers.utils.parseEther("0.00001"));
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000001"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000001").toString()),
        transationTime
      );
    });

    it("deposit", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(owner)
          .depositOnBehalf(
            ethers.utils.parseEther("0.000002"),
            usdc.address,
            Dmitry.address
          )
      );
      model.deposit(
        Dmitry.address,
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()) * 2,
        transationTime
      );
    });

    it("deposit", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(owner)
          .depositOnBehalf(
            ethers.utils.parseEther("0.000002"),
            usdt.address,
            Alexander.address
          )
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
      balance = await storage.balanceEarnBLID(Alexander.address);
    });

    it("add earn", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000002"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("deposit", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(owner)
          .depositOnBehalf(
            ethers.utils.parseEther("0.000002"),
            usdt.address,
            Alexander.address
          )
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("deposit", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(owner)
          .depositOnBehalf(
            ethers.utils.parseEther("0.000002"),
            usdc.address,
            Dmitry.address
          )
      );
      model.deposit(
        Dmitry.address,
        Number.parseInt(
          (ethers.utils.parseEther("0.000002").toNumber() * 2).toString()
        ),
        transationTime
      );
    });

    it("add earn", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000002"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("deposit", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(owner)
          .depositOnBehalf(
            ethers.utils.parseEther("0.000002"),
            usdc.address,
            Alexander.address
          )
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(
          (ethers.utils.parseEther("0.000002").toNumber() * 2).toString()
        ),
        transationTime
      );
    });

    it("deposit", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(owner)
          .depositOnBehalf(
            ethers.utils.parseEther("0.000002"),
            usdt.address,
            Dmitry.address
          )
      );
      model.deposit(
        Dmitry.address,
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
      balance = await storage.balanceEarnBLID(Alexander.address);
    });

    it("add earn", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000002"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("claim", async () => {
      await storage.connect(Dmitry).interestFee(Dmitry.address);
      await storage.connect(Alexander).interestFee(Alexander.address);
      model.claim(Dmitry.address);
      model.claim(Alexander.address);
      balance = await blid.balanceOf(Alexander.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getBalance(Alexander.address)),
        10 ** 3
      );
      balance = await blid.balanceOf(Dmitry.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getBalance(Dmitry.address)),
        10 ** 3
      );
    });
  });

  describe("many deposit two", async () => {
    before(async () => {
      const contracts = await deployContracts(owner, logicContract);

      blid = contracts.blid;
      usdt = contracts.usdt;
      usdtn2 = contracts.usdtn2;
      usdc = contracts.usdc;
      storage = contracts.storage;
      aggregator = contracts.aggregator;
      aggregator2 = contracts.aggregator2;
      model = contracts.model;
    });

    before(async () => {
      startTime = await time.latest();

      await usdt
        .connect(owner)
        .transfer(Alexander.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Dmitry.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Victor.address, ethers.utils.parseEther("1"));
    });

    before(async () => {
      startTime = await time.latest();

      await usdc
        .connect(owner)
        .transfer(Alexander.address, ethers.utils.parseEther("1"));
      await usdc
        .connect(owner)
        .transfer(Dmitry.address, ethers.utils.parseEther("1"));
      await usdc
        .connect(owner)
        .transfer(Victor.address, ethers.utils.parseEther("1"));
    });

    it("add tokens", async () => {
      await storage.connect(owner).addToken(usdt.address, aggregator.address);
      await storage.connect(owner).addToken(usdc.address, aggregator2.address);
    });

    it("first deposit", async () => {
      await usdt
        .connect(Dmitry)
        .approve(storage.address, ethers.utils.parseEther("0.00005"));
      await usdt
        .connect(Alexander)
        .approve(storage.address, ethers.utils.parseEther("0.00005"));

      await usdc
        .connect(Dmitry)
        .approve(storage.address, ethers.utils.parseEther("0.00005"));
      await usdc
        .connect(Alexander)
        .approve(storage.address, ethers.utils.parseEther("0.00005"));
      startTime = await time.latest();
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Alexander)
          .deposit(ethers.utils.parseEther("0.000002"), usdt.address)
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("first add earn", async () => {
      await usdt.connect(logicContract).approve(storage.address, 4000);
      await blid
        .connect(logicContract)
        .approve(storage.address, ethers.utils.parseEther("0.00001"));
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000002"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("deposit", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Alexander)
          .deposit(ethers.utils.parseEther("0.000002"), usdc.address)
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(
          (ethers.utils.parseEther("0.000002").toNumber() * 2).toString()
        ),
        transationTime
      );
    });

    it("add earn", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000002"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("claim", async () => {
      balance = await storage.balanceEarnBLID(Alexander.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getEarn(Alexander.address)),
        10 ** 3
      );
      balance = await storage.balanceEarnBLID(Dmitry.address);
      expect(balance.toString()).to.be.eql("0");
      await storage.connect(Dmitry).interestFee(Dmitry.address);
      await storage.connect(Alexander).interestFee(Alexander.address);
    });
  });

  describe("many deposit two - depositOnBehalf", async () => {
    before(async () => {
      const contracts = await deployContracts(owner, logicContract);

      blid = contracts.blid;
      usdt = contracts.usdt;
      usdtn2 = contracts.usdtn2;
      usdc = contracts.usdc;
      storage = contracts.storage;
      aggregator = contracts.aggregator;
      aggregator2 = contracts.aggregator2;
      model = contracts.model;
    });

    before(async () => {
      startTime = await time.latest();

      await usdt
        .connect(owner)
        .transfer(Alexander.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Dmitry.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Victor.address, ethers.utils.parseEther("1"));
    });

    before(async () => {
      startTime = await time.latest();

      await usdc
        .connect(owner)
        .transfer(Alexander.address, ethers.utils.parseEther("1"));
      await usdc
        .connect(owner)
        .transfer(Dmitry.address, ethers.utils.parseEther("1"));
      await usdc
        .connect(owner)
        .transfer(Victor.address, ethers.utils.parseEther("1"));
    });

    it("add tokens", async () => {
      await storage.connect(owner).addToken(usdt.address, aggregator.address);
      await storage.connect(owner).addToken(usdc.address, aggregator2.address);
    });

    it("first deposit", async () => {
      await usdt
        .connect(owner)
        .approve(storage.address, ethers.utils.parseEther("0.0001"));

      await usdc
        .connect(owner)
        .approve(storage.address, ethers.utils.parseEther("0.0001"));
      startTime = await time.latest();
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(owner)
          .depositOnBehalf(
            ethers.utils.parseEther("0.000002"),
            usdt.address,
            Alexander.address
          )
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("first add earn", async () => {
      await usdt.connect(logicContract).approve(storage.address, 4000);
      await blid
        .connect(logicContract)
        .approve(storage.address, ethers.utils.parseEther("0.00001"));
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000002"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("deposit", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(owner)
          .depositOnBehalf(
            ethers.utils.parseEther("0.000002"),
            usdc.address,
            Alexander.address
          )
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(
          (ethers.utils.parseEther("0.000002").toNumber() * 2).toString()
        ),
        transationTime
      );
    });

    it("add earn", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000002"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("claim", async () => {
      balance = await storage.balanceEarnBLID(Alexander.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getEarn(Alexander.address)),
        10 ** 3
      );
      balance = await storage.balanceEarnBLID(Dmitry.address);
      expect(balance.toString()).to.be.eql("0");
      await storage.connect(Dmitry).interestFee(Dmitry.address);
      await storage.connect(Alexander).interestFee(Alexander.address);
    });
  });

  describe("deposit addEarn withdraw", async () => {
    before(async () => {
      const contracts = await deployContracts(owner, logicContract);

      blid = contracts.blid;
      usdt = contracts.usdt;
      usdtn2 = contracts.usdtn2;
      usdc = contracts.usdc;
      storage = contracts.storage;
      aggregator = contracts.aggregator;
      aggregator2 = contracts.aggregator2;
      model = contracts.model;
    });

    before(async () => {
      startTime = await time.latest();
      await usdt
        .connect(owner)
        .transfer(Alexander.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Dmitry.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Victor.address, ethers.utils.parseEther("1"));
    });

    before(async () => {
      startTime = await time.latest();
      await usdc
        .connect(owner)
        .transfer(Alexander.address, ethers.utils.parseEther("1"));
      await usdc
        .connect(owner)
        .transfer(Dmitry.address, ethers.utils.parseEther("1"));
      await usdc
        .connect(owner)
        .transfer(Victor.address, ethers.utils.parseEther("1"));
    });

    it("add tokens", async () => {
      await storage.connect(owner).addToken(usdt.address, aggregator.address);
      await storage.connect(owner).addToken(usdc.address, aggregator2.address);
    });

    it("first deposit", async () => {
      await usdt
        .connect(Dmitry)
        .approve(storage.address, ethers.utils.parseEther("0.00005"));
      await usdt
        .connect(Alexander)
        .approve(storage.address, ethers.utils.parseEther("0.00005"));

      await usdc
        .connect(Dmitry)
        .approve(storage.address, ethers.utils.parseEther("0.00005"));
      await usdc
        .connect(Alexander)
        .approve(storage.address, ethers.utils.parseEther("0.00005"));
      startTime = await time.latest();
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Alexander)
          .deposit(ethers.utils.parseEther("0.000002"), usdt.address)
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("deposit", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Dmitry)
          .deposit(ethers.utils.parseEther("0.000004"), usdt.address)
      );
      model.deposit(
        Dmitry.address,
        Number.parseInt(ethers.utils.parseEther("0.000004").toString()),
        transationTime
      );
    });

    it("first add earn", async () => {
      await usdt.connect(logicContract).approve(storage.address, 4000);
      await blid
        .connect(logicContract)
        .approve(storage.address, ethers.utils.parseEther("0.00001"));
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000002"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("deposit", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Alexander)
          .deposit(ethers.utils.parseEther("0.000004"), usdc.address)
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(
          (ethers.utils.parseEther("0.000004").toNumber() * 2).toString()
        ),
        transationTime
      );
    });

    it("deposit", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Dmitry)
          .deposit(ethers.utils.parseEther("0.000004"), usdc.address)
      );
      model.deposit(
        Dmitry.address,
        Number.parseInt(
          (ethers.utils.parseEther("0.000004").toNumber() * 2).toString()
        ),
        transationTime
      );
    });

    it("add earn", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000002"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("withdraw", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Alexander)
          .withdraw(ethers.utils.parseEther("0.000002"), usdc.address)
      );
      model.deposit(
        Alexander.address,
        -Number.parseInt(
          (ethers.utils.parseEther("0.000002").toNumber() * 2).toString()
        ),
        transationTime
      );
    });

    it("add earn", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000002"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("withdraw", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Alexander)
          .withdraw(ethers.utils.parseEther("0.000002"), usdc.address)
      );
      model.deposit(
        Alexander.address,
        -Number.parseInt(
          (ethers.utils.parseEther("0.000002").toNumber() * 2).toString()
        ),
        transationTime
      );
    });

    it("withdraw", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Alexander)
          .withdraw(ethers.utils.parseEther("0.000002"), usdt.address)
      );
    });

    it("withdraw", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Dmitry)
          .withdraw(ethers.utils.parseEther("0.000004"), usdc.address)
      );
      model.deposit(
        Dmitry.address,
        -Number.parseInt(
          (ethers.utils.parseEther("0.000004").toNumber() * 2).toString()
        ),
        transationTime
      );
    });

    it("withdraw", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Dmitry)
          .withdraw(ethers.utils.parseEther("0.000004"), usdt.address)
      );
      model.deposit(
        Dmitry.address,
        -Number.parseInt(ethers.utils.parseEther("0.000004").toString()),
        transationTime
      );
      balance = await blid.balanceOf(Alexander.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getBalance(Alexander.address)),
        10 ** 3
      );
      balance = await blid.balanceOf(Dmitry.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getBalance(Dmitry.address)),
        10 ** 3
      );
    });
  });

  describe("deposit addEarn withdraw - depositOnBehalf", async () => {
    before(async () => {
      const contracts = await deployContracts(owner, logicContract);

      blid = contracts.blid;
      usdt = contracts.usdt;
      usdtn2 = contracts.usdtn2;
      usdc = contracts.usdc;
      storage = contracts.storage;
      aggregator = contracts.aggregator;
      aggregator2 = contracts.aggregator2;
      model = contracts.model;
    });

    before(async () => {
      startTime = await time.latest();
      await usdt
        .connect(owner)
        .transfer(Alexander.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Dmitry.address, ethers.utils.parseEther("1"));
      await usdt
        .connect(owner)
        .transfer(Victor.address, ethers.utils.parseEther("1"));
    });

    before(async () => {
      startTime = await time.latest();
      await usdc
        .connect(owner)
        .transfer(Alexander.address, ethers.utils.parseEther("1"));
      await usdc
        .connect(owner)
        .transfer(Dmitry.address, ethers.utils.parseEther("1"));
      await usdc
        .connect(owner)
        .transfer(Victor.address, ethers.utils.parseEther("1"));
    });

    it("add tokens", async () => {
      await storage.connect(owner).addToken(usdt.address, aggregator.address);
      await storage.connect(owner).addToken(usdc.address, aggregator2.address);
    });

    it("first deposit", async () => {
      await usdt
        .connect(owner)
        .approve(storage.address, ethers.utils.parseEther("0.0001"));

      await usdc
        .connect(owner)
        .approve(storage.address, ethers.utils.parseEther("0.0001"));
      startTime = await time.latest();
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(owner)
          .depositOnBehalf(
            ethers.utils.parseEther("0.000002"),
            usdt.address,
            Alexander.address
          )
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("deposit", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(owner)
          .depositOnBehalf(
            ethers.utils.parseEther("0.000004"),
            usdt.address,
            Dmitry.address
          )
      );
      model.deposit(
        Dmitry.address,
        Number.parseInt(ethers.utils.parseEther("0.000004").toString()),
        transationTime
      );
    });

    it("first add earn", async () => {
      await usdt.connect(logicContract).approve(storage.address, 4000);
      await blid
        .connect(logicContract)
        .approve(storage.address, ethers.utils.parseEther("0.00001"));
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000002"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("deposit", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(owner)
          .depositOnBehalf(
            ethers.utils.parseEther("0.000004"),
            usdc.address,
            Alexander.address
          )
      );
      model.deposit(
        Alexander.address,
        Number.parseInt(
          (ethers.utils.parseEther("0.000004").toNumber() * 2).toString()
        ),
        transationTime
      );
    });

    it("deposit", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(owner)
          .depositOnBehalf(
            ethers.utils.parseEther("0.000004"),
            usdc.address,
            Dmitry.address
          )
      );
      model.deposit(
        Dmitry.address,
        Number.parseInt(
          (ethers.utils.parseEther("0.000004").toNumber() * 2).toString()
        ),
        transationTime
      );
    });

    it("add earn", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000002"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("withdraw", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Alexander)
          .withdraw(ethers.utils.parseEther("0.000002"), usdc.address)
      );
      model.deposit(
        Alexander.address,
        -Number.parseInt(
          (ethers.utils.parseEther("0.000002").toNumber() * 2).toString()
        ),
        transationTime
      );
    });

    it("add earn", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(logicContract)
          .addEarn(ethers.utils.parseEther("0.000002"))
      );
      model.distribute(
        Number.parseInt(ethers.utils.parseEther("0.000002").toString()),
        transationTime
      );
    });

    it("withdraw", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Alexander)
          .withdraw(ethers.utils.parseEther("0.000002"), usdc.address)
      );
      model.deposit(
        Alexander.address,
        -Number.parseInt(
          (ethers.utils.parseEther("0.000002").toNumber() * 2).toString()
        ),
        transationTime
      );
    });

    it("withdraw", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Alexander)
          .withdraw(ethers.utils.parseEther("0.000002"), usdt.address)
      );
    });

    it("withdraw", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Dmitry)
          .withdraw(ethers.utils.parseEther("0.000004"), usdc.address)
      );
      model.deposit(
        Dmitry.address,
        -Number.parseInt(
          (ethers.utils.parseEther("0.000004").toNumber() * 2).toString()
        ),
        transationTime
      );
    });

    it("withdraw", async () => {
      startTime = startTime.add(time.duration.hours(10));
      await time.increaseTo(startTime);
      transationTime = await getTimestampTransaction(
        await storage
          .connect(Dmitry)
          .withdraw(ethers.utils.parseEther("0.000004"), usdt.address)
      );
      model.deposit(
        Dmitry.address,
        -Number.parseInt(ethers.utils.parseEther("0.000004").toString()),
        transationTime
      );
      balance = await blid.balanceOf(Alexander.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getBalance(Alexander.address)),
        10 ** 3
      );
      balance = await blid.balanceOf(Dmitry.address);
      expect(Number.parseInt(balance.toString())).closeTo(
        Math.floor(model.getBalance(Dmitry.address)),
        10 ** 3
      );
    });
  });
});
