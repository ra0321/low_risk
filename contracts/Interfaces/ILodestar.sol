// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

interface IComptrollerLodestar {
    function markets(
        address cTokenAddress
    ) external view returns (bool isListed, uint256 collateralFactorMantissa, bool isComped);
}
