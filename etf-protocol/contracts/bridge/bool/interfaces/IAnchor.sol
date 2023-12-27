// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/**
 * @title IAnchor
 * @dev Interface for an Anchor contract used for cross-chain communication.
 */
interface IAnchor {
    /**
     * @dev Returns the address of the messenger contract.
     * @return The address of the messenger contract.
     */
    function messenger() external view returns (address);

    /**
     * @dev Sends a transaction to the messenger contract for cross-chain communication.
     * @param refundAddress The address to refund any excess cross-chain fee to.
     * @param crossType The type of cross-chain transaction, and you can set it to keccak256("PURE_MESSAGE").
     * @param extraFeed Additional data for the transaction, and you can set it to "".
     * @param dstChainId The ID of the destination chain.
     * @param payload The encoded data to be executed on the destination chain.
     * @return txUniqueIdentification The unique identification of the transaction.
     */
    function sendToMessenger(
        address payable refundAddress,
        bytes32 crossType,
        bytes memory extraFeed,
        uint32 dstChainId,
        bytes calldata payload
    ) external payable returns (bytes32 txUniqueIdentification);
}
