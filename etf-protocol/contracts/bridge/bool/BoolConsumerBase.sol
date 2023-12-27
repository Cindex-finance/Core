// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "./interfaces/IBoolConsumerBase.sol";
import "./interfaces/IAnchor.sol";

/**
 * @title BoolConsumerBase
 * @dev Abstract contract implementing the IBoolConsumerBase interface and supporting ERC165.
 *      It provides functionality for handling transactions and checks related to a binding Anchor.
 * @notice This contract is intended to be inherited by Consumer on Bool Network.
 */

abstract contract BoolConsumerBase is ERC165, IBoolConsumerBase {
    /** Error Messages */

    /**
     * @dev Error message indicating that the provided address is not a valid anchor.
     * @param wrongAnchor The address that was not a valid anchor.
     */
    error NOT_ANCHOR(address wrongAnchor);

    /** Constants */

    /**
     * @dev Constant representing a pure message identifier.
     */
    bytes32 public constant PURE_MESSAGE = keccak256("PURE_MESSAGE");

    /** BoolAMT Specific */

    /**
     * @dev The address of the anchor binding to this contract.
     */
    address internal immutable _anchor;

    /** Constructor */

    /**
     * @dev Constructor that initializes the contract with the specified anchor address.
     * @param anchor_ The address of the anchor contract.
     */
    constructor(address anchor_) {
        _anchor = anchor_;
    }

    /** Modifiers */

    /**
     * @dev Modifier that restricts access to only the anchor address.
     */
    modifier onlyAnchor() {
        _checkAnchor(msg.sender);
        _;
    }

    /** Key Function on the Source Chain */

    /**
     * @notice Receive a cross-chain transaction from the anchor.
     * @param txUniqueIdentification The unique identification of the transaction.
     * @param payload The payload from the source chain Consumer.
     */
    // solhint-disable-next-line no-empty-blocks
    function receiveFromAnchor(
        bytes32 txUniqueIdentification,
        bytes memory payload
    ) external virtual override onlyAnchor {}

    /** Key Function on the Destination Chain */

    /**
     * @dev Sends a transaction to the anchor on the destination chain.
     * @param callValue The value to send with the transaction.
     * @param refundAddress The address to refund any cross-chain fee to.
     * @param crossType The type of cross-chain transaction.
     * @param extraFeed Additional data for the transaction.
     * @param dstChainId The destination chain's ID.
     * @param payload The transaction payload.
     * @return txUniqueIdentification A unique identifier for the transaction.
     */
    function _sendAnchor(
        uint256 callValue,
        address payable refundAddress,
        bytes32 crossType,
        bytes memory extraFeed,
        uint32 dstChainId,
        bytes memory payload
    ) internal virtual returns (bytes32 txUniqueIdentification) {
        txUniqueIdentification = IAnchor(_anchor).sendToMessenger{value: callValue}(
            refundAddress,
            crossType,
            extraFeed,
            dstChainId,
            payload
        );
    }

    /** Internal Functions */

    /**
     * @dev Checks whether the provided target anchor is the same as the contract's anchor.
     * @param targetAnchor The address to check.
     */
    function _checkAnchor(address targetAnchor) internal view {
        if (targetAnchor != _anchor) revert NOT_ANCHOR(targetAnchor);
    }

    /** View Functions */

    /**
     * @dev Checks whether the contract supports a specific interface.
     * @param interfaceId The interface ID to check.
     * @return A boolean indicating whether the contract supports the interface.
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IBoolConsumerBase).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @dev Retrieves the address of the anchor binding to this contract.
     * @return The address of the anchor contract.
     */
    function anchor() external view override returns (address) {
        return _anchor;
    }
}
