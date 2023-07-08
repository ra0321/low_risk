// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;
pragma abicoder v2;

import "./../../../Interfaces/ICompound.sol";
import "./../LendBorrowLendStrategy.sol";

contract OlaStrategy is LendBorrowLendStrategy {
    /*** Override Internal Functions ***/

    function _getCollateralFactor(
        address xToken
    ) internal view override returns (uint256 collateralFactor, uint256 collateralFactorApplied) {
        // get collateralFactor from market
        (, collateralFactor, , , , ) = IComptrollerOla(comptroller).markets(xToken);

        // Apply avoidLiquidationFactor to collateralFactor
        collateralFactorApplied = collateralFactor - avoidLiquidationFactor * 10 ** 16;
    }

    function _getUnderlying(address xToken) internal view override returns (address) {
        address underlying = IXToken(xToken).underlying();
        if (underlying == 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) underlying = ZERO_ADDRESS;

        return underlying;
    }

    /**
     * @notice Get Rewards token from compound
     */
    function _getRewardsToken(address _comptroller) internal view override returns (address) {
        return IDistributionOla(IComptrollerOla(_comptroller).rainMaker()).lnIncentiveTokenAddress();
    }
}
