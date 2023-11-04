// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.9;

import '@openzeppelin/contracts/utils/Address.sol';
import '../TransferHelper.sol';
import './oneinch/OneInchRouterHelper.sol';
import './ICindexSwap.sol';

contract CindexSwap is ICindexSwap, OneInchRouterHelper {

    using Address for address;

    function swap(
        address tokenIn,
        uint256 amountIn,
        SwapData calldata data
    ) external override payable {
        TransferHelper.safeApproveInf(tokenIn, data.extRouter);
        data.extRouter.functionCallWithValue(
            data.needScale ? _getOneInchInputData(data.extCalldata, amountIn) : data.extCalldata,
            tokenIn == TransferHelper.NATIVE ? amountIn : 0
        );
    }

    receive() external payable {}
}