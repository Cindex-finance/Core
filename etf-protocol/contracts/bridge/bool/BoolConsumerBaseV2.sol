// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./BoolConsumerBase.sol";

abstract contract BoolConsumerBaseV2 is BoolConsumerBase {
    bytes32 public constant VALUE_MESSAGE = keccak256("VALUE_MESSAGE");

    constructor(address anchor_) BoolConsumerBase(anchor_) {}
}
