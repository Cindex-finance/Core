// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface ITokenBridgeCrossSpecific {
    /** Events */
    event Deposit(uint32 dstChainId, address indexed account, uint256 amount);
    event Withdraw(uint32 srcChainId, address indexed account, uint256 amount);

    /** Cross-chain Related Functions */
    // Source chain entry
    function deposit(
        uint32 dstChainId,
        address payable refundAddress,
        uint256 amount,
        bytes32 dstRecipient
    ) external payable;

    // Cross-chain fee calculation
    function calculateFee(
        uint32 dstChainId,
        uint256 amount,
        bytes32 recipient
    ) external view returns (uint256 fee);

    // Encode the cross-chain message
    function encodePayload(
        uint256 amount,
        bytes32 recipient
    ) external pure returns (bytes memory payload);

    // Decode the cross-chain message
    function decodePayload(
        bytes memory payload
    ) external pure returns (uint256 amount, bytes32 recipient);
}
