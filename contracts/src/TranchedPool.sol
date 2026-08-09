// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {SeniorPoolToken} from "./tokens/SeniorPoolToken.sol";
import {JuniorPoolToken} from "./tokens/JuniorPoolToken.sol";

/// @notice Base tranched liquidity pool. Accepts USDC deposits into either
/// the Senior (lower risk, fixed yield) or Junior (higher risk, first-loss)
/// tranche and mints 1:1 pool tokens. Community-approved recipients draw
/// down USDC directly from the pool. Yield, borrowing interest and
/// withdrawals are intentionally out of scope for this base version.
contract TranchedPool is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable USDC;
    SeniorPoolToken public immutable SENIOR_TOKEN;
    JuniorPoolToken public immutable JUNIOR_TOKEN;

    uint256 public totalSeniorDeposits;
    uint256 public totalJuniorDeposits;

    /// @notice Recipients the DAO/Community Engine has approved to draw down.
    mapping(address => bool) public approvedRecipients;

    /// @notice Cumulative USDC drawn down by approved recipients.
    uint256 public totalDrawn;

    error ZeroDeposit();
    error UnapprovedRecipient();
    error InsufficientPoolLiquidity();

    event ApprovedRecipientSet(address indexed recipient, bool approved);
    event Drawdown(address indexed recipient, uint256 amount);

    constructor(address usdc_) Ownable(msg.sender) {
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

    /// @notice Grants or revokes a recipient's right to draw down. Owner only.
    /// The DAO/Community Engine sets this after a proposal passes the civic vote.
    function setApprovedRecipient(address recipient, bool approved) external onlyOwner {
        approvedRecipients[recipient] = approved;
        emit ApprovedRecipientSet(recipient, approved);
    }

    /// @notice Draws down `amount` USDC from the pool to the caller. Only
    /// recipients approved by the owner may draw down.
    function drawdown(uint256 amount) external {
        if (!approvedRecipients[msg.sender]) revert UnapprovedRecipient();
        if (amount > USDC.balanceOf(address(this))) revert InsufficientPoolLiquidity();

        USDC.safeTransfer(msg.sender, amount);
        totalDrawn += amount;
        emit Drawdown(msg.sender, amount);
    }
}
