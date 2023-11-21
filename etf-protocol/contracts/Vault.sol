// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./TransferHelper.sol";
import "./Formula.sol";
import "./markets/SavingsDaiMarket.sol";
import "./markets/StEthMarket.sol";
import "./exchange/ICindexSwap.sol";

contract Vault is ERC20, Ownable, ReentrancyGuard, Pausable {

    struct AssetOracle {
        address asset;
        address oracle;
    }

    uint256 public lastUpdatedTime;

    uint256 public protocolFee = 20;

    // Support staking coins (usdc,usdt,dai)
    address[] public supportAssets;

    mapping (address => AggregatorV3Interface) public oracles;

    mapping (address => uint256) assetAmounts;

    uint256 internal constant PRECISION = 10 ** 18;

    // sDai and stETH usd value weight
    uint256[] weights = [95, 5];

    address private immutable PROTOCOL_FEE_RESERVE;

    ICindexSwap public router;

    address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address constant STETH = 0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84;

    // sDAI, stETH
    address[] public underlyingTokens = [0x83F20F44975D03b1b09e64809B757c47f942BEeA, 0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84];

    event Deposit(address indexed user, uint256 share, address asset, uint256 amount, uint256 amount0, uint256 amount1, string referralCode);

    event DepositUnderlying(address indexed user, uint256 share, uint256 amount0, uint256 amount1);

    event Withdraw(address indexed user, uint256 share, address asset, uint256 amount, uint256 amount0, uint256 amount1);

    event WithdrawUnderlying(address indexed user, uint256 share, uint256 amount0, uint256 amount1);

    event ProtocolFee(uint256 amount0, uint256 amount1);

    struct DepositParams {
        address tokenIn;
        uint256 amountIn;
        ICindexSwap.SwapData[] swapData;
        string referralCode;
    }

    struct WithdrawParams {
        uint256 share;
        address tokenOut;
        ICindexSwap.SwapData[] swapData;
    }

    constructor(
        address[] memory _supportAssets,
        AssetOracle[] memory _assetOracles,
        address _protocolFeeReserve,
        address _router,
        string memory _symbol, 
        string memory _name
    ) payable
        ERC20(_name, _symbol)
    {
        supportAssets = _supportAssets;
        PROTOCOL_FEE_RESERVE = _protocolFeeReserve;
        router = ICindexSwap(_router);
        uint256 count = _assetOracles.length;
        for(uint256 i = 0; i < count; i++) {
            AssetOracle memory assetOracle = _assetOracles[i];
            oracles[assetOracle.asset] = AggregatorV3Interface(assetOracle.oracle);
        }
    }


    modifier onlyEOA {
        require(msg.sender == tx.origin, "EOA");
        _;
    }

    function isSupportAsset(address asset) public view returns (bool) {
        uint256 count = supportAssets.length;
        for(uint256 i = 0; i < count; i++) {
            if (supportAssets[i] == asset) {
                return true;
            }
        }
        return false;
    }

    function deposit(DepositParams memory params) external onlyEOA nonReentrant whenNotPaused returns (uint256){
        address tokenIn = params.tokenIn;
        uint256 amountIn = params.amountIn;
        string memory referralCode = params.referralCode;
        require(isSupportAsset(tokenIn), 'UnsupportedAsset');
        require(amountIn > 0, 'AmountInZero');
        ICindexSwap.SwapData[] memory swapData = params.swapData;
        require(swapData.length > 0, 'SwapDataZero');
        uint256 _sharePrePrice = sharePrePrice();
        TransferHelper.safeTransferFrom(tokenIn, msg.sender, address(this), amountIn);
        calProtocolFee();
        uint256 amount0 = amountIn * weights[0] / 100;
        uint256 amount1 = amountIn * weights[1] / 100;
        (uint256[] memory prices, uint8[] memory decimals) = getPrices();
        if (totalSupply() > 0){
            uint256 value = queryAssetValue(tokenIn, amountIn);
            //需要平衡两个币数量，公式需要修改
            uint256[] memory amounts = Formula.calDecrease(getPoolAmounts(), weights, prices, decimals, 
                value);
            amount0 = amounts[0];
            amount1 = amounts[1];
        }
        uint256[] memory newAmounts = _deposit(tokenIn, amountIn, swapData);
        uint256 share = Formula.dot(newAmounts, prices, decimals) * _sharePrePrice;
        _mint(msg.sender, share);
        updateAssetAmounts();
        emit Deposit(msg.sender, share, tokenIn, amountIn, amount0, amount1, referralCode);
        return share;
    }

    function depositUnderlying(uint256 amount0) external onlyEOA nonReentrant whenNotPaused returns (uint256){
        require(amount0 > 0, 'Amount0InZero');
        calProtocolFee();
        (uint256[] memory prices, uint8[] memory decimals) = getPrices();
        uint256 amount1 = amount0 * (prices[0] / (10 ** decimals[0])) * weights[1] / 100 / (prices[1] / (10 ** decimals[1]));
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = amount0;
        amounts[1] = amount1;
        TransferHelper.safeTransferFrom(SavingsDaiMarket.sDAI, msg.sender, address(this), amounts[0]);
        TransferHelper.safeTransferFrom(StEthMarket.stETH, msg.sender, address(this), amounts[1]);
        uint256 _sharePrePrice = sharePrePrice();
        uint256 share = Formula.dot(amounts, prices, decimals) * _sharePrePrice;
        _mint(msg.sender, share);
        updateAssetAmounts();
        emit DepositUnderlying(msg.sender, share, amounts[0], amounts[1]);
        return share;
    }

    /*
     *@dev withdraw shares
     */
    function withdraw(WithdrawParams memory params) external onlyEOA nonReentrant whenNotPaused {
        uint256 share = params.share;
        address tokenOut = params.tokenOut;
        require(isSupportAsset(tokenOut), 'UnsupportedAsset');
        require(share > 0, 'ShareZero');
        ICindexSwap.SwapData[] memory swapData = params.swapData;
        require(swapData.length > 0, 'SwapDataZero');
        uint256 totalSupply = totalSupply();
        //需提出来的币数量
        uint256[] memory amounts = getPoolAmounts();
        uint256 amount0 = amounts[0] * share / totalSupply;//sDAI
        uint256 amount1 = amounts[1] * share / totalSupply;//stETH
        calProtocolFee();
        _burn(msg.sender, share);
        //先将sDAI换成DAI，然后swap换成目标币
        uint256 amount = SavingsDaiMarket.redeem(amount0, address(this), address(this));
        router.swap(DAI, amount, swapData[0]);
        //再将stETH直接swap到目标币
        router.swap(STETH, amount1, swapData[1]);
        updateAssetAmounts();
        emit Withdraw(msg.sender, share, tokenOut, share, amount0, amount1);
    }

    function withdrawUnderlying(uint256 share) external onlyEOA nonReentrant whenNotPaused {
        require(share > 0, 'ShareZero');
        uint256 totalSupply = totalSupply();
        uint256[] memory amounts = getPoolAmounts();
        uint256 amount0Out = amounts[0] * share / totalSupply;
        uint256 amount1Out = amounts[1] * share / totalSupply;
        calProtocolFee();
        _burn(msg.sender, share);
        address token0Out = underlyingTokens[0];
        address token1Out = underlyingTokens[1];
        TransferHelper.safeTransfer(token0Out, msg.sender, amount0Out);
        TransferHelper.safeTransfer(token1Out, msg.sender, amount1Out);
        updateAssetAmounts();
        emit WithdrawUnderlying(msg.sender, share, amount0Out, amount1Out);
    }

    function updateAssetAmounts() internal {
        uint256 sDaiAmount = SavingsDaiMarket.balanceOf(address(this));
        uint256 exchangeRate = SavingsDaiMarket.exchangeRate();
        uint256 sETHAmount = StEthMarket.balanceOf(address(this));
        assetAmounts[SavingsDaiMarket.sDAI] = sDaiAmount * exchangeRate;
        assetAmounts[StEthMarket.stETH] = sETHAmount;
    }

    /*
     *@dev Calculate fees
     */
    function calProtocolFee() internal {
        if (totalSupply() > 0) {
            //查询
            uint256 sDaiAmount = SavingsDaiMarket.balanceOf(address(this));
            uint256 exchangeRate = SavingsDaiMarket.exchangeRate();
            //查询合约中stETH的数量
            uint256 sETHAmount = StEthMarket.balanceOf(address(this));
            //计算这段时间内生息资产
            uint256 sDaiInterestAmount = (sDaiAmount * exchangeRate) - assetAmounts[SavingsDaiMarket.sDAI];
            uint256 sETHInterestAmount = sETHAmount - assetAmounts[StEthMarket.stETH];
            //计算协议费用
            uint256 sDaiFeeAmount = sDaiInterestAmount * protocolFee / 100 / 1e18;
            uint256 sETHFeeAmount = sETHInterestAmount * protocolFee / 100;
            TransferHelper.safeTransfer(SavingsDaiMarket.sDAI, PROTOCOL_FEE_RESERVE, sDaiFeeAmount);
            TransferHelper.safeTransfer(StEthMarket.stETH, PROTOCOL_FEE_RESERVE, sETHFeeAmount);
            emit ProtocolFee(sDaiFeeAmount, sETHFeeAmount);
        }
    }
    
    function _deposit(address tokenIn, uint256 amountIn, ICindexSwap.SwapData[] memory swapData) internal returns(uint256[] memory) {
        uint256[] memory amounts = new uint256[](2);
        uint256 sDaiAmount = _depositSavingDai(tokenIn, amountIn, swapData);
        uint256 stEthAmount = _depositStEth(tokenIn, amountIn, swapData);
        amounts[0] = sDaiAmount;
        amounts[1] = stEthAmount;
        return amounts;
    }

    /*
     *@dev Calculate the share corresponding to each price
     */
    function sharePrePrice() public view returns(uint256) {
        uint256[] memory poolAmounts = getPoolAmounts();
        (uint256[] memory prices, uint8[] memory decimals) = getPrices();
        uint256 value = Formula.dot(poolAmounts, prices, decimals);
        return totalSupply() > 0 ? totalSupply() * PRECISION / value : 1;
    }

    /*
     *@dev query Pool Asset Amounts
     */
    function getPoolAmounts() public view returns (uint256[] memory) {
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = IERC20(SavingsDaiMarket.sDAI).balanceOf(address(this));
        amounts[1] = IERC20(StEthMarket.stETH).balanceOf(address(this));
        return amounts;
    }

    function _depositSavingDai(address token, uint256 amount, ICindexSwap.SwapData[] memory swapdata) internal returns (uint256) {
        if (amount == 0) {
            return 0;
        }
        // 调仓
        if (token == DAI) {
            //如何存的是DAI,amount0的币数量是不需要swap的
            return SavingsDaiMarket.deposit(amount, address(this));
        } else {
            uint256 beforeAmount = IERC20(DAI).balanceOf(address(this));
            // 非DAI,需进行两次swap，将部分tokenIn换为DAI，存入sDAI,再将另一部分tokenIn,换成ETH，存入stETH,意味着需要进行两次swap操作
            TransferHelper.safeTransferFrom(token, address(this), address(router), amount);
            ICindexSwap.SwapData memory _swapdata = swapdata[0];
            router.swap(token, amount, _swapdata);
            uint256 afterAmount = IERC20(DAI).balanceOf(address(this));

            return SavingsDaiMarket.deposit(afterAmount - beforeAmount, address(this));
        }
    }

    function _depositStEth(address token, uint256 amount, ICindexSwap.SwapData[] memory swapdata) internal returns (uint256) {
        if (amount > 0) {
            return 0;
        }
        uint256 beforeAmount = address(this).balance;
        TransferHelper.safeTransferFrom(token, address(this), address(router), amount);
        ICindexSwap.SwapData memory _swapdata = swapdata[1];
        router.swap(token, amount, _swapdata);
        uint256 afterAmount = address(this).balance;
        return StEthMarket.submit(address(this), afterAmount - beforeAmount);
    }

    function queryAssetValue(address asset, uint256 amount) internal view returns (uint256) {
        AggregatorV3Interface feed = oracles[asset];
        (,int256 price,,,) = feed.latestRoundData();
        uint8 decimals = feed.decimals();
        return uint256(price) * amount / (10 ** decimals);
    }

    function getPrices() public view returns (uint256[] memory, uint8[] memory) {
        uint256[] memory prices = new uint256[](2);
        uint8[] memory decimals = new uint8[](2);
        // query dai oracle price
        AggregatorV3Interface feed1 = oracles[DAI];
        (,int256 price,,,) = feed1.latestRoundData();
        // query dai converter sDai exchange rate
        uint256 exchangeRate = SavingsDaiMarket.exchangeRate();
        prices[0] = uint256(price) * exchangeRate / PRECISION;
        decimals[0] = feed1.decimals();
        
        AggregatorV3Interface feed2 = oracles[STETH];
        (,int256 price2,,,) = feed2.latestRoundData();
        prices[1] = uint256(price2);
        decimals[1] = feed2.decimals();

        return (prices, decimals);
    }

    function getProtocolFeeReserve() public view returns (address) {
        return PROTOCOL_FEE_RESERVE;
    }
    
    function pause() external onlyOwner whenNotPaused {
        _pause();
    }

    function unpause() external onlyOwner whenPaused {
        _unpause();
    }
}