// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;
pragma abicoder v2;

import "../../../LendingLogic.sol";
import "../../../Interfaces/ISonne.sol";

contract SonneLogic is LendingLogic {
    /*** Override internal function ***/

    function _checkMarkets(address xToken) internal view override returns (bool isListed) {
        (isListed, , ) = IComptrollerSonne(comptroller).markets(xToken);
    }
}
