// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/**
 * @title Bool Consumer Base Interface
 * @notice This interface defines functions for interacting with a standardized Consumer in Bool Network.
 */
interface IBoolConsumerBase is IERC165 {
    /**
     * @notice Get the address of its binding anchor contract.
     * @return The address of the anchor contract.
     */
    function anchor() external view returns (address);

    /**
     * @notice Receive a cross-chain transaction from the anchor.
     * @param txUniqueIdentification The unique identification of the transaction.
     * @param payload The payload from the source chain Consumer.
     */
    function receiveFromAnchor(bytes32 txUniqueIdentification, bytes memory payload) external;
}
