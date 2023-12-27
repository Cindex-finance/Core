// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IBridgedERC20 is IERC20 {
    function nativeToken() external view returns (address);

    function bridge() external view returns (address);

    function mint(address to, uint256 amount) external;

    function burn(address from, uint256 amount) external;

    event Mint(address indexed account, uint256 amount);
    event Burn(address indexed account, uint256 amount);
}
