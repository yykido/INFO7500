// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract BasicDutchAuction {
    address payable public seller;
    uint256 public reservePrice;
    uint256 public numBlocksAuctionOpen;
    uint256 public offerPriceDecrement;
    uint256 public initialPrice;
    uint256 public auctionEndTime;
    bool public auctionEnded;
    address payable public firstBidder;
    uint256 public firstBid;
    bool public gotValidBid;

    mapping(address => uint256) public bids;

    event AuctionEnded(address winner, uint256 amount);

    constructor(uint256 _reservePrice, uint256 _numBlocksAuctionOpen, uint256 _offerPriceDecrement) {
        seller = payable(msg.sender);
        reservePrice = _reservePrice;
        numBlocksAuctionOpen = _numBlocksAuctionOpen;
        offerPriceDecrement = _offerPriceDecrement;

        initialPrice = reservePrice + numBlocksAuctionOpen * offerPriceDecrement;
        auctionEndTime = block.number + numBlocksAuctionOpen;
        auctionEnded = false;
        gotValidBid = false;
        firstBidder = payable(address(0));
        firstBid = 0;
        console.log('block.number', block.number);
        console.log('auctionEndTime', auctionEndTime);
        console.log('auctionEndTime', auctionEndTime);

    }

    function bid() public payable returns(bool){
        uint256 currentPrice = getCurrentPrice();
        require(currentPrice > 0, "Auction has ended");
        require(msg.value > 0, "Bid amount must be greater than 0");
        require(msg.value >= currentPrice, "Bid amount is lower than current price");

        if(!gotValidBid) {
            firstBidder = payable(msg.sender);
            firstBid = msg.value;
            gotValidBid = true;
            bids[seller] += firstBid;
            seller.transfer(firstBid);
            return true;
        }
        bids[msg.sender] += msg.value;
        return false;
    }

    function getCurrentPrice() public view returns (uint256) {
        if (block.number >= auctionEndTime) {
            return 0; // Auction has ended
        } else {
            uint256 blocksRemaining = auctionEndTime - block.number;
            return initialPrice - blocksRemaining * offerPriceDecrement;
        }
    }

    function claimRefund() external {
        // require(auctionEnded, "Auction has not ended");
        require(bids[msg.sender] > 0, "No refund available");

        uint256 refundAmount = bids[msg.sender];
        bids[msg.sender] = 0;
        payable(msg.sender).transfer(refundAmount);
    }

    function balanceOf(address account) external view returns (uint256) {
        return bids[account];
    }
}