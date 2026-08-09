// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";

import {BUCC_UID} from "../src/BUCC_UID.sol";

/// @notice Mints a soul-bound BUCC_UID to a single recipient. Used by the
/// server-side mint endpoint after the KYC cooling-off period has elapsed.
/// Expects BUCC_UID_ADDRESS (the deployed identity contract) and
/// MINT_RECIPIENT (the smart account receiving the token) in the environment.
/// Run against anvil:
///   BUCC_UID_ADDRESS=<addr> MINT_RECIPIENT=<0x...> forge script \
///     script/MintUid.s.sol --rpc-url http://localhost:8545 \
///     --private-key <owner-key> --broadcast
contract MintUid is Script {
    function run() external {
        address recipient = vm.envAddress("MINT_RECIPIENT");
        BUCC_UID uid = BUCC_UID(vm.envAddress("BUCC_UID_ADDRESS"));

        vm.startBroadcast();
        uint256 tokenId = uid.mint(recipient);
        vm.stopBroadcast();

        console2.log("tokenId=", tokenId);
    }
}
