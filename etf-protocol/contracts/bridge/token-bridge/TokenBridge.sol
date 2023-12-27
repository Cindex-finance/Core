// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "../bool/interfaces/IMessengerFee.sol";
import "../bool/interfaces/IAnchor.sol";
import "../bool/BoolConsumerBase.sol";

import "./interfaces/ITokenBridgeCrossSpecific.sol";

contract TokenBridge is Ownable, ERC20, BoolConsumerBase, ITokenBridgeCrossSpecific {
    /** Events */
    event Issue(address indexed account, uint256 amount);

    /** Immutables */
    uint8 private immutable _decimals;

    /** Constructor */
    constructor(
        uint8 decimals_,
        string memory name_,
        string memory symbol_,
        uint256 initialSupply_,
        address anchor_
    ) ERC20(name_, symbol_) BoolConsumerBase(anchor_) {
        _decimals = decimals_;
        _mint(msg.sender, initialSupply_);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    function issue(address account, uint256 amount) public onlyOwner {
        _issue(account, amount);
        emit Issue(account, amount);
    }

    function _issue(address account, uint256 amount) private {
        _mint(account, amount);
    }

    /** Cross-chain Related Functions */
    // Entry on the source chain (Initiative)
    function deposit(
        uint32 dstChainId,
        address payable refundAddress,
        uint256 amount,
        bytes32 dstRecipient
    ) public payable override {
        // Gas efficiency
        uint256 callValue = msg.value;
        address sender = msg.sender;

        // Check the cross-chain fee (optional)
        uint256 fee = calculateFee(dstChainId, amount, dstRecipient);
        require(callValue >= fee, "TokenBridge: INSUFFICIENT_FEE");

        // Execute the deposit logic
        _deposit(sender, amount);

        // Construct the cross-chain message
        bytes memory payload = _encodePayload(amount, dstRecipient);

        // Send to the binding anchor
        _sendAnchor(callValue, refundAddress, PURE_MESSAGE, "", dstChainId, payload);

        // Emit the event
        emit Deposit(dstChainId, sender, amount);
    }

    // Entry on the destination chain (Passive)
    function receiveFromAnchor(
        bytes32 txUniqueIdentification,
        bytes memory payload
    ) public override onlyAnchor {
        // Fetch the source chain ID
        uint32 srcChainId;
        bytes memory crossId = abi.encode(txUniqueIdentification);
        // solhint-disable-next-line no-inline-assembly
        assembly {
            srcChainId := mload(add(crossId, 4))
        }

        // Decode the cross-chain message
        (uint256 amount, bytes32 recipient) = _decodePayload(payload);
        address recipientEVM = address(uint160(uint256(recipient)));
        // Execute the withdraw logic
        _withdraw(recipientEVM, amount);

        // Emit the event
        emit Withdraw(srcChainId, recipientEVM, amount);
    }

    // Calculate the cross-chain fee to be prepaid
    function calculateFee(
        uint32 dstChainId,
        uint256 amount,
        bytes32 recipient
    ) public view override returns (uint256 fee) {
        address srcAnchor = _anchor;
        bytes memory payload = _encodePayload(amount, recipient);
        fee = IMessengerFee(IAnchor(srcAnchor).messenger()).cptTotalFee(
            srcAnchor,
            dstChainId,
            uint32(payload.length),
            PURE_MESSAGE,
            bytes("")
        );
    }

    // Encode the cross-chain message
    function encodePayload(
        uint256 amount,
        bytes32 recipient
    ) public pure override returns (bytes memory payload) {
        payload = _encodePayload(amount, recipient);
    }

    function _encodePayload(
        uint256 amount,
        bytes32 recipient
    ) private pure returns (bytes memory payload) {
        payload = abi.encode(amount, recipient);
    }

    // Decode the cross-chain message
    function decodePayload(
        bytes memory payload
    ) public pure override returns (uint256 amount, bytes32 recipient) {
        (amount, recipient) = _decodePayload(payload);
    }

    function _decodePayload(
        bytes memory payload
    ) private pure returns (uint256 amount, bytes32 recipient) {
        (amount, recipient) = abi.decode(payload, (uint256, bytes32));
    }

    // Handle the cross-chain message as the source chain
    function _deposit(address from, uint256 amount) private {
        _burn(from, amount);
    }

    // Handle the cross-chain message as the destination chain
    function _withdraw(address recipient, uint256 amount) private {
        _mint(recipient, amount);
    }
}
