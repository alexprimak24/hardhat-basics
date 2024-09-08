import { loadFixture, ethers, expect } from "./setup";

//`Payments` - just describe what you are going to test
describe("Payments", function () {
  //script for deploy
  async function deploy() {
    const [user1, user2] = await ethers.getSigners();
    //"Payments" - should be the exact contract name that we want to deploy
    const Factory = await ethers.getContractFactory("Payments");
    const payments = await Factory.deploy();
    await payments.waitForDeployment();

    return { user1, user2, payments };
  }

  it("should be deployed", async function () {
    //loadFixture takes the func that is responsible for deploy
    //the best thing with loadFixture as it optmized, once you deploy the first time
    //it memorizes the state of the chain and in the next tests it will just come back to
    //that state, so even if you write `deploy` - it will actually represent the state that has
    //been created during the first and the only deploy
    const { user1, user2, payments } = await loadFixture(deploy);

    expect(payments.target).to.be.properAddress;
  });

  it("should have 0 ethers by default", async function () {
    const { payments } = await loadFixture(deploy);

    // const balance = await payments.currentBalance(); - first variant (if we have a func in contract to read balance)
    const balance = await ethers.provider.getBalance(payments.target); //second variant, can check balance of any address
    expect(balance).to.eq(0);
  });

  it("should be possible to send funds", async function () {
    const { user1, user2, payments } = await loadFixture(deploy);

    const sum = 100; //wei
    const msg = "hello from hardhat";
    console.log(await ethers.provider.getBalance(user1.address));
    //tx is signed by the first user
    // await payments.pay(msg, { value: sum });
    //that way tx will be signed by the second user
    //there we connected to the contract with `user2` and called pay()
    const tx = await payments.connect(user2).pay(msg, { value: sum });
    //waited for confirmation
    await tx.wait(1);

    //this is the way how we can then access timestamp => currentBlock?.timestamp
    //ethers.provider.getBlock - get block info by block number
    //ethers.provider.getBlockNumber() - get current block number
    const currentBlock = await ethers.provider.getBlock(
      await ethers.provider.getBlockNumber()
    );

    //there we check that if after that tx , the balance of the user changed -sum that we sent
    await expect(tx).to.changeEtherBalance(user2, -sum);
    // console.log(await ethers.provider.getBalance(user1.address));

    const newPayment = await payments.getPayment(user2.address, 0);

    expect(newPayment.message).to.eq(msg);
    expect(newPayment.amount).to.eq(sum);
    expect(newPayment.from).to.eq(user2.address);
    expect(newPayment.timestamp).to.eq(currentBlock?.timestamp);
  });
});
