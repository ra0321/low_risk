// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;
pragma abicoder v2;

import "../../../LendingLogic.sol";
import "../../../Interfaces/ILodestar.sol";

contract LodestarLogic is LendingLogic {
    /*** Override internal function ***/

    function _checkMarkets(address xToken) internal view override returns (bool isListed) {
        (isListed, , ) = IComptrollerLodestar(comptroller).markets(xToken);
    }
}
