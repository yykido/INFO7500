// contracts/MyNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";


contract NFTDutchAuction_ERC20Bids is Initializable, OwnableUpgradeable, UUPSUpgradeable{
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
    address public tokenAddress;
    uint256 public nftTokenId;
    address public erc20TokenAddress;

    mapping(address => uint256) public bids;

    event AuctionEnded(address winner, uint256 amount);

    function initialize (
        address _erc20TokenAddress, 
        address erc721TokenAddress,
         uint256 _nftTokenId,
        uint256 _reservePrice, 
        uint256 _numBlocksAuctionOpen, 
        uint256 _offerPriceDecrement
        ) 
        public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
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
        tokenAddress = erc721TokenAddress;
        nftTokenId = _nftTokenId;
        erc20TokenAddress = _erc20TokenAddress;
    }

    function bid(uint256 amount) public returns (bool) {
        uint256 currentPrice = getCurrentPrice();
        require(currentPrice > 0, "Auction has ended");
        require(amount > 0, "Bid amount must be greater than 0");
        require(amount >= currentPrice, "Bid amount is lower than current price");

        if (!gotValidBid) {
            firstBidder = payable(msg.sender);
            firstBid = amount;
            gotValidBid = true;
            bids[seller] += firstBid;
            IERC20(erc20TokenAddress).transferFrom(msg.sender, seller, firstBid);
            return true;
        }
        bids[msg.sender] += amount;
        IERC20(erc20TokenAddress).transferFrom(msg.sender, seller, amount);
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
        IERC20(erc20TokenAddress).transferFrom(seller, msg.sender, refundAmount);
    }

    function getBalanceOf(address account) public view returns (uint256) {
        return bids[account];
    }

    function _authorizeUpgrade(address newImplementation) internal onlyOwner override {}
}
