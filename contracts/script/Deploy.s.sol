// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";

import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {BUCC_UID} from "../src/BUCC_UID.sol";
import {TranchedPool} from "../src/TranchedPool.sol";

/// @notice Deploys the Track A contracts: MockUSDC, BUCC_UID and the
/// TranchedPool. Logs their addresses for use by scripts and the web app.
contract Deploy is Script {
    function run() external returns (MockUSDC usdc, BUCC_UID uid, TranchedPool pool) {
        vm.startBroadcast();

        usdc = new MockUSDC(1_000_000 * 1e6);
        uid = new BUCC_UID();
        pool = new TranchedPool(address(usdc));

        vm.stopBroadcast();

        console2.log("MockUSDC:    ", address(usdc));
        console2.log("BUCC_UID:    ", address(uid));
        console2.log("TranchedPool:", address(pool));
    }
}
