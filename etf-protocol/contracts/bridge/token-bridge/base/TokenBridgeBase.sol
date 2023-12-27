// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

import "../../bool/interfaces/IAnchor.sol";
import "../../bool/BoolConsumerBase.sol";

abstract contract TokenBridgeBase is Ownable, Pausable, BoolConsumerBase {
    /** Events */
    event BridgeOut(bytes32 txUniqueIdentification, uint256 amount, address indexed sender);
    event BridgeIn(bytes32 txUniqueIdentification, uint256 amount, address indexed recipient);

    /** Immutables */
    bool public immutable isNativeChain;
    address public immutable messenger;

    constructor(bool isNativeChain_, address anchor_) BoolConsumerBase(anchor_) {
        isNativeChain = isNativeChain_;
        messenger = IAnchor(anchor_).messenger();
    }

    /** Pause & Unpause */
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // Encode the payload to be sent
    function encodePayload(
        uint256 amount,
        bytes32 dstRecipient
    ) public pure returns (bytes memory payload) {
        payload = abi.encode(amount, dstRecipient);
    }

    // Decode the payload received
    function decodePayload(
        bytes memory payload
    ) public pure returns (uint256 amount, bytes32 recipient) {
        (amount, recipient) = abi.decode(payload, (uint256, bytes32));
    }
}
