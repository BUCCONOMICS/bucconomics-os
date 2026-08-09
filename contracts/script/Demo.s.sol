// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";

import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {BUCC_UID} from "../src/BUCC_UID.sol";
import {TranchedPool} from "../src/TranchedPool.sol";

/// @notice End-to-end demo of the Track A investor journey on a local chain:
/// deploy the contracts, mint a BUCC_UID to the investor, fund them with USDC
/// and deposit into both tranches. Run against anvil:
///   anvil & forge script script/Demo.s.sol --rpc-url http://localhost:8545 \
///     --private-key <anvil-key>
contract Demo is Script {
    function run() external returns (MockUSDC usdc, BUCC_UID uid, TranchedPool pool) {
        address investor = msg.sender;
        uint256 deposit = 10_000 * 1e6; // 10,000 USDC

        vm.startBroadcast();

        usdc = new MockUSDC(1_000_000 * 1e6);
        uid = new BUCC_UID();
        pool = new TranchedPool(address(usdc));

        usdc.mint(investor, deposit);
        uid.mint(investor);

        // Investor supplies USDC into the pool.
        usdc.approve(address(pool), deposit);
        pool.depositSenior(deposit / 2);
        pool.depositJunior(deposit / 2);

        vm.stopBroadcast();

        console2.log("MockUSDC:    ", address(usdc));
        console2.log("BUCC_UID:    ", address(uid));
        console2.log("TranchedPool:", address(pool));
        console2.log("UID owner:   ", uid.ownerOf(0));
        console2.log("USDC balance:", usdc.balanceOf(investor));
        console2.log("Senior token:", pool.SENIOR_TOKEN().balanceOf(investor));
        console2.log("Junior token:", pool.JUNIOR_TOKEN().balanceOf(investor));
        console2.log("Senior pool: ", pool.totalSeniorDeposits());
        console2.log("Junior pool: ", pool.totalJuniorDeposits());
    }
}
