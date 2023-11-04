// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.9;

interface ICindexSwap {

    struct SwapData {
        address extRouter;
        bytes extCalldata;
        bool needScale;
    }
    function swap(address tokenIn, uint256 amountIn, SwapData calldata swapData) external payable;
}