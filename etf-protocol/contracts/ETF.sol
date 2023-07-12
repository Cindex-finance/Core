// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./TransferHelper.sol";

contract ETF is ERC20, Ownable, ReentrancyGuard, Pausable {

    using SafeMath for uint256;

    uint256 constant public FACTOR = 10000;

    address[] public allWhitelistedTokens;

    mapping (address => uint256) public tokenWeights;

    uint256 public totalTokenWeights;

    uint256 public managerRedeemFee = 10;//0.1%

    address public feeRecipient;

    event Deposit(address indexed user, address[] tokens, uint256[] amounts);

    event Withdraw(address indexed user, uint256 share);
    
    constructor(
        address[] memory tokens,
        uint256[] memory weights,
        string memory _symbol, 
        string memory _name
    ) 
        ERC20(_name, _symbol)
    {
        allWhitelistedTokens = tokens;
        uint256 count = tokens.length;
        feeRecipient = msg.sender;
        for(uint256 i = 0; i < count; i++) {
            tokenWeights[tokens[i]] = weights[i];
            totalTokenWeights = totalTokenWeights.add(weights[i]);
        }
    }

    modifier onlyEOA {
        require(msg.sender == tx.origin, "EOA");
        _;
    }

    function updateFeeRecipient(address _feeRecipient) external onlyOwner {
        feeRecipient = _feeRecipient;
    }

    function deposit(uint256 amount) external onlyEOA nonReentrant whenNotPaused {
        uint256 count = allWhitelistedTokensLength();
        uint256[] memory amounts = new uint256[](count);
        for(uint256 i = 0; i < count; i++) {
            address token = allWhitelistedTokens[i];
            uint256 _amount = amount;
            if (i != 0){
                _amount = amount * tokenWeights[token] / tokenWeights[allWhitelistedTokens[0]];
            }
            TransferHelper.safeTransferFrom(token, msg.sender, address(this), _amount);
            amounts[i] = _amount;
        }
        _mint(msg.sender, amount);
        emit Deposit(msg.sender, allWhitelistedTokens, amounts);
    }

    function withdraw(uint256 share) external onlyEOA nonReentrant whenNotPaused {
        uint256 burnAmount = share;
        if (msg.sender != feeRecipient && managerRedeemFee > 0) {
            uint256 fee = share.mul(managerRedeemFee).div(FACTOR);
            _transfer(msg.sender, feeRecipient, fee);
            burnAmount = share - fee;
        }
        bool flag = burnAmount == totalSupply(); 
        _burn(msg.sender, burnAmount);
        uint256 count = allWhitelistedTokensLength();
        for(uint256 i = 0; i < count; i++) {
            uint256 amount = 0;
            address token = allWhitelistedTokens[i];
            if (flag) {
                amount = IERC20(token).balanceOf(address(this));
            } else {
                if (i == 0) {
                    amount = burnAmount;
                } else {
                    amount = burnAmount * tokenWeights[token] / tokenWeights[allWhitelistedTokens[0]];
                }
            }
            TransferHelper.safeTransfer(token, msg.sender, amount);
        }
        emit Withdraw(msg.sender, share);
    }

    function allWhitelistedTokensLength() public view returns(uint256) {
        return allWhitelistedTokens.length;
    }
    function pause() external onlyOwner whenNotPaused {
        _pause();
    }

    function unpause() external onlyOwner whenPaused {
        _unpause();
    }
}
