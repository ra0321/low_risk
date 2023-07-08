// SPDX-License-Identifier: MIT

pragma solidity ^0.8.13;

interface IUniswapV3Router {
    function factory() external view returns (address);

    function refundETH() external payable;
}

interface IUniswapV3Factory {
    function getPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external view returns (address pool);
}

struct Slot0 {
    // the current price
    uint160 sqrtPriceX96;
    // the current tick
    int24 tick;
    // the most-recently updated index of the observations array
    uint16 observationIndex;
    // the current maximum number of observations that are being stored
    uint16 observationCardinality;
    // the next maximum number of observations to store, triggered in observations.write
    uint16 observationCardinalityNext;
    // the current protocol fee as a percentage of the swap fee taken on withdrawal
    // represented as an integer denominator (1/x)%
    uint8 feeProtocol;
    // whether the pool is locked
    bool unlocked;
}

interface IUniswapV3Pool {
    function slot0() external view returns (Slot0 memory);

    function token0() external view returns (address);

    function token1() external view returns (address);
}
