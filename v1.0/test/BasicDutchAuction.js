const { ethers} = require("hardhat");
const { expect } = require("chai");

describe("BasicDutchAuction", function () {
  let basicDutchAuction;
  let seller;
  let bidder1;
  let bidder2;

  const reservePrice = 1000;
  const numBlocksAuctionOpen = 10;
  const offerPriceDecrement = 100;

  beforeEach(async function () {
    [seller, bidder1, bidder2] = await ethers.getSigners();
    const BasicDutchAuction = await ethers.getContractFactory("BasicDutchAuction");
    basicDutchAuction = await BasicDutchAuction.deploy(
      reservePrice,
      numBlocksAuctionOpen,
      offerPriceDecrement
    );

    await basicDutchAuction.deployed();
  });

  it("should initialize contract variables correctly", async function () {
    expect(await basicDutchAuction.seller()).to.equal(seller.address);
    expect(await basicDutchAuction.reservePrice()).to.equal(reservePrice);
    expect(await basicDutchAuction.numBlocksAuctionOpen()).to.equal(numBlocksAuctionOpen);
    expect(await basicDutchAuction.offerPriceDecrement()).to.equal(offerPriceDecrement);
  });

  it("should allow the first bidder to place bid and send it to seller immediately", async function () {
    const bidAmount1 = ethers.utils.parseEther("1.5");
    await basicDutchAuction.connect(bidder1).bid({ value: bidAmount1 });
    expect(await basicDutchAuction.firstBidder()).to.equal(bidder1.address);
    expect(await basicDutchAuction.firstBid()).to.equal(bidAmount1);
    // check if the seller receives the bid amount or not
    expect(await basicDutchAuction.balanceOf(seller.address)).to.equal(bidAmount1);
  });

  it("should revert when no refund is available", async function () {
    await expect(basicDutchAuction.connect(bidder1).claimRefund()).to.be.revertedWith("No refund available");
  });

  it("should refund upcoming bids and not accept more bids after the winner's bid", async function () {
    const bidAmount1 = ethers.utils.parseEther("3");
    const bidAmount2 = ethers.utils.parseEther("2");
    expect(await basicDutchAuction.gotValidBid()).to.be.false;
    await basicDutchAuction.connect(bidder2).bid({ value: bidAmount2 });
    expect(await basicDutchAuction.gotValidBid()).to.be.true;
    await basicDutchAuction.connect(bidder1).bid({ value: bidAmount1 });
    const amountbeforeClaim = await basicDutchAuction.balanceOf(bidder1.address);
    await basicDutchAuction.connect(bidder1).claimRefund();
    const amountafterClaim = await basicDutchAuction.balanceOf(bidder1.address);
    // console.log(amountbeforeClaim);
    // console.log(amountafterClaim);
    // console.log(bidAmount1);
    const difference = amountbeforeClaim.sub(amountafterClaim); // Calculate the difference
    expect(difference).to.equal(bidAmount1);
    // expect(await basicDutchAuction.connect(bidder1).claimRefund()).to.equal(bidAmount1);
    // const refundAmount = await basicDutchAuction.connect(bidder1).claimRefund();
    // const expectedRefundAmount = BigInt(bidAmount1.toString());
    
    // expect(refundAmount.toString()).to.equal(expectedRefundAmount.toString());

  });

  it("should return 0 when block number exceeds auction end time", async () => {
    const auctionEndTime = await basicDutchAuction.auctionEndTime();

    // Mine new blocks until the block number exceeds the auction end time
    while ((await ethers.provider.getBlockNumber()) <= auctionEndTime) {
      await ethers.provider.send("evm_mine", []);
    }

    const currentPrice = await basicDutchAuction.getCurrentPrice();

    expect(currentPrice).to.equal(0);
  });




});