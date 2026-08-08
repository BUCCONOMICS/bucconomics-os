// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Soul-bound identity token. Once minted to a smart account it can
/// never be transferred: the token lives with its holder for as long as it
/// exists. Minting and burning are the only ways the token can move.
contract BUCC_UID is ERC721, Ownable {
    /// @notice Attempted to transfer a soul-bound token.
    error NonTransferable();

    constructor() ERC721("BUCC UID", "BUCC_UID") Ownable(msg.sender) {}

    uint256 private _nextTokenId;

    /// @notice Mints the next identity token to `to`. Owner only.
    function mint(address to) external onlyOwner returns (uint256 tokenId) {
        tokenId = _nextTokenId;
        _mint(to, tokenId);
        _nextTokenId = tokenId + 1;
    }

    /// @notice Burns `tokenId`. Owner only.
    function burn(uint256 tokenId) external onlyOwner {
        _burn(tokenId);
    }

    /// @notice Blocks every transfer path (transferFrom, safeTransferFrom,
    /// operator transfers). Mints (auth == 0) and burns (to == 0) pass through.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        if (to != address(0) && auth != address(0)) {
            revert NonTransferable();
        }
        return super._update(to, tokenId, auth);
    }
}
