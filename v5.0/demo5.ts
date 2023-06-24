import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "@nomiclabs/hardhat-ethers";
const { ethers,upgrades,network } = require("hardhat");
import {expect} from 'chai'
import {BigNumber} from "ethers";
import { DutchAuctionERC20 } from "../typechain-types/contracts/ERC20.sol";

const _reservePrice = "100";
const _numBlocksAuctionOpen = 50;
const _offerPriceDecrement = "1";
const deadline = ethers.constants.MaxUint256;

async function getPermitSignature(
  signer:any, 
  token:DutchAuctionERC20, 
  spender:string, 
  value:BigNumber, 
  deadline:BigNumber) {

  const [nonce, name, version, chainId] = await Promise.all([
      token.nonces(signer.address),
      token.name(),
      "1",
      signer.getChainId(),
  ])

  return ethers.utils.splitSignature(
      await signer._signTypedData(
          {
              name,
              version,
              chainId,
              verifyingContract: token.address,
          },
          {
              Permit: [
                  {
                      name: "owner",
                      type: "address",
                  },
                  {
                      name: "spender",
                      type: "address",
                  },
                  {
                      name: "value",
                      type: "uint256",
                  },
                  {
                      name: "nonce",
                      type: "uint256",
                  },
                  {
                      name: "deadline",
                      type: "uint256",
                  },
              ],
          },
          {
              owner: signer.address,
              spender,
              value,
              nonce,
              deadline,
          }
      )
  )
}


describe("DutchAuction", function () {
  
  async function deployDutchAuctionTestFixture() 
  {
    const [owner, firstAcc, secondAcc] = await ethers.getSigners();

    const nftAuctionFactory = await ethers.getContractFactory("DUTCH_NFT");
    const nftAuctionContract = await nftAuctionFactory.deploy();
    
    await nftAuctionContract.mintNFT(firstAcc.address);

    const tokenAuctionFactory = await ethers.getContractFactory("DutchAuctionERC20");
    const tokenAuctionContract = await tokenAuctionFactory.deploy("1000");

    const auctionFactory = await ethers.getContractFactory("NFTDutchAuctionERC20");
    const auctionContract = await upgrades.deployProxy(auctionFactory, [tokenAuctionContract.address, nftAuctionContract.address, 1, ethers.utils.parseUnits(_reservePrice, 18), _numBlocksAuctionOpen, ethers.utils.parseUnits(_offerPriceDecrement, 18)], {kind: 'uups'});

    await nftAuctionContract.connect(firstAcc).approve(auctionContract.address, 1);
    
    return { nftAuctionContract, tokenAuctionContract, auctionContract, owner, firstAcc, secondAcc };
  }

  describe("Deployment", function () 
  {
      it("Check if the NFT is successfully escrowed in the auction contract", async function () 
      {
        const { nftAuctionContract, auctionContract, firstAcc } = await loadFixture(deployDutchAuctionTestFixture);
        
        const contractBalancePre = await nftAuctionContract.balanceOf(auctionContract.address);
        await auctionContract.connect(firstAcc).escrowNFT();
        const contractBalancePost = await nftAuctionContract.balanceOf(auctionContract.address);
        
        expect(contractBalancePre).to.equal(contractBalancePost.sub(ethers.BigNumber.from("1")));
      });

      it("Check if the NFT is successfully withdrawn from the sellers wallet", async function () 
      {
        const { nftAuctionContract, auctionContract, firstAcc } = await loadFixture(deployDutchAuctionTestFixture);
        
        const ownerBalancePre = await nftAuctionContract.balanceOf(firstAcc.address);
        await auctionContract.connect(firstAcc).escrowNFT();
        const ownerBalancePost = await nftAuctionContract.balanceOf(firstAcc.address);

        expect(ownerBalancePre).to.equal(ownerBalancePost.add(ethers.BigNumber.from("1")));
      });

      it("Check if the NFT is being successully transferred to the bidders wallet once the highest bid is received", async function () 
      {
        const { nftAuctionContract, tokenAuctionContract, owner, auctionContract, firstAcc } = await loadFixture(deployDutchAuctionTestFixture);
    
        const { v, r, s } = await getPermitSignature(
            owner,
            tokenAuctionContract,
            auctionContract.address,
            ethers.utils.parseUnits("200", 18),
            deadline
        );

        await auctionContract.connect(firstAcc).escrowNFT();
        const buyerBalancePre = await nftAuctionContract.balanceOf(owner.address);
        await auctionContract.connect(owner).bid(ethers.utils.parseUnits("200", 18), true, v, r, s, deadline);
        const buyerBalancePost = await nftAuctionContract.balanceOf(owner.address);

        expect(buyerBalancePost).to.equal(buyerBalancePre.add(ethers.BigNumber.from("1")));
      });

      it("Check if the ERC20 tokens are deposited into the seller's wallet upon the successful auction completion", async function () 
      {
        const { auctionContract, tokenAuctionContract, owner, firstAcc, secondAcc } = await loadFixture(deployDutchAuctionTestFixture);

        const { v, r, s } = await getPermitSignature(
          owner,
          tokenAuctionContract,
          auctionContract.address,
          ethers.utils.parseUnits("300", 18),
          deadline
      );

        await auctionContract.connect(firstAcc).escrowNFT();
        let sellerBalancePre = await tokenAuctionContract.balanceOf(firstAcc.address);
        await auctionContract.connect(owner).bid(ethers.utils.parseUnits("300", 18), true, v, r, s, deadline);
        let sellerBalancePost = await tokenAuctionContract.balanceOf(firstAcc.address);

        expect(sellerBalancePost).to.equal(sellerBalancePre.add(ethers.utils.parseUnits("300", 18)));
      });

      it("Check if the ERC20 tokens are deducted from the bidder's wallet upon the successful auction completion", async function () 
      {
        const { auctionContract, tokenAuctionContract, owner, firstAcc, secondAcc } = await loadFixture(deployDutchAuctionTestFixture);

        const { v, r, s } = await getPermitSignature(
          owner,
          tokenAuctionContract,
          auctionContract.address,
          ethers.utils.parseUnits("300", 18),
          deadline
      );

        await auctionContract.connect(firstAcc).escrowNFT();
        let sellerBalancePre = await tokenAuctionContract.balanceOf(owner.address);
        await auctionContract.connect(owner).bid(ethers.utils.parseUnits("300", 18), true, v, r, s, deadline);
        let sellerBalancePost = await tokenAuctionContract.balanceOf(owner.address);

        expect(sellerBalancePost).to.equal(sellerBalancePre.sub(ethers.utils.parseUnits("300", 18)));
      });

      it("Check if the NFT is successfully transferred back to the seller's wallet upon a failed auction", async function () 
      {
        const { nftAuctionContract, auctionContract, firstAcc } = await loadFixture(deployDutchAuctionTestFixture);
        
        await auctionContract.connect(firstAcc).escrowNFT();
        const sellerBalancePre = await nftAuctionContract.balanceOf(firstAcc.address);
        await network.provider.send("hardhat_mine", ["0x100"]);
        await auctionContract.connect(firstAcc).endAuction();
        const sellerBalancePost = await nftAuctionContract.balanceOf(firstAcc.address);

        expect(sellerBalancePre).to.equal(sellerBalancePost.sub(ethers.BigNumber.from("1")));
      });

      it("Check if the (endAuction) function can only be triggered by the NFT Owner", async function () 
      {
        const { auctionContract, firstAcc } = await loadFixture(deployDutchAuctionTestFixture);

        await auctionContract.connect(firstAcc).escrowNFT();

        await expect(auctionContract.endAuction()).revertedWith("Invalid call, Only owner of this NFT can trigger this call.");
      });

      it("Check if the auction initiater holds the auction NFT", async function () 
      {
        const { auctionContract } = await loadFixture(deployDutchAuctionTestFixture);

        await expect(auctionContract.escrowNFT()).revertedWith("Only owner of the NFT can start the auction.");
      });

      it("Check if the auction stops accepting new bids(from bid winner), once a bid is accepted", async function () 
      {
        const { auctionContract, tokenAuctionContract, owner, firstAcc } = await loadFixture(deployDutchAuctionTestFixture);

        const { v, r, s } = await getPermitSignature(
          owner,
          tokenAuctionContract,
          auctionContract.address,
          ethers.utils.parseUnits("160", 18),
          deadline
      );

        await auctionContract.connect(firstAcc).escrowNFT();
        await auctionContract.connect(owner).bid(ethers.utils.parseUnits("160", 18), true, v, r, s, deadline);
  
        await expect(auctionContract.connect(owner).bid(ethers.utils.parseUnits("160", 18), true, v, r, s, deadline)).revertedWith("Bids are not being accepted, the auction has ended.");
      });

      it("Check if the auction stops accepting new bids(from participants other than bid winner), once a bid is accepted", async function () 
      {
        const { auctionContract, firstAcc, owner, tokenAuctionContract } = await loadFixture(deployDutchAuctionTestFixture);

        const { v, r, s } = await getPermitSignature(
          owner,
          tokenAuctionContract,
          auctionContract.address,
          ethers.utils.parseUnits("160", 18),
          deadline
       );

        await auctionContract.connect(firstAcc).escrowNFT();
        await auctionContract.bid(ethers.utils.parseUnits("160", 18), true, v, r, s, deadline);
  
        await expect(auctionContract.connect(firstAcc).bid(ethers.utils.parseUnits("160", 18), true, v, r, s, deadline)).revertedWith("Bids are not being accepted, the auction has ended.");
      });

      it("Check if the auction stops considering bids, once the auction close time (block) is elapsed", async function () 
      {
        const { auctionContract, firstAcc, owner, tokenAuctionContract } = await loadFixture(deployDutchAuctionTestFixture);

        const { v, r, s } = await getPermitSignature(
          owner,
          tokenAuctionContract,
          auctionContract.address,
          ethers.utils.parseUnits("160", 18),
          deadline
       );

        await auctionContract.connect(firstAcc).escrowNFT();
        await network.provider.send("hardhat_mine", ["0x100"]);
        
        await expect(auctionContract.bid(ethers.utils.parseUnits("160", 18), true, v, r, s, deadline)).to.be.revertedWith("Bids are not being accepted, the auction has ended.");
      });

      it("Check if the bids are getting rejected if the bid price is less than the auction minimum price", async function () 
      {
        const { auctionContract, owner, firstAcc, tokenAuctionContract } = await loadFixture(deployDutchAuctionTestFixture);

        await auctionContract.connect(firstAcc).escrowNFT();

        const { v, r, s } = await getPermitSignature(
          owner,
          tokenAuctionContract,
          auctionContract.address,
          ethers.utils.parseUnits("50", 18),
          deadline
       );

        await expect(auctionContract.connect(owner).bid(ethers.utils.parseUnits("50", 18), true, v, r, s, deadline)).revertedWith("Your bid price is less than the required auction price.");
      });

      it("Check if the bidder transaction is getting rejected, if the signature of the offchain transaction is different", async function () 
      {
        const { auctionContract, owner, firstAcc, tokenAuctionContract } = await loadFixture(deployDutchAuctionTestFixture);

        await auctionContract.connect(firstAcc).escrowNFT();
        const { v, r, s } = await getPermitSignature(
          firstAcc,
          tokenAuctionContract,
          auctionContract.address,
          ethers.utils.parseUnits("1100", 18),
          deadline
       );
  
        await expect(auctionContract.connect(owner).bid(ethers.utils.parseUnits("1100", 18), true, v, r, s, deadline)).revertedWith("ERC20Permit: invalid signature");
      });

      it("Check if the bidder transaction is getting rejected, if there is insufficient balance", async function () 
      {
        const { auctionContract, owner, firstAcc, tokenAuctionContract } = await loadFixture(deployDutchAuctionTestFixture);
        const { v, r, s } = await getPermitSignature(
          owner,
          tokenAuctionContract,
          auctionContract.address,
          ethers.utils.parseUnits("1005", 18),
          deadline
       );

        await auctionContract.connect(firstAcc).escrowNFT();
  
        await expect(auctionContract.connect(owner).bid(ethers.utils.parseUnits("1005", 18) , true, v, r, s, deadline)).revertedWith("Not enough balance in the wallet.");
      });

      it("Check if the NFT is escrowed in the auction smart contract", async function () 
      {
        const { auctionContract, owner, firstAcc } = await loadFixture(deployDutchAuctionTestFixture);
  
        await expect(auctionContract.connect(owner).endAuction()).revertedWith("Auction NFT is not escrowed.");
      });
  });

  describe("Upgradable", () => 
  {
    it("Checking if the contract is successfully upgraded", async () => 
    {
      const { auctionContract } = await loadFixture(deployDutchAuctionTestFixture);
      const auctionContractUpgrade = await ethers.getContractFactory("NFTDutchAuction_ERC20Upgraded");
      const auctionContractUpgradeDeploy = await upgrades.upgradeProxy(auctionContract.address, auctionContractUpgrade);

      expect(await auctionContractUpgradeDeploy.currentVersion()).to.equal(ethers.BigNumber.from("2"))
    });

  });
});