const { contract, accounts, web3 } = require('@openzeppelin/test-environment');
const { time } = require('@openzeppelin/test-helpers');

const [owner, logicContract, Alexander, Dmitry, Victor] = accounts;

const Usdt = contract.fromArtifact("ERC20");
const Storage = contract.fromArtifact("StorageV2");
const Aggregator = contract.fromArtifact("Aggregator");
const AggregatorN2 = contract.fromArtifact("AggregatorN2");

const TokenDistributionModel = require("./utils/TokenDistributionModel")


async function getTimestampTransaction(transaction) {
  return (await web3.eth.getBlock(transaction.receipt.blockHash)).timestamp
}

require('chai')
  .use(require('chai-as-promised'))
  .should()
describe('Storage', () => {
  let blid, usdt, storage, aggregator, startTime, model, transationTime
  before(async () => {
    model = new TokenDistributionModel()
    aggregator = await Aggregator.new()
    blid = await Usdt.new("some erc20 as if BLID", "SERC", { from: logicContract })
    usdt = await Usdt.new("some erc20", "SERC", { from: owner })
    storage = await Storage.new(logicContract, { from: owner })

    storage.initialize(logicContract, { from: owner })

    await storage.setBLID(blid.address, { from: owner })
  })
  before(async () => {

    await usdt.transfer(Alexander, web3.utils.toWei('1', 'ether'), { from: owner })
    await usdt.transfer(Dmitry, web3.utils.toWei('1', 'ether'), { from: owner })
    await usdt.transfer(Victor, web3.utils.toWei('1', 'ether'), { from: owner })
  })

  describe('deployment', async () => {

    it('deploys storage successfully', async () => {
      const address = await blid.address
      assert.notEqual(address, 0x0)
      assert.notEqual(address, '')
      assert.notEqual(address, null)
      assert.notEqual(address, undefined)
    })

    it('deploys storage successfully', async () => {
      const address = await storage.address
      assert.notEqual(address, 0x0)
      assert.notEqual(address, '')
      assert.notEqual(address, null)
      assert.notEqual(address, undefined)
    })

    it('deploys usdt successfully', async () => {
      const address = await usdt.address
      assert.notEqual(address, 0x0)
      assert.notEqual(address, '')
      assert.notEqual(address, null)
      assert.notEqual(address, undefined)
    })
  })
  describe('add tokens', async () => {
    it('add tokens', async () => {
      await storage.addToken(usdt.address, aggregator.address, { from: owner })
    })
  })
  describe('standart scence', async () => {

    it('can not use deposit unknown token address', async () => {
      storage.deposit(1000, accounts[6], { from: Alexander }).should.be.rejectedWith(`Returned error: VM Exception while processing transaction: revert E1 -- Reason given: E1.`)
    })

    it('not can used returnToken when small allowance', async () => {
      await storage.deposit(web3.utils.toWei('5', 'ether'), usdt.address, { from: Alexander }).should.be.rejectedWith(`Returned error: VM Exception while processing transaction: revert ERC20: transfer amount exceeds balance -- Reason given: ERC20: transfer amount exceeds balance.`);
    })

    it('deposit', async () => {
      await usdt.approve(storage.address, web3.utils.toWei('1', 'micro'), { from: Alexander })
      startTime = (await time.latest())
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('1', 'micro'), usdt.address, { from: Alexander }))
      model.deposit(Alexander, Number.parseInt(web3.utils.toWei('1', 'micro')), transationTime)
      startTime = startTime.add(time.duration.hours(300))
      await time.increaseTo(startTime)

      await usdt.approve(storage.address, web3.utils.toWei('1', 'micro'), { from: Dmitry })
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('1', 'micro'), usdt.address, { from: Dmitry }))
      model.deposit(Dmitry, Number.parseInt(web3.utils.toWei('1', 'micro')), transationTime)

      balance = await storage.balanceOf(Alexander)
      assert.equal(balance.toString(), "999970690000");
      balance = await storage.balanceOf(Dmitry)
      assert.equal(balance.toString(), "999970690000");
      balance = await storage.getTokenBalance(usdt.address)
      assert.equal(balance.toString(), "2000000000000");
    })

    it('can not take token more than you have', async () => {
      await storage.takeToken(web3.utils.toWei('10', 'micro'), usdt.address, { from: logicContract }).should.be.rejectedWith("Returned error: VM Exception while processing transaction: revert ERC20: transfer amount exceeds balance -- Reason given: ERC20: transfer amount exceeds balance.");
    })

    it('take token', async () => {
      await storage.takeToken(4000, usdt.address, { from: logicContract })
      balance = await usdt.balanceOf(logicContract);
      assert.equal(balance.toString(), "4000");
      balance = await usdt.balanceOf(storage.address);
      assert.equal(balance.toString(), "1999999996000");
    })

    it('not can used returnToken when small allowance', async () => {
      await usdt.approve(storage.address, 4000, { from: logicContract })
      await storage.returnToken(5000, usdt.address, { from: logicContract }).should.be.rejectedWith("Returned error: VM Exception while processing transaction: revert ERC20: transfer amount exceeds balance -- Reason given: ERC20: transfer amount exceeds balance.");
    })

    it('not can used returnToken unknown token address', async () => {
      await usdt.approve(storage.address, 4000, { from: logicContract })
      await storage.returnToken(4000, accounts[6], { from: logicContract }).should.be.rejectedWith("Returned error: VM Exception while processing transaction: revert E1 -- Reason given: E1.");
    })

    it('add earn', async () => {
      await usdt.approve(storage.address, 4000, { from: logicContract })
      await storage.returnToken(4000, usdt.address, { from: logicContract })
      await blid.approve(storage.address, web3.utils.toWei('2', 'micro'), { from: logicContract })
      startTime = startTime.add(time.duration.hours(100))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.addEarn(web3.utils.toWei('1', 'micro'), { from: logicContract }))
      model.distribute(Number.parseInt(web3.utils.toWei('1', 'micro')), transationTime)
      balance = await storage.balanceEarnBLID(Dmitry)
      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getEarn(Dmitry)), 10 ** 3)
      balance = await storage.balanceEarnBLID(Alexander)
      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getEarn(Alexander)), 10 ** 3)
    })

    it('second add earn', async () => {
      await usdt.approve(storage.address, web3.utils.toWei('1', 'micro'), { from: Victor })
      startTime = startTime.add(time.duration.hours(100))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('1', 'micro'), usdt.address, { from: Victor }))
      model.deposit(Victor, Number.parseInt(web3.utils.toWei('1', 'micro')), transationTime)
      startTime = startTime.add(time.duration.hours(100))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.addEarn(web3.utils.toWei('1', 'micro'), { from: logicContract }))
      model.distribute(Number.parseInt(web3.utils.toWei('1', 'micro')), transationTime)
      balance = await storage.balanceEarnBLID(Dmitry)
      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getEarn(Dmitry)), 10 ** 3)
      balance = await storage.balanceEarnBLID(Victor)
      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getEarn(Victor)), 10 ** 3)
      balance = await storage.balanceEarnBLID(Alexander)
      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getEarn(Alexander)), 10 ** 3)
    })

    it('take earn', async () => {
      await storage.interestFee({ from: Dmitry })
      await storage.interestFee({ from: Victor })
      model.claim(Dmitry)
      model.claim(Victor)
      balance = await blid.balanceOf(Victor);

      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getBalance(Victor)), 10 ** 3);

      balance = await blid.balanceOf(Dmitry);
      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getBalance(Dmitry)), 10 ** 3);

      balance = await storage.balanceEarnBLID(Dmitry)
      assert.equal(balance.toString(), "0");
    })

    it('withdraw when amount more then have user', async () => {
      await storage.withdraw("999999999999999999", usdt.address, { from: Dmitry }).should.be.rejectedWith("Returned error: VM Exception while processing transaction: revert E4 -- Reason given: E4.")
    })

    it('withdraw when amount equal zero', async () => {
      await storage.withdraw("0", usdt.address, { from: Dmitry }).should.be.rejectedWith("Returned error: VM Exception while processing transaction: revert E4 -- Reason given: E4.")
    })

    it('withdraw when amount equal zero', async () => {
      await storage.deposit("0", usdt.address, { from: Dmitry }).should.be.rejectedWith("Returned error: VM Exception while processing transaction: revert E3 -- Reason given: E3.")
    })

    it('withdraw', async () => {
      startTime = startTime.add(time.duration.hours(100))
      await time.increaseTo(startTime)
      balance = await usdt.balanceOf(Dmitry);
      assert.equal(balance.toString(), "999999000000000000");
      balance = await storage.balanceOf(Dmitry)
      assert.equal(balance.toString(), "999970690000");
      balance = await usdt.balanceOf(storage.address);
      assert.equal(balance.toString(), "3000000000000");
      transationTime = await getTimestampTransaction(await storage.withdraw(3000, usdt.address, { from: Dmitry }))
      balance = await usdt.balanceOf(Dmitry);
      assert.equal(balance.toString(), "999999000000003000");
      balance = await storage.balanceOf(Dmitry)
      assert.equal(balance.toString(), "999970687000");
      balance = await usdt.balanceOf(storage.address);
      assert.equal(balance.toString(), "2999999997000");
    })

    it('add earn', async () => {
      await usdt.approve(storage.address, 4000, { from: logicContract })
      await blid.approve(storage.address, web3.utils.toWei('2', 'micro'), { from: logicContract })
      startTime = startTime.add(time.duration.seconds(100))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.addEarn(web3.utils.toWei('1', 'micro'), { from: logicContract }))
      model.distribute(Number.parseInt(web3.utils.toWei('1', 'micro')), transationTime)
      balance = await storage.balanceEarnBLID(Dmitry)
      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getEarn(Dmitry)), 10 ** 3);
      balance = await storage.balanceEarnBLID(Alexander)
      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getEarn(Alexander)), 10 ** 3);
    })
  })


  describe('small seconds scence', async () => {
    before(async () => {
      model = new TokenDistributionModel()
      aggregator = await Aggregator.new()
      blid = await Usdt.new("some erc20 as if BLID", "SERC", { from: logicContract })
      usdt = await Usdt.new("some erc20", "SERC", { from: owner })
      storage = await Storage.new(logicContract, { from: owner })
      storage.initialize(logicContract, { from: owner })
      await storage.setBLID(blid.address, { from: owner })
    })
    before(async () => {
      startTime = (await time.latest())

      await usdt.transfer(Alexander, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdt.transfer(Dmitry, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdt.transfer(Victor, web3.utils.toWei('1', 'ether'), { from: owner })
    })

    it('add tokens', async () => {
      await storage.addToken(usdt.address, aggregator.address, { from: owner })
    })

    it('deposit', async () => {
      await usdt.approve(storage.address, web3.utils.toWei('1', 'micro'), { from: Alexander })
      startTime = (await time.latest())
      startTime = startTime.add(time.duration.seconds(20))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('1', 'micro'), usdt.address, { from: Alexander }))
      model.deposit(Alexander, Number.parseInt(web3.utils.toWei('1', 'micro')), transationTime)
      startTime = startTime.add(time.duration.seconds(30))

      await usdt.approve(storage.address, web3.utils.toWei('1', 'micro'), { from: Dmitry })
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('1', 'micro'), usdt.address, { from: Dmitry }))
      model.deposit(Dmitry, Number.parseInt(web3.utils.toWei('1', 'micro')), transationTime)

      balance = await storage.balanceOf(Alexander)
      assert.equal(balance.toString(), "999970690000");
      balance = await storage.balanceOf(Dmitry)
      assert.equal(balance.toString(), "999970690000");
      balance = await storage.getTokenBalance(usdt.address, { from: Dmitry })
      assert.equal(balance.toString(), "2000000000000");
    })

    it('add earn', async () => {

      await usdt.approve(storage.address, 4000, { from: logicContract })
      await blid.approve(storage.address, web3.utils.toWei('2', 'micro'), { from: logicContract })
      startTime = startTime.add(time.duration.seconds(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.addEarn(web3.utils.toWei('1', 'micro'), { from: logicContract }))
      model.distribute(Number.parseInt(web3.utils.toWei('1', 'micro')), transationTime)
      balance = await storage.balanceEarnBLID(Dmitry)
      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getEarn(Dmitry)), 10000)
      balance = await storage.balanceEarnBLID(Alexander)
      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getEarn(Alexander)), 10000)
    })
  })

  describe('small seconds scence', async () => {
    before(async () => {
      model = new TokenDistributionModel()
      aggregator = await Aggregator.new()
      blid = await Usdt.new("some erc20 as if BLID", "SERC", { from: logicContract })
      usdt = await Usdt.new("some erc20", "SERC", { from: owner })
      storage = await Storage.new(logicContract, { from: owner })
      storage.initialize(logicContract, { from: owner })
      await storage.setBLID(blid.address, { from: owner })
    })
    before(async () => {
      startTime = (await time.latest())

      await usdt.transfer(Alexander, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdt.transfer(Dmitry, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdt.transfer(Victor, web3.utils.toWei('1', 'ether'), { from: owner })
    })
    it('add tokens', async () => {
      await storage.addToken(usdt.address, aggregator.address, { from: owner })
    })
    it('deposit', async () => {

      await usdt.approve(storage.address, web3.utils.toWei('1', 'micro'), { from: Alexander })
      startTime = (await time.latest())
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('1', 'micro'), usdt.address, { from: Alexander }))
      model.deposit(Alexander, Number.parseInt(web3.utils.toWei('1', 'micro')), transationTime)
      startTime = startTime.add(time.duration.hours(30))

      await usdt.approve(storage.address, web3.utils.toWei('2', 'micro'), { from: Dmitry })
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('2', 'micro'), usdt.address, { from: Dmitry }))
      model.deposit(Dmitry, Number.parseInt(web3.utils.toWei('2', 'micro')), transationTime)


      balance = await storage.balanceOf(Alexander)
      assert.equal(balance.toString(), "999970690000");
      balance = await storage.balanceOf(Dmitry)
      assert.equal(balance.toString(), "1999941380000");
      balance = await storage.getTokenBalance(usdt.address, { from: Dmitry })
      assert.equal(balance.toString(), "3000000000000");
    })

    it('add earn', async () => {

      await usdt.approve(storage.address, 4000, { from: logicContract })
      await blid.approve(storage.address, web3.utils.toWei('2', 'micro'), { from: logicContract })
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.addEarn(web3.utils.toWei('1', 'micro'), { from: logicContract }))
      model.distribute(Number.parseInt(web3.utils.toWei('1', 'micro')), transationTime)
      balance = await storage.balanceEarnBLID(Dmitry)
      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getEarn(Dmitry)), 10 ** 3)

      balance = await storage.balanceEarnBLID(Alexander)
      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getEarn(Alexander)), 10 ** 3)
    })
  })


  describe('new token', async () => {
    before(async () => {
      model = new TokenDistributionModel()
      aggregator = await Aggregator.new()
      aggregatorN2 = await AggregatorN2.new()
      blid = await Usdt.new("some erc20 as if BLID", "SERC", { from: logicContract })

    })

    before(async () => {

      usdt = await Usdt.new("some erc20", "SERC", { from: owner })
      usdtn2 = await Usdt.new("some erc20", "SERC", { from: owner })
      storage = await Storage.new(logicContract, { from: owner })
      storage.initialize(logicContract, { from: owner })
      await storage.setBLID(blid.address, { from: owner })
    })
    before(async () => {
      startTime = (await time.latest())
      await usdt.transfer(Alexander, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdt.transfer(Dmitry, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdt.transfer(Victor, web3.utils.toWei('1', 'ether'), { from: owner })

    })

    before(async () => {
      await usdtn2.transfer(Alexander, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdtn2.transfer(Dmitry, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdtn2.transfer(Victor, web3.utils.toWei('1', 'ether'), { from: owner })
    })
    it('add tokens', async () => {
      await storage.addToken(usdt.address, aggregator.address, { from: owner })
      await storage.addToken(usdtn2.address, aggregatorN2.address, { from: owner })
    })
    it('deposit', async () => {

      await usdt.approve(storage.address, web3.utils.toWei('1', 'micro'), { from: Alexander })
      startTime = (await time.latest())
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('1', 'micro'), usdt.address, { from: Alexander }))
      model.deposit(Alexander, Number.parseInt(web3.utils.toWei('1', 'micro')), transationTime)
      startTime = startTime.add(time.duration.hours(30))
    })

    it('deposit', async () => {
      await usdtn2.approve(storage.address, web3.utils.toWei('2', 'micro'), { from: Dmitry })
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('1', 'micro'), usdtn2.address, { from: Dmitry }))
      model.deposit(Dmitry, Number.parseInt(web3.utils.toWei('1', 'micro')) * 2, transationTime)

      balance = await storage.balanceOf(Alexander)
      assert.equal(balance.toString(), "999970690000");
      balance = await storage.balanceOf(Dmitry)
      assert.equal(balance.toString(), "1999941380000");
      balance = await storage.getTokenBalance(usdt.address, { from: Dmitry })
      assert.equal(balance.toString(), "1000000000000");
    })

    it('add earn', async () => {
      await usdt.approve(storage.address, 4000, { from: logicContract })
      await blid.approve(storage.address, web3.utils.toWei('2', 'micro'), { from: logicContract })
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.addEarn(web3.utils.toWei('1', 'micro'), { from: logicContract }))
      model.distribute(Number.parseInt(web3.utils.toWei('1', 'micro')), transationTime)
      balance = await storage.balanceEarnBLID(Dmitry)
      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getEarn(Dmitry)), 10 ** 3)

      balance = await storage.balanceEarnBLID(Alexander)
      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getEarn(Alexander)), 10 ** 3)
    })
  })


  describe('double deposit', async () => {
    before(async () => {
      model = new TokenDistributionModel()
      aggregator = await Aggregator.new()
      blid = await Usdt.new("some erc20 as if BLID", "SERC", { from: logicContract })
      usdt = await Usdt.new("some erc20", "SERC", { from: owner })
      storage = await Storage.new(logicContract, { from: owner })
      storage.initialize(logicContract, { from: owner })
      await storage.setBLID(blid.address, { from: owner })
    })
    before(async () => {
      startTime = (await time.latest())

      await usdt.transfer(Alexander, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdt.transfer(Dmitry, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdt.transfer(Victor, web3.utils.toWei('1', 'ether'), { from: owner })
    })

    it('add tokens', async () => {
      await storage.addToken(usdt.address, aggregator.address, { from: owner })
    })

    it('first deposit', async () => {
      await usdt.approve(storage.address, web3.utils.toWei('2', 'micro'), { from: Dmitry })
      await usdt.approve(storage.address, web3.utils.toWei('7', 'micro'), { from: Alexander })
      startTime = (await time.latest())
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('1', 'micro'), usdt.address, { from: Dmitry }))
      model.deposit(Dmitry, Number.parseInt(web3.utils.toWei('1', 'micro')), transationTime)
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('2', 'micro'), usdt.address, { from: Alexander }))
      model.deposit(Alexander, Number.parseInt(web3.utils.toWei('2', 'micro')), transationTime)
    })

    it('first add earn', async () => {
      await usdt.approve(storage.address, 4000, { from: logicContract })
      await blid.approve(storage.address, web3.utils.toWei('10', 'micro'), { from: logicContract })
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.addEarn(web3.utils.toWei('1', 'micro'), { from: logicContract }))
      model.distribute(Number.parseInt(web3.utils.toWei('1', 'micro')), transationTime)
    })

    it('second deposit', async () => {
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('2', 'micro'), usdt.address, { from: Alexander }))
      model.deposit(Alexander, Number.parseInt(web3.utils.toWei('2', 'micro')), transationTime)
      balance = await storage.balanceEarnBLID(Alexander)
    })

    it('second add earn', async () => {
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.addEarn(web3.utils.toWei('2', 'micro'), { from: logicContract }))
      model.distribute(Number.parseInt(web3.utils.toWei('2', 'micro')), transationTime)
      balance = await storage.balanceEarnBLID(Dmitry)
      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getEarn(Dmitry)), 10 ** 3)
      balance = await storage.balanceEarnBLID(Alexander)
      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getEarn(Alexander)), 10 ** 3)
    })
  })

  describe('deposit all withdraw addEarn interestFee', async () => {
    before(async () => {
      model = new TokenDistributionModel()
      aggregator = await Aggregator.new()
      blid = await Usdt.new("some erc20 as if BLID", "SERC", { from: logicContract })
      usdt = await Usdt.new("some erc20", "SERC", { from: owner })
      storage = await Storage.new(logicContract, { from: owner })
      storage.initialize(logicContract, { from: owner })
      await storage.setBLID(blid.address, { from: owner })
    })
    before(async () => {
      startTime = (await time.latest())

      await usdt.transfer(Alexander, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdt.transfer(Dmitry, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdt.transfer(Victor, web3.utils.toWei('1', 'ether'), { from: owner })
    })
    it('add tokens', async () => {
      await storage.addToken(usdt.address, aggregator.address, { from: owner })
    })
    it('first deposit', async () => {
      await usdt.approve(storage.address, web3.utils.toWei('2', 'micro'), { from: Dmitry })
      await usdt.approve(storage.address, web3.utils.toWei('7', 'micro'), { from: Alexander })
      startTime = (await time.latest())
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('1', 'micro'), usdt.address, { from: Dmitry }))
      model.deposit(Dmitry, Number.parseInt(web3.utils.toWei('1', 'micro')), transationTime)
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('2', 'micro'), usdt.address, { from: Alexander }))
      model.deposit(Alexander, Number.parseInt(web3.utils.toWei('2', 'micro')), transationTime)

      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.withdraw(web3.utils.toWei('1', 'micro'), usdt.address, { from: Dmitry }))
      model.deposit(Dmitry, -Number.parseInt(web3.utils.toWei('1', 'micro')), transationTime)

      balance = await blid.balanceOf(Dmitry)
      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getBalance(Dmitry)), 10 ** 3)
      assert.equal(balance.toString(), "0");
    })

    it('first add earn', async () => {
      await usdt.approve(storage.address, 4000, { from: logicContract })
      await blid.approve(storage.address, web3.utils.toWei('10', 'micro'), { from: logicContract })
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.addEarn(web3.utils.toWei('1', 'micro'), { from: logicContract }))
      model.distribute(Number.parseInt(web3.utils.toWei('1', 'micro')), transationTime)
      await storage.interestFee({ from: Alexander })
      model.claim(Alexander)
      balance = await blid.balanceOf(Alexander)
      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getBalance(Alexander)), 10 ** 3)
      assert.closeTo(Number.parseInt(balance.toString()), 666666666666, 7000000);
    })
  })

  describe('zero deposit one add earn', async () => {
    before(async () => {
      model = new TokenDistributionModel()
      aggregator = await Aggregator.new()
      blid = await Usdt.new("some erc20 as if BLID", "SERC", { from: logicContract })
      usdt = await Usdt.new("some erc20", "SERC", { from: owner })
      storage = await Storage.new(logicContract, { from: owner })
      storage.initialize(logicContract, { from: owner })
      await storage.setBLID(blid.address, { from: owner })
    })
    before(async () => {
      startTime = (await time.latest())

      await usdt.transfer(Alexander, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdt.transfer(Dmitry, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdt.transfer(Victor, web3.utils.toWei('1', 'ether'), { from: owner })
    })
    it('add tokens', async () => {
      await storage.addToken(usdt.address, aggregator.address, { from: owner })
    })
    it('first add earn', async () => {

      await usdt.approve(storage.address, 4000, { from: logicContract })
      await blid.approve(storage.address, web3.utils.toWei('10', 'micro'), { from: logicContract })
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      await storage.addEarn(web3.utils.toWei('1', 'micro'), { from: logicContract }).should.be.rejectedWith("Returned error: VM Exception while processing transaction: revert")
    })
  })

  describe('two deposit one earn ', async () => {
    before(async () => {
      model = new TokenDistributionModel()
      aggregator = await Aggregator.new()
      blid = await Usdt.new("some erc20 as if BLID", "SERC", { from: logicContract })
      usdt = await Usdt.new("some erc20", "SERC", { from: owner })
      storage = await Storage.new(logicContract, { from: owner })
      storage.initialize(logicContract, { from: owner })
      await storage.setBLID(blid.address, { from: owner })
    })

    before(async () => {
      startTime = (await time.latest())
      await usdt.transfer(Alexander, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdt.transfer(Dmitry, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdt.transfer(Victor, web3.utils.toWei('1', 'ether'), { from: owner })
    })

    it('add tokens', async () => {
      await storage.addToken(usdt.address, aggregator.address, { from: owner })
    })

    it('first deposit', async () => {
      await usdt.approve(storage.address, web3.utils.toWei('2', 'micro'), { from: Dmitry })
      await usdt.approve(storage.address, web3.utils.toWei('7', 'micro'), { from: Alexander })
      startTime = (await time.latest())
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('1', 'micro'), usdt.address, { from: Dmitry }))
      model.deposit(Dmitry, Number.parseInt(web3.utils.toWei('1', 'micro')), transationTime)
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('2', 'micro'), usdt.address, { from: Alexander }))
      model.deposit(Alexander, Number.parseInt(web3.utils.toWei('2', 'micro')), transationTime)
    })

    it('first add earn', async () => {
      await usdt.approve(storage.address, 4000, { from: logicContract })
      await blid.approve(storage.address, web3.utils.toWei('10', 'micro'), { from: logicContract })
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.addEarn(web3.utils.toWei('1', 'micro'), { from: logicContract }))
      model.distribute(Number.parseInt(web3.utils.toWei('1', 'micro')), transationTime)
    })

    it('second deposit', async () => {
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('2', 'micro'), usdt.address, { from: Alexander }))
      model.deposit(Alexander, Number.parseInt(web3.utils.toWei('2', 'micro')), transationTime)
      balance = await blid.balanceOf(Alexander)
      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getBalance(Alexander)), 10 ** 3)
    })
  })

  describe('deposit withdraw addEarn interestFee', async () => {
    before(async () => {
      model = new TokenDistributionModel()
      aggregator = await Aggregator.new()
      blid = await Usdt.new("some erc20 as if BLID", "SERC", { from: logicContract })
      usdt = await Usdt.new("some erc20", "SERC", { from: owner })
      storage = await Storage.new(logicContract, { from: owner })
      storage.initialize(logicContract, { from: owner })
      await storage.setBLID(blid.address, { from: owner })
    })
    before(async () => {
      startTime = (await time.latest())
      await usdt.transfer(Alexander, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdt.transfer(Dmitry, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdt.transfer(Victor, web3.utils.toWei('1', 'ether'), { from: owner })
    })

    it('add tokens', async () => {
      await storage.addToken(usdt.address, aggregator.address, { from: owner })
    })

    it('first deposit', async () => {
      await usdt.approve(storage.address, web3.utils.toWei('2', 'micro'), { from: Dmitry })
      await usdt.approve(storage.address, web3.utils.toWei('7', 'micro'), { from: Alexander })
      startTime = (await time.latest())
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('1', 'micro'), usdt.address, { from: Dmitry }))
      model.deposit(Dmitry, Number.parseInt(web3.utils.toWei('1', 'micro')), transationTime)
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('2', 'micro'), usdt.address, { from: Alexander }))
      model.deposit(Alexander, Number.parseInt(web3.utils.toWei('2', 'micro')), transationTime)

      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.withdraw(web3.utils.toWei('0.5', 'micro'), usdt.address, { from: Dmitry }))
      model.deposit(Dmitry, -Number.parseInt(web3.utils.toWei('0.5', 'micro')), transationTime)

      balance = await blid.balanceOf(Dmitry)
      assert.equal(balance.toString(), "0");
    })

    it('first add earn', async () => {
      await usdt.approve(storage.address, 4000, { from: logicContract })
      await blid.approve(storage.address, web3.utils.toWei('10', 'micro'), { from: logicContract })
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.addEarn(web3.utils.toWei('1', 'micro'), { from: logicContract }))
      model.distribute(Number.parseInt(web3.utils.toWei('1', 'micro')), transationTime)
      await storage.interestFee({ from: Alexander })
      model.claim(Alexander)
      balance = await blid.balanceOf(Alexander)
      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getBalance(Alexander)), 10 ** 3)
    })
  })

  describe('many deposit', async () => {
    before(async () => {
      model = new TokenDistributionModel()
      aggregator = await Aggregator.new()
      aggregatorn2 = await AggregatorN2.new()
      blid = await Usdt.new("some erc20 as if BLID", "SERC", { from: logicContract })
      usdt = await Usdt.new("some erc20", "SERC", { from: owner })
      usdc = await Usdt.new("some erc20", "SERC", { from: owner })
      storage = await Storage.new(logicContract, { from: owner })
      storage.initialize(logicContract, { from: owner })
      await storage.setBLID(blid.address, { from: owner })
    })

    before(async () => {
      startTime = (await time.latest())

      await usdt.transfer(Alexander, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdt.transfer(Dmitry, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdt.transfer(Victor, web3.utils.toWei('1', 'ether'), { from: owner })
    })

    before(async () => {
      startTime = (await time.latest())

      await usdc.transfer(Alexander, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdc.transfer(Dmitry, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdc.transfer(Victor, web3.utils.toWei('1', 'ether'), { from: owner })
    })

    it('add tokens', async () => {
      await storage.addToken(usdt.address, aggregator.address, { from: owner })
      await storage.addToken(usdc.address, aggregatorn2.address, { from: owner })
    })

    it('first deposit', async () => {
      await usdt.approve(storage.address, web3.utils.toWei('50', 'micro'), { from: Dmitry })
      await usdt.approve(storage.address, web3.utils.toWei('50', 'micro'), { from: Alexander })

      await usdc.approve(storage.address, web3.utils.toWei('50', 'micro'), { from: Dmitry })
      await usdc.approve(storage.address, web3.utils.toWei('50', 'micro'), { from: Alexander })
      startTime = (await time.latest())
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('2', 'micro'), usdt.address, { from: Alexander }))
      model.deposit(Alexander, Number.parseInt(web3.utils.toWei('2', 'micro')), transationTime)
    })

    it('first add earn', async () => {
      await usdt.approve(storage.address, 4000, { from: logicContract })
      await blid.approve(storage.address, web3.utils.toWei('10', 'micro'), { from: logicContract })
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.addEarn(web3.utils.toWei('1', 'micro'), { from: logicContract }))
      model.distribute(Number.parseInt(web3.utils.toWei('1', 'micro')), transationTime)
    })

    it('deposit', async () => {
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('2', 'micro'), usdc.address, { from: Dmitry }))
      model.deposit(Dmitry, Number.parseInt(web3.utils.toWei('2', 'micro')) * 2, transationTime)
    })

    it('deposit', async () => {
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('2', 'micro'), usdt.address, { from: Alexander }))
      model.deposit(Alexander, Number.parseInt(web3.utils.toWei('2', 'micro')), transationTime)
      balance = await storage.balanceEarnBLID(Alexander)
    })

    it('add earn', async () => {
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.addEarn(web3.utils.toWei('2', 'micro'), { from: logicContract }))
      model.distribute(Number.parseInt(web3.utils.toWei('2', 'micro')), transationTime)
    })

    it('deposit', async () => {
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('2', 'micro'), usdt.address, { from: Alexander }))
      model.deposit(Alexander, Number.parseInt(web3.utils.toWei('2', 'micro')), transationTime)
    })

    it('deposit', async () => {
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('2', 'micro'), usdc.address, { from: Dmitry }))
      model.deposit(Dmitry, Number.parseInt(web3.utils.toWei('2', 'micro') * 2), transationTime)
    })

    it('add earn', async () => {
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.addEarn(web3.utils.toWei('2', 'micro'), { from: logicContract }))
      model.distribute(Number.parseInt(web3.utils.toWei('2', 'micro')), transationTime)
    })

    it('deposit', async () => {
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('2', 'micro'), usdc.address, { from: Alexander }))
      model.deposit(Alexander, Number.parseInt(web3.utils.toWei('2', 'micro') * 2), transationTime)
    })

    it('deposit', async () => {
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('2', 'micro'), usdt.address, { from: Dmitry }))
      model.deposit(Dmitry, Number.parseInt(web3.utils.toWei('2', 'micro')), transationTime)
      balance = await storage.balanceEarnBLID(Alexander)
    })

    it('add earn', async () => {
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.addEarn(web3.utils.toWei('2', 'micro'), { from: logicContract }))
      model.distribute(Number.parseInt(web3.utils.toWei('2', 'micro')), transationTime)
    })

    it('claim', async () => {
      await storage.interestFee({ from: Dmitry })
      await storage.interestFee({ from: Alexander })
      model.claim(Dmitry)
      model.claim(Alexander)
      balance = await blid.balanceOf(Alexander)
      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getBalance(Alexander)), 10 ** 3)
      balance = await blid.balanceOf(Dmitry)
      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getBalance(Dmitry)), 10 ** 3)
    })
  })

  describe('many deposit', async () => {
    before(async () => {
      model = new TokenDistributionModel()
      aggregator = await Aggregator.new()
      aggregatorn2 = await AggregatorN2.new()
      blid = await Usdt.new("some erc20 as if BLID", "SERC", { from: logicContract })
      usdt = await Usdt.new("some erc20", "SERC", { from: owner })
      usdc = await Usdt.new("some erc20", "SERC", { from: owner })
      storage = await Storage.new(logicContract, { from: owner })
      storage.initialize(logicContract, { from: owner })
      await storage.setBLID(blid.address, { from: owner })
    })

    before(async () => {
      startTime = (await time.latest())

      await usdt.transfer(Alexander, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdt.transfer(Dmitry, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdt.transfer(Victor, web3.utils.toWei('1', 'ether'), { from: owner })
    })

    before(async () => {
      startTime = (await time.latest())

      await usdc.transfer(Alexander, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdc.transfer(Dmitry, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdc.transfer(Victor, web3.utils.toWei('1', 'ether'), { from: owner })
    })

    it('add tokens', async () => {
      await storage.addToken(usdt.address, aggregator.address, { from: owner })
      await storage.addToken(usdc.address, aggregatorn2.address, { from: owner })
    })

    it('first deposit', async () => {
      await usdt.approve(storage.address, web3.utils.toWei('50', 'micro'), { from: Dmitry })
      await usdt.approve(storage.address, web3.utils.toWei('50', 'micro'), { from: Alexander })

      await usdc.approve(storage.address, web3.utils.toWei('50', 'micro'), { from: Dmitry })
      await usdc.approve(storage.address, web3.utils.toWei('50', 'micro'), { from: Alexander })
      startTime = (await time.latest())
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('2', 'micro'), usdt.address, { from: Alexander }))
      model.deposit(Alexander, Number.parseInt(web3.utils.toWei('2', 'micro')), transationTime)
    })

    it('first add earn', async () => {
      await usdt.approve(storage.address, 4000, { from: logicContract })
      await blid.approve(storage.address, web3.utils.toWei('10', 'micro'), { from: logicContract })
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.addEarn(web3.utils.toWei('2', 'micro'), { from: logicContract }))
      model.distribute(Number.parseInt(web3.utils.toWei('2', 'micro')), transationTime)
    })

    it('deposit', async () => {
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('2', 'micro'), usdc.address, { from: Alexander }))
      model.deposit(Alexander, Number.parseInt(web3.utils.toWei('2', 'micro') * 2), transationTime)
    })

    it('add earn', async () => {
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.addEarn(web3.utils.toWei('2', 'micro'), { from: logicContract }))
      model.distribute(Number.parseInt(web3.utils.toWei('2', 'micro')), transationTime)

    })

    it('claim', async () => {
      balance = await storage.balanceEarnBLID(Alexander)
      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getEarn(Alexander)), 10 ** 3)
      balance = await storage.balanceEarnBLID(Dmitry)
      assert.equal(balance.toString(), "0");
      await storage.interestFee({ from: Dmitry })
      await storage.interestFee({ from: Alexander })
    })
  })

  describe('deposit addEarn withdraw', async () => {
    before(async () => {
      model = new TokenDistributionModel()
      aggregator = await Aggregator.new()
      aggregatorn2 = await AggregatorN2.new()
      blid = await Usdt.new("some erc20 as if BLID", "SERC", { from: logicContract })
      usdt = await Usdt.new("some erc20", "SERC", { from: owner })
      usdc = await Usdt.new("some erc20", "SERC", { from: owner })
      storage = await Storage.new(logicContract, { from: owner })
      storage.initialize(logicContract, { from: owner })

      await storage.setBLID(blid.address, { from: owner })
    })

    before(async () => {
      startTime = (await time.latest())
      await usdt.transfer(Alexander, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdt.transfer(Dmitry, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdt.transfer(Victor, web3.utils.toWei('1', 'ether'), { from: owner })
    })

    before(async () => {
      startTime = (await time.latest())
      await usdc.transfer(Alexander, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdc.transfer(Dmitry, web3.utils.toWei('1', 'ether'), { from: owner })
      await usdc.transfer(Victor, web3.utils.toWei('1', 'ether'), { from: owner })
    })

    it('add tokens', async () => {
      await storage.addToken(usdt.address, aggregator.address, { from: owner })
      await storage.addToken(usdc.address, aggregatorn2.address, { from: owner })
    })

    it('first deposit', async () => {
      await usdt.approve(storage.address, web3.utils.toWei('50', 'micro'), { from: Dmitry })
      await usdt.approve(storage.address, web3.utils.toWei('50', 'micro'), { from: Alexander })

      await usdc.approve(storage.address, web3.utils.toWei('50', 'micro'), { from: Dmitry })
      await usdc.approve(storage.address, web3.utils.toWei('50', 'micro'), { from: Alexander })
      startTime = (await time.latest())
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('2', 'micro'), usdt.address, { from: Alexander }))
      model.deposit(Alexander, Number.parseInt(web3.utils.toWei('2', 'micro')), transationTime)
    })

    it('deposit', async () => {
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('4', 'micro'), usdt.address, { from: Dmitry }))
      model.deposit(Dmitry, Number.parseInt(web3.utils.toWei('4', 'micro')), transationTime)
    })

    it('first add earn', async () => {
      await usdt.approve(storage.address, 4000, { from: logicContract })
      await blid.approve(storage.address, web3.utils.toWei('10', 'micro'), { from: logicContract })
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.addEarn(web3.utils.toWei('2', 'micro'), { from: logicContract }))
      model.distribute(Number.parseInt(web3.utils.toWei('2', 'micro')), transationTime)
    })

    it('deposit', async () => {
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('4', 'micro'), usdc.address, { from: Alexander }))
      model.deposit(Alexander, Number.parseInt(web3.utils.toWei('4', 'micro') * 2), transationTime)
    })

    it('deposit', async () => {
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.deposit(web3.utils.toWei('4', 'micro'), usdc.address, { from: Dmitry }))
      model.deposit(Dmitry, Number.parseInt(web3.utils.toWei('4', 'micro') * 2), transationTime)
    })

    it('add earn', async () => {
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.addEarn(web3.utils.toWei('2', 'micro'), { from: logicContract }))
      model.distribute(Number.parseInt(web3.utils.toWei('2', 'micro')), transationTime)
    })

    it(' withdraw', async () => {
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.withdraw(web3.utils.toWei('2', 'micro'), usdc.address, { from: Alexander }))
      model.deposit(Alexander, -Number.parseInt(web3.utils.toWei('2', 'micro') * 2), transationTime)
    })

    it('add earn', async () => {
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.addEarn(web3.utils.toWei('2', 'micro'), { from: logicContract }))
      model.distribute(Number.parseInt(web3.utils.toWei('2', 'micro')), transationTime)
    })

    it(' withdraw', async () => {
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.withdraw(web3.utils.toWei('2', 'micro'), usdc.address, { from: Alexander }))
      model.deposit(Alexander, -Number.parseInt(web3.utils.toWei('2', 'micro') * 2), transationTime)
    })

    it(' withdraw', async () => {
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.withdraw(web3.utils.toWei('2', 'micro'), usdt.address, { from: Alexander }))
    })

    it(' withdraw', async () => {
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.withdraw(web3.utils.toWei('4', 'micro'), usdc.address, { from: Dmitry }))
      model.deposit(Dmitry, -Number.parseInt(web3.utils.toWei('4', 'micro') * 2), transationTime)
    })

    it(' withdraw', async () => {
      startTime = startTime.add(time.duration.hours(10))
      await time.increaseTo(startTime)
      transationTime = await getTimestampTransaction(await storage.withdraw(web3.utils.toWei('4', 'micro'), usdt.address, { from: Dmitry }))
      model.deposit(Dmitry, -Number.parseInt(web3.utils.toWei('4', 'micro')), transationTime)
      balance = await blid.balanceOf(Alexander)
      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getBalance(Alexander)), 10 ** 3)
      balance = await blid.balanceOf(Dmitry)
      assert.closeTo(Number.parseInt(balance.toString()), Math.floor(model.getBalance(Dmitry)), 10 ** 3)
    })
  })
});
