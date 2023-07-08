// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../../contracts/Booster.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";

contract BoosterPolygonTest is Test {
    address strategy = 0x7f5c579bFD63455580B50Eb8714433caBfBd0C1C;
    address logic = 0x0c561B41d63eE6B3E6f4aECC6c6B6b0D0a48aC4D;
    address boosting = 0xbC70F9E663F4b79De2DaFeD45EB524fe1356AC3e;
    address blid = 0x4b27Cd6E6a5E83d236eAD376D256Fe2F9e9f0d2E;

    uint256 private mainnetFork;

    Booster public booster;

    uint256 private constant BLOCK_NUMBER = 42491659;

    function setUp() public {
        mainnetFork = vm.createSelectFork(
            "https://polygon-rpc.com",
            BLOCK_NUMBER
        );

        vm.startPrank(address(0));
        booster = new Booster();
        booster.__Booster_init();

        booster.setBLID(blid);
        booster.setBoostingAddress(boosting);
        booster.setBlidPerDay(10**18);
        vm.stopPrank();

        vm.startPrank(boosting);
        IERC20MetadataUpgradeable(blid).approve(
            address(booster),
            type(uint256).max
        );
        vm.stopPrank();
    }

    function testAddEarn() public {
        uint256 blidBefore;
        uint256 blidAfter;

        vm.startPrank(address(0));

        // First add Earn without any earning
        blidBefore = IERC20MetadataUpgradeable(blid).balanceOf(logic);
        booster.addEarn(strategy);
        blidAfter = IERC20MetadataUpgradeable(blid).balanceOf(logic);

        assertEq(blidBefore, blidAfter);

        // Second addEarn 2 days after, blidAmount = 2 ether
        vm.warp(block.timestamp + 86400 + 86400);
        vm.roll(block.number + 30000);

        booster.addEarn(strategy);
        blidBefore = blidAfter;
        blidAfter = IERC20MetadataUpgradeable(blid).balanceOf(logic);

        assertEq(blidBefore + 2 * 10**18, blidAfter);

        // Third addEarn 10 days after, blidAmount = 10 ether
        vm.warp(block.timestamp + 86400 * 10);
        vm.roll(block.number + 30000);

        booster.addEarn(strategy);
        blidBefore = blidAfter;
        blidAfter = IERC20MetadataUpgradeable(blid).balanceOf(logic);

        assertEq(blidBefore + 10 * 10**18, blidAfter);

        vm.stopPrank();
    }
}
