// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {SeniorPoolToken} from "./tokens/SeniorPoolToken.sol";
import {JuniorPoolToken} from "./tokens/JuniorPoolToken.sol";

/// @notice Base tranched liquidity pool. Accepts USDC deposits into either
/// the Senior (lower risk, fixed yield) or Junior (higher risk, first-loss)
/// tranche and mints 1:1 pool tokens. Yield, borrowing and withdrawals are
/// intentionally out of scope for this base version.
contract TranchedPool {
    using SafeERC20 for IERC20;

    IERC20 public immutable USDC;
    SeniorPoolToken public immutable SENIOR_TOKEN;
    JuniorPoolToken public immutable JUNIOR_TOKEN;

    uint256 public totalSeniorDeposits;
    uint256 public totalJuniorDeposits;

    error ZeroDeposit();

    constructor(address usdc_) {
        USDC = IERC20(usdc_);
        SENIOR_TOKEN = new SeniorPoolToken();
        JUNIOR_TOKEN = new JuniorPoolToken();
    }

    function depositSenior(uint256 amount) external {
        if (amount == 0) revert ZeroDeposit();

        USDC.safeTransferFrom(msg.sender, address(this), amount);
        totalSeniorDeposits += amount;
        SENIOR_TOKEN.mint(msg.sender, amount);
    }

    function depositJunior(uint256 amount) external {
        if (amount == 0) revert ZeroDeposit();

        USDC.safeTransferFrom(msg.sender, address(this), amount);
        totalJuniorDeposits += amount;
        JUNIOR_TOKEN.mint(msg.sender, amount);
    }
}
