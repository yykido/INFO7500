const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("NFTDutchAuction_ERC20Bids2", function () {
  let nftDutchAuction;
  let seller;
  let bidder1;
  let bidder2;
  let erc20Token;
  let nftAuctionContract;
  let auctionContract;
  let token_id = 1001;

  const reservePrice = 1000;
  const numBlocksAuctionOpen = 10;
  const offerPriceDecrement = 100;

  beforeEach(async function () {
    [seller, bidder1, bidder2] = await ethers.getSigners();

    // Deploy NFT
    const nftAuctionFactory = await ethers.getContractFactory("NFT");
    nftAuctionContract = await nftAuctionFactory.deploy();

    // await nftAuctionContract.mintNFT(bidder1.address);

    // // Deploy the ERC20 token contract
    const ERC20Token = await ethers.getContractFactory("YYToken");
    erc20Token = await ERC20Token.deploy(1000000);
    await erc20Token.deployed();
    const erc20TokenAddress = erc20Token.address;
    // Get the address of the deployed ERC20 token contract
    // const erc20TokenAddress = erc20Token.address;
    const NftDutchAuction = await ethers.getContractFactory("NFTDutchAuction_ERC20Bids");
    // auctionContract = await basicDutchAuction.deploy();
    nftDutchAuction = await upgrades.deployProxy(NftDutchAuction, [erc20TokenAddress, nftAuctionContract.address, token_id, reservePrice, numBlocksAuctionOpen,offerPriceDecrement], {kind: 'uups'});
    // await nftAuctionContract.connect(bidder1).approve(auctionContract.address, 1);
    // await erc20Token.connect(seller).increaseAllowance(auctionContract.address, 1010);

    // console.log("haha");
    // basicDutchAuction = await BasicDutchAuction.deploy();
    // await basicDutchAuction.deployed();
    await erc20Token.connect(seller).transfer(bidder1.address, 500000);
    await erc20Token.connect(seller).transfer(bidder2.address, 500000);
  });
  it("should initialize contract variables correctly", async function () {
    expect(await nftDutchAuction.seller()).to.equal(seller.address);
    expect(await nftDutchAuction.reservePrice()).to.equal(reservePrice);
    expect(await nftDutchAuction.numBlocksAuctionOpen()).to.equal(numBlocksAuctionOpen);
    expect(await nftDutchAuction.offerPriceDecrement()).to.equal(offerPriceDecrement);
  });

  // it("Should set the total supply", async function () {
  //   const balance = await erc20Token.balanceOf(bidder1.address);
  //   const balance2 = await erc20Token.balanceOf(seller.address)
  //   console.log(balance);
  //   console.log(balance2);
    
  //   expect(await nftDutchAuction.totalSupply()).to.equal(0);
  // });
  it("Should set the total supply after mint", async function () {

    const tx = await nftAuctionContract.mint(bidder1.address);
    const receipt = await tx.wait();

    const event = receipt.events?.filter((x) => {
        return x.event == "Transfer";
    })[0];

    expect(event).to.not.be.undefined;
    expect(event.args.length > 0 && event.args[2]).to.equal(0);
  });

  it("should initialize contract variables correctly", async function () {
    expect(await nftDutchAuction.seller()).to.equal(seller.address);
    expect(await nftDutchAuction.reservePrice()).to.equal(reservePrice);
    expect(await nftDutchAuction.numBlocksAuctionOpen()).to.equal(numBlocksAuctionOpen);
    expect(await nftDutchAuction.offerPriceDecrement()).to.equal(offerPriceDecrement);
    expect(await nftDutchAuction.tokenAddress()).to.equal(nftAuctionContract.address);
    expect(await nftDutchAuction.nftTokenId()).to.equal(token_id);
  });

  it("should allow the first bidder to place bid and send it to seller immediately", async function () {
    const bidAmount1 = 10000;
    await erc20Token.connect(bidder1).approve(nftDutchAuction.address, bidAmount1);
    await nftDutchAuction.connect(bidder1).bid(bidAmount1);
    expect(await erc20Token.balanceOf(seller.address)).to.equal(bidAmount1);

    // // check if the seller receives the bid amount or not
    expect(await nftDutchAuction.getBalanceOf(seller.address)).to.equal(bidAmount1);
  });

  it("should revert when no refund is available", async function () {
    await expect(nftDutchAuction.connect(bidder1).claimRefund()).to.be.revertedWith("No refund available");
  });

  it("should revert when bid amount is lower than current price", async function () {
    const currentPrice = await nftDutchAuction.getCurrentPrice()-1;

    const bidAmount1 = 1;
    await erc20Token.connect(bidder1).approve(nftDutchAuction.address, bidAmount1);
    await expect(nftDutchAuction.connect(bidder1).bid(bidAmount1)).to.be.revertedWith("Bid amount is lower than current price");
  });

  it("should revert when bid amount is lower than 0", async function () {
    // const bidAmount = ethers.utils.parseEther("0");
    const bidAmount1 = 0;
    await erc20Token.connect(bidder1).approve(nftDutchAuction.address, bidAmount1);
    await expect(nftDutchAuction.connect(bidder1).bid(bidAmount1)).to.be.revertedWith("Bid amount must be greater than 0");
  });

  it("should refund upcoming bids and not accept more bids after the winner's bid", async function () {
    const bidAmount1 = 3000;
    await erc20Token.connect(bidder1).approve(nftDutchAuction.address, bidAmount1);
    // await erc20Token.connect(bidder1).transfer(seller.address, bidAmount1);
    const bidAmount2 = 2000;
    await erc20Token.connect(bidder2).approve(nftDutchAuction.address, bidAmount2);
    // await erc20Token.connect(bidder2).transfer(seller.address, bidAmount2);
    expect(await nftDutchAuction.gotValidBid()).to.be.false;
    await nftDutchAuction.connect(bidder2).bid(bidAmount2);
    expect(await nftDutchAuction.gotValidBid()).to.be.true;
    await nftDutchAuction.connect(bidder1).bid(bidAmount1);
    const balance1 = await erc20Token.balanceOf(bidder1.address);
    const balanceOfseller = await erc20Token.balanceOf(seller.address);
    await erc20Token.connect(seller).approve(nftDutchAuction.address, bidAmount1);
    await nftDutchAuction.connect(bidder1).claimRefund();
    const balance2 = await erc20Token.balanceOf(bidder1.address);
    const difference = balance2.sub(balance1); // Calculate the difference
    expect(difference).to.equal(bidAmount1);
  });

  it("should return 0 when block number exceeds auction end time", async () => {
    const auctionEndTime = await nftDutchAuction.auctionEndTime();

    // Mine new blocks until the block number exceeds the auction end time
    while ((await ethers.provider.getBlockNumber()) <= auctionEndTime) {
      await ethers.provider.send("evm_mine", []);
    }
    const currentPrice = await nftDutchAuction.getCurrentPrice();
    expect(currentPrice).to.equal(0);
    const bidAmount1 = 1000;
    await erc20Token.connect(bidder1).approve(nftDutchAuction.address, bidAmount1);
    await expect(nftDutchAuction.connect(bidder1).bid(bidAmount1)).to.be.revertedWith("Auction has ended");
  });

  it("should mint the NFT and send it to the winner", async () => {
    // Mint the NFT and check if it was successful
    const mintTx = await nftAuctionContract.mint(bidder1.address);
    expect(mintTx).to.emit(nftDutchAuction, "Transfer").withArgs(seller.address, bidder1.address, token_id);
    
        // Check if bidder1 is the owner of the NFT
    //   const bidder1HasNFT = await nftDutchAuction.ownerOf(token_id);
    //   expect(bidder1HasNFT).to.equal(bidder1.address, "Bidder1 does not have the NFT");

    // Confirm that the NFT balance of bidder1 is 1
    const bidder1NFTBalance = await nftAuctionContract.balanceOf(bidder1.address);
    expect(bidder1NFTBalance).to.equal(1, "Bidder1 NFT balance is incorrect");
  });

});