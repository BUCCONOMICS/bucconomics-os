// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IERC721Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

import {BUCC_UID} from "../src/BUCC_UID.sol";

contract BUCC_UIDTest is Test {
    BUCC_UID internal buccUid;

    address internal owner = makeAddr("owner");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal attacker = makeAddr("attacker");

    function setUp() public {
        vm.prank(owner);
        buccUid = new BUCC_UID();
    }

    function test_Mint() public {
        vm.prank(owner);
        uint256 tokenId = buccUid.mint(alice);

        assertEq(buccUid.balanceOf(alice), 1, "balance after mint");
        assertEq(buccUid.ownerOf(tokenId), alice, "owner after mint");
    }

    function test_MintIncrementsTokenIds() public {
        vm.prank(owner);
        uint256 firstId = buccUid.mint(alice);

        vm.prank(owner);
        uint256 secondId = buccUid.mint(bob);

        assertEq(firstId, 0, "first token id");
        assertEq(secondId, 1, "second token id");
    }

    function test_Transfer_Reverts() public {
        vm.prank(owner);
        uint256 tokenId = buccUid.mint(alice);

        vm.prank(alice);
        vm.expectRevert(BUCC_UID.NonTransferable.selector);
        buccUid.transferFrom(alice, bob, tokenId);

        assertEq(buccUid.ownerOf(tokenId), alice, "token stays put");
    }

    function test_SafeTransfer_Reverts() public {
        vm.prank(owner);
        uint256 tokenId = buccUid.mint(alice);

        vm.prank(alice);
        vm.expectRevert(BUCC_UID.NonTransferable.selector);
        buccUid.safeTransferFrom(alice, bob, tokenId);
    }

    function test_OperatorTransfer_Reverts() public {
        vm.prank(owner);
        uint256 tokenId = buccUid.mint(alice);

        vm.prank(owner);
        buccUid.setApprovalForAll(bob, true);

        vm.prank(bob);
        vm.expectRevert(BUCC_UID.NonTransferable.selector);
        buccUid.transferFrom(alice, bob, tokenId);
    }

    function test_Mint_RestrictedToOwner() public {
        vm.prank(attacker);
        vm.expectRevert();
        buccUid.mint(alice);

        assertEq(buccUid.balanceOf(alice), 0, "no token minted");
    }

    function test_Burn() public {
        vm.prank(owner);
        uint256 tokenId = buccUid.mint(alice);

        vm.prank(owner);
        buccUid.burn(tokenId);

        assertEq(buccUid.balanceOf(alice), 0, "burned balance");
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, tokenId));
        buccUid.ownerOf(tokenId);
    }
}
