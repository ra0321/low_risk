// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;
pragma abicoder v2;

import "./../../../Interfaces/ISonne.sol";
import "./../LendBorrowLendStrategy.sol";

contract SonneStrategy is LendBorrowLendStrategy {
    /*** Override Internal Functions ***/

    function _getCollateralFactor(
        address xToken
    ) internal view override returns (uint256 collateralFactor, uint256 collateralFactorApplied) {
        // get collateralFactor from market
        (, collateralFactor, ) = IComptrollerSonne(comptroller).markets(xToken);

        // Apply avoidLiquidationFactor to collateralFactor
        collateralFactorApplied = collateralFactor - avoidLiquidationFactor * 10 ** 16;
    }

    /**
     * @notice generates circle (borrow-lend) of the base token
     * token (of amount) should be mint before start build
     * @param xToken xToken address
     * @param amount amount to build (borrowAmount)
     * @param iterateCount the number circles to
     */
    function generateCircles(address xToken, uint256 amount, uint8 iterateCount) external {
        address _logic = logic;
        uint256 _amount = amount;

        // Get collateralFactor, the maximum proportion of borrow/lend
        // apply avoidLiquidationFactor
        (, uint256 collateralFactorApplied) = _getCollateralFactor(xToken);
        require(collateralFactorApplied > 0, "C1");

        if (_amount > 0) {
            for (uint256 i = 0; i < iterateCount; ) {
                ILendingLogic(_logic).borrow(xToken, _amount);
                ILendingLogic(_logic).mint(xToken, _amount);
                _amount = (_amount * collateralFactorApplied) / BASE;

                unchecked {
                    ++i;
                }
            }
        }
    }

    /**
     * @notice Set StrategyXToken
     * Add XToken for circle in Contract and approve token
     * entermarkets to lending system
     * @param _xToken Address of XToken
     */
    function setupStrategyXToken(address _xToken) external onlyOwner {
        if (_xToken != ZERO_ADDRESS && strategyXToken != _xToken) {
            strategyXToken = _xToken;
            strategyToken = _registToken(_xToken, logic);

            emit SetStrategyXToken(_xToken);
        }
    }

    /**
     * @notice Set SupplyXToken
     * Add XToken for supply in Contract and approve token
     * entermarkets to lending system
     * @param _xToken Address of XToken
     */
    function setupSupplyXToken(address _xToken) external onlyOwner {
        if (_xToken != ZERO_ADDRESS && supplyXToken != _xToken) {
            supplyXToken = _xToken;
            supplyToken = _registToken(_xToken, logic);

            emit SetSupplyXToken(_xToken);
        }
    }

    /**
     * @notice Get underlying
     * call Logic.addXTokens
     * call Logic.enterMarkets
     */
    function _registToken(address xToken, address _logic) private returns (address underlying) {
        underlying = _getUnderlying(xToken);

        // Add token/iToken to Logic
        ILendingLogic(_logic).addXTokens(underlying, xToken);

        // Entermarkets with token/xToken
        address[] memory tokens = new address[](1);
        tokens[0] = xToken;
        ILendingLogic(_logic).enterMarkets(tokens);
    }
}
