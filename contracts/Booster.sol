// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import "./utils/UpgradeableBase.sol";
import "./interfaces/IStrategyContract.sol";

contract Booster is UpgradeableBase {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    address private constant ZERO_ADDRESS = address(0);

    address public blid;
    address public boostingAddress;
    uint256 public blidPerDay;
    mapping(address => uint256) public lastBoostingTimestamps;

    /*** events ***/

    event SetBLID(address _blid);
    event SetBoostingAddress(address boostingAddress);
    event SetBlidPerDay(uint256 blidPerDay);

    function __Booster_init() external initializer {
        UpgradeableBase.initialize();
    }

    /*** Public Set function ***/

    /**
     * @notice Set blid in contract
     * @param _blid address of BLID
     */
    function setBLID(address _blid) external onlyOwner {
        blid = _blid;

        emit SetBLID(_blid);
    }

    /**
     * @notice Set blid in contract
     * @param _boostingAddress address of expense
     */
    function setBoostingAddress(address _boostingAddress)
        external
        onlyOwnerAndAdmin
    {
        require(_boostingAddress != ZERO_ADDRESS, "B0");
        boostingAddress = _boostingAddress;

        emit SetBoostingAddress(boostingAddress);
    }

    /**
     * @notice Set blidPerDay
     * @param _blidPerDay Amount of blidPerDay (decimal = 18)
     */
    function setBlidPerDay(uint256 _blidPerDay) external onlyOwnerAndAdmin {
        blidPerDay = _blidPerDay;

        emit SetBlidPerDay(_blidPerDay);
    }

    /*** Public function ***/

    function addEarn(address strategy) public onlyOwnerAndAdmin {
        address logic = IStrategy(strategy).logic();

        // Process boosting
        uint256 lastBoostingTimestamp = lastBoostingTimestamps[logic];
        if (lastBoostingTimestamp > 0) {
            uint256 boostingAmount = (blidPerDay *
                uint256(block.timestamp - lastBoostingTimestamp)) / 86400;

            // Interaction
            IERC20Upgradeable(blid).safeTransferFrom(
                boostingAddress,
                logic,
                boostingAmount
            );
        }

        // Save boosting block
        lastBoostingTimestamps[logic] = block.timestamp;
    }
}
