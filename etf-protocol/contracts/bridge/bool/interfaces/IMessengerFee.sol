// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/// @title Messenger Fee Interface
/// @notice This interface defines the function related to calculating fees configured by the protocol.

interface IMessengerFee {
    /**
     * @notice Calculate the total fee for a cross-chain transaction.
     * @param srcAnchor The address of the source anchor contract.
     * @param dstChainId The ID of the destination chain.
     * @param payloadSize The size of the payload in bytes.
     * @param crossType The type of cross-chain transaction.
     * @param extraFeed Additional fee-related information in bytes.
     * @return feeInNative The total fee in the native token (wei) of the source chain.
     */
    function cptTotalFee(
        address srcAnchor,
        uint32 dstChainId,
        uint32 payloadSize,
        bytes32 crossType,
        bytes memory extraFeed
    ) external view returns (uint256 feeInNative);
}
