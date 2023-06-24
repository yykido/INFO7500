// contracts/MyNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";

contract NFT is ERC721PresetMinterPauserAutoId{
    constructor() ERC721PresetMinterPauserAutoId("MyNFT", "MNFT", "https://northeastern.edu/nft") {}
}