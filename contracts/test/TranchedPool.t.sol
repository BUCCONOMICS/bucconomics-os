// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {IERC20Errors} from "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";

import {TranchedPool} from "../src/TranchedPool.sol";
import {MockUSDC} from "../src/mocks/MockUSDC.sol";
import {SeniorPoolToken} from "../src/tokens/SeniorPoolToken.sol";
import {JuniorPoolToken} from "../src/tokens/JuniorPoolToken.sol";

contract TranchedPoolTest is Test {
    uint256 internal constant USDC_DECIMALS = 6;
    uint256 internal constant HUNDRED = 100 * 10 ** USDC_DECIMALS;

    MockUSDC internal usdc;
    TranchedPool internal pool;
    SeniorPoolToken internal seniorToken;
    JuniorPoolToken internal juniorToken;

    address internal investor = makeAddr("investor");
    address internal investorTwo = makeAddr("investorTwo");
    address internal attacker = makeAddr("attacker");

    function setUp() public {
        usdc = new MockUSDC(1_000_000 * 10 ** USDC_DECIMALS);
        pool = new TranchedPool(address(usdc));
        seniorToken = pool.SENIOR_TOKEN();
        juniorToken = pool.JUNIOR_TOKEN();
    }

    function _fundAndApprove(address user, uint256 amount) internal {
        usdc.mint(user, amount);
        vm.prank(user);
        usdc.approve(address(pool), amount);
    }

    function test_DepositSenior_MintsTokensAndMovesUSDC() public {
        _fundAndApprove(investor, HUNDRED);

        vm.prank(investor);
        pool.depositSenior(HUNDRED);

        assertEq(seniorToken.balanceOf(investor), HUNDRED, "senior tokens minted");
        assertEq(seniorToken.totalSupply(), HUNDRED, "senior supply");
        assertEq(pool.totalSeniorDeposits(), HUNDRED, "senior accounting");
        assertEq(usdc.balanceOf(address(pool)), HUNDRED, "USDC moved to pool");
        assertEq(usdc.balanceOf(investor), 0, "USDC debited from investor");
    }

    function test_DepositJunior_MintsTokensAndMovesUSDC() public {
        _fundAndApprove(investor, HUNDRED);

        vm.prank(investor);
        pool.depositJunior(HUNDRED);

        assertEq(juniorToken.balanceOf(investor), HUNDRED, "junior tokens minted");
        assertEq(juniorToken.totalSupply(), HUNDRED, "junior supply");
        assertEq(pool.totalJuniorDeposits(), HUNDRED, "junior accounting");
        assertEq(usdc.balanceOf(address(pool)), HUNDRED, "USDC moved to pool");
        assertEq(usdc.balanceOf(investor), 0, "USDC debited from investor");
    }

    function test_TranchesAreAccountedIndependently() public {
        _fundAndApprove(investor, 2 * HUNDRED);

        vm.prank(investor);
        pool.depositSenior(HUNDRED);

        vm.prank(investor);
        pool.depositJunior(HUNDRED);

        assertEq(pool.totalSeniorDeposits(), HUNDRED, "senior total");
        assertEq(pool.totalJuniorDeposits(), HUNDRED, "junior total");
        assertEq(seniorToken.balanceOf(investor), HUNDRED, "senior tokens");
        assertEq(juniorToken.balanceOf(investor), HUNDRED, "junior tokens");
        assertEq(usdc.balanceOf(address(pool)), 2 * HUNDRED, "pool USDC");
    }

    function test_MultipleDepositorsAccumulate() public {
        _fundAndApprove(investor, HUNDRED);
        _fundAndApprove(investorTwo, HUNDRED);

        vm.prank(investor);
        pool.depositSenior(HUNDRED);

        vm.prank(investorTwo);
        pool.depositSenior(HUNDRED);

        assertEq(pool.totalSeniorDeposits(), 2 * HUNDRED, "accumulated total");
        assertEq(seniorToken.balanceOf(investor) + seniorToken.balanceOf(investorTwo), 2 * HUNDRED, "combined balances");
    }

    function test_DepositZero_Reverts() public {
        vm.expectRevert(TranchedPool.ZeroDeposit.selector);
        pool.depositSenior(0);

        vm.expectRevert(TranchedPool.ZeroDeposit.selector);
        pool.depositJunior(0);
    }

    function test_DepositWithoutApproval_Reverts() public {
        usdc.mint(investor, HUNDRED);

        vm.prank(investor);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, address(pool), 0, HUNDRED)
        );
        pool.depositSenior(HUNDRED);
    }

    function test_PoolTokenMint_RestrictedToPool() public {
        vm.prank(attacker);
        vm.expectRevert();
        seniorToken.mint(attacker, HUNDRED);

        vm.prank(attacker);
        vm.expectRevert();
        juniorToken.mint(attacker, HUNDRED);
    }

    function testFuzz_DepositSenior(uint256 amount) public {
        vm.assume(amount > 0 && amount <= type(uint128).max);

        _fundAndApprove(investor, amount);

        vm.prank(investor);
        pool.depositSenior(amount);

        assertEq(seniorToken.balanceOf(investor), amount);
        assertEq(pool.totalSeniorDeposits(), amount);
        assertEq(usdc.balanceOf(address(pool)), amount);
    }

    function testFuzz_DepositJunior(uint256 amount) public {
        vm.assume(amount > 0 && amount <= type(uint128).max);

        _fundAndApprove(investor, amount);

        vm.prank(investor);
        pool.depositJunior(amount);

        assertEq(juniorToken.balanceOf(investor), amount);
        assertEq(pool.totalJuniorDeposits(), amount);
        assertEq(usdc.balanceOf(address(pool)), amount);
    }
}
