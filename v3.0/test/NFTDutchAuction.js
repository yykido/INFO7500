const { ethers} = require("hardhat");
const { expect } = require("chai");

describe("NFTDutchAuction_ERC20Bids", function () {

    let nftDutchAuction;
    let erc20Token;
    let seller;
    let bidder1;
    let bidder2;
    let tokenAddress;
    let token_id = 1001;
  
    const reservePrice = 1000;
    const numBlocksAuctionOpen = 10;
    const offerPriceDecrement = 100;
  
    beforeEach(async function () {
      [seller, bidder1, bidder2,tokenAddress] = await ethers.getSigners();
      // // Deploy the ERC20 token contract
      // const ERC20Token = await ethers.getContractFactory("YYToken");
      // erc20Token = await ERC20Token.deploy();
      // await erc20Token.deployed();

      // // Get the address of the deployed ERC20 token contract
      // const erc20TokenAddress = erc20Token.address;
      
      const NFTDutchAuction = await ethers.getContractFactory("NFTDutchAuction_ERC20Bids");
      nftDutchAuction = await NFTDutchAuction.deploy(
        tokenAddress.address, //  need to be converted to ERC20Token address
        tokenAddress.address,
        token_id,
        reservePrice,
        numBlocksAuctionOpen,
        offerPriceDecrement
      );
      await nftDutchAuction.deployed();
    });

    it("Should set the total supply", async function () {
      
      expect(await nftDutchAuction.totalSupply()).to.equal(0);
    });
    it("Should set the total supply after mint", async function () {
  
      const tx = await nftDutchAuction.mint(bidder1.address);
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
    expect(await nftDutchAuction.tokenAddress()).to.equal(tokenAddress.address);
    expect(await nftDutchAuction.nftTokenId()).to.equal(token_id);
  });

  it("should allow the first bidder to place bid and send it to seller immediately", async function () {
    const bidAmount1 = ethers.utils.parseEther("1.5");
    await nftDutchAuction.connect(bidder1).bid({ value: bidAmount1 });
    expect(await nftDutchAuction.firstBidder()).to.equal(bidder1.address);
    expect(await nftDutchAuction.firstBid()).to.equal(bidAmount1);
    // check if the seller receives the bid amount or not
    expect(await nftDutchAuction.getBalanceOf(seller.address)).to.equal(bidAmount1);
  });

  it("should revert when no refund is available", async function () {
    await expect(nftDutchAuction.connect(bidder1).claimRefund()).to.be.revertedWith("No refund available");
  });

  it("should revert when bid amount is lower than current price", async function () {
    const currentPrice = await nftDutchAuction.getCurrentPrice()-1;
    await expect(nftDutchAuction.connect(bidder1).bid({value: currentPrice})).to.be.revertedWith("Bid amount is lower than current price");
  });

  it("should revert when bid amount is lower than 0", async function () {
    const bidAmount = ethers.utils.parseEther("0");
    await expect(nftDutchAuction.connect(bidder1).bid({value: bidAmount})).to.be.revertedWith("Bid amount must be greater than 0");
  });

  it("should refund upcoming bids and not accept more bids after the winner's bid", async function () {
    const bidAmount1 = ethers.utils.parseEther("3");
    const bidAmount2 = ethers.utils.parseEther("2");
    expect(await nftDutchAuction.gotValidBid()).to.be.false;
    await nftDutchAuction.connect(bidder2).bid({ value: bidAmount2 });
    expect(await nftDutchAuction.gotValidBid()).to.be.true;
    await nftDutchAuction.connect(bidder1).bid({ value: bidAmount1 });
    const amountbeforeClaim = await nftDutchAuction.getBalanceOf(bidder1.address);
    await nftDutchAuction.connect(bidder1).claimRefund();
    const amountafterClaim = await nftDutchAuction.getBalanceOf(bidder1.address);
    const difference = amountbeforeClaim.sub(amountafterClaim); // Calculate the difference
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
    const bidAmount = ethers.utils.parseEther("1");
    await expect(nftDutchAuction.connect(bidder1).bid({value: bidAmount})).to.be.revertedWith("Auction has ended");
  });

  it("should mint the NFT and send it to the winner", async () => {
    // Mint the NFT and check if it was successful
    const mintTx = await nftDutchAuction.mint(bidder1.address);
    expect(mintTx).to.emit(nftDutchAuction, "Transfer").withArgs(seller.address, bidder1.address, token_id);
    
        // Check if bidder1 is the owner of the NFT
    //   const bidder1HasNFT = await nftDutchAuction.ownerOf(token_id);
    //   expect(bidder1HasNFT).to.equal(bidder1.address, "Bidder1 does not have the NFT");

    // Confirm that the NFT balance of bidder1 is 1
    const bidder1NFTBalance = await nftDutchAuction.balanceOf(bidder1.address);
    expect(bidder1NFTBalance).to.equal(1, "Bidder1 NFT balance is incorrect");
  });
});