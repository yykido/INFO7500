const { expect } = require("chai");
const { ethers } = require("hardhat");

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
  });

  it("should refund upcoming bids and not accept more bids after the end of the auction", async function () {
    const bidAmount1 = ethers.utils.parseEther("3");
    const bidAmount2 = ethers.utils.parseEther("2");
    expect(await basicDutchAuction.gotValidBid()).to.be.false;
    await basicDutchAuction.connect(bidder2).bid({ value: bidAmount2 });
    expect(await basicDutchAuction.gotValidBid()).to.be.true;
    await basicDutchAuction.connect(bidder1).bid({ value: bidAmount1 });
  });
});