// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;
pragma abicoder v2;

import "./../../../Interfaces/IDForce.sol";
import "./../LendBorrowLendStrategy.sol";

contract DForceStrategy is LendBorrowLendStrategy {
    /*** Override Internal Functions ***/

    function _getCollateralFactor(
        address xToken
    ) internal view override returns (uint256 collateralFactor, uint256 collateralFactorApplied) {
        // get collateralFactor from market
        (collateralFactor, , , , , , ) = IComptrollerDForce(comptroller).markets(xToken);

        // Apply avoidLiquidationFactor to collateralFactor
        collateralFactorApplied = collateralFactor - avoidLiquidationFactor * 10 ** 16;
    }

    /**
     * @notice Get Rewards token from compound
     */
    function _getRewardsToken(address _comptroller) internal view override returns (address) {
        return IDistributionDForce(IComptrollerDForce(_comptroller).rewardDistributor()).rewardToken();
    }
}
