const {ethers} = require('ethers');
const axios = require('axios');
const BigNumber = require('bn.js')
const valutABI = require('../artifacts/contracts/Vault.sol/Vault.json').abi;
const tokenABI = require('../artifacts/contracts/Token.sol/Token.json').abi;
const sDAIABI = require('../artifacts/contracts/markets/SavingsDaiMarket.sol/ISDai.json').abi;
const swapABI = require('../artifacts/contracts/exchange/CindexSwap.sol/CindexSwap.json').abi;
const oracleABI = require('../artifacts/@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol/AggregatorV3Interface.json').abi;
const data = require('../deployments/deployed-contracts-test.json');
const etherseumData = require('../deployments/deployed-contracts-ethereum.json')
require('dotenv').config();
const privateKey = process.env.PRIVATE_KEY;
const apiKey = process.env.ALCHEMY_API_KEY;
const provider = new ethers.JsonRpcProvider(`http://10.9.1.248:7545`);
const wallet = new ethers.Wallet(privateKey, provider);
const provider2 = new ethers.JsonRpcProvider('http://10.9.1.248:7545');

const vault = data.Vault.address;
const valutContract = new ethers.Contract(vault, valutABI, wallet);

//查询用户余额及vault中stETH和sDAI的余额
const balance = async(user) => {
    const usdc = data.USDC.address;
    const usdt = data.USDT.address;
    const dai = data.DAI.address;
    const sDAI = data.sDAI.address;
    const stETH = data.stETH.address;
    const usdcToken = new ethers.Contract(usdc, tokenABI, wallet);
    const usdtToken = new ethers.Contract(usdt, tokenABI, wallet);
    const daiToken = new ethers.Contract(dai, tokenABI, wallet);
    const sDaiToken = new ethers.Contract(sDAI, tokenABI, wallet);
    const stEthToken = new ethers.Contract(stETH, tokenABI, wallet);

    console.log(`user: ${user} USDC balance: ${await usdcToken.balanceOf(user)}`);
    console.log(`user: ${user} USDT balance: ${await usdtToken.balanceOf(user)}`);
    console.log(`user: ${user} DAI balance: ${await daiToken.balanceOf(user)}`);
    console.log(`user: ${vault} sDAI balance: ${await sDaiToken.balanceOf(user)}`);
    console.log(`user: ${vault} stETH balance: ${await stEthToken.balanceOf(user)}`);

    console.log(`vault: ${vault} sDAI balance: ${await sDaiToken.balanceOf(vault)}`);
    console.log(`vault: ${vault} stETH balance: ${await stEthToken.balanceOf(vault)}`);
    
}

//授权
const approve = async() => {
    const usdc = data.USDC.address;
    const usdt = data.USDT.address;
    const dai = data.DAI.address;
    
    const usdcToken = new ethers.Contract(usdc, tokenABI, wallet);
    const usdtToken = new ethers.Contract(usdt, tokenABI, wallet);
    const daiToken = new ethers.Contract(dai, tokenABI, wallet);
    const receipt = await usdcToken.approve(vault, ethers.MaxUint256);
    await receipt.wait();
    console.log(`USDC approve vault: ${vault} tx: ${receipt.hash}`);
    await wait(1000);
    const allowed = await usdtToken.allowance(wallet.address, vault);
    console.log(`allowed: ${allowed}`);
    if (allowed == 0) {
        const receipt2 = await usdtToken.approve(vault, ethers.MaxInt256);
        await receipt2.wait();
        console.log(`USDT approve vault: ${vault} tx: ${receipt2.hash}`);
    }
    await wait(1000);
    const receipt3 = await daiToken.approve(vault, ethers.MaxUint256);
    await receipt3.wait();  
    console.log(`DAI approve vault: ${vault} tx: ${receipt3.hash}`);
}

const oneinchSwap = async(query) => {
    const url = 'https://api.1inch.dev/swap/v5.2/1/swap';
    const response = await axios.get(url, {
        headers: {
            "Authorization": "Bearer U9yP69d3obZnRC3ZPxcXlnDammgnu7Di" // Replace with your actual API key
        },
        params: {
            src: query.src,//"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            dst: query.dst,//"0x6B175474E89094C44Da98b954EedeAC495271d0F",
            amount: query.amount,//100000000,
            from: query.from,//"0xF501D4C73aEe0D88b1cbb72412Fa53f32542459A",
            slippage: 2,
            receiver: query.receiver == undefined ? data.Vault.address : query.receiver,
            // allowPartialFill: true,
            disableEstimate: true,
            includeProtocols: true,
            // protocols: "DEFISWAP,CURVE,UNISWAP_V3"
        }
    })
    console.log("swap data:", response.data.protocols);
    const protocols = response.data?.protocols;
    if (protocols.length > 0) {
        protocols.map(p => console.log("protocol:", p));
    }
    return response.data;
}

const deposit = async(tokenIn, amountIn, referralCode) => {
    var swapData = [];
    //如何tokenIn = USDC,USDT,需求将USDC/USDT拆分出来两个swap,一个转换DAI,一个转换ETH,按95:5转换
    if (tokenIn.toLowerCase() === "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48".toLowerCase() 
    || tokenIn.toLowerCase() === "0xdAC17F958D2ee523a2206206994597C13D831ec7".toLowerCase()) {
        const amount0 = amountIn * 95 / 100;
        const amount1 = amountIn * 5 / 100;
        const res0 = await oneinchSwap({
            src: tokenIn,
            dst: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
            amount: amount0,
            from: data.CindexSwap.address
        });
        swapData.push([res0.tx.to, res0.tx.data, true]);
        await wait(1000);
        const res1 = await oneinchSwap({
            src: tokenIn,
            dst: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
            amount: amount1,
            from: data.CindexSwap.address,
        });
        swapData.push([res1.tx.to, res1.tx.data, true]);
        // console.log("swapData:", swapData);
        console.log(`swapData: ${swapData}`);
    }
    //如何tokenIn = DAI,需求将DAI中一部分swap成ETH
    if (tokenIn.toLowerCase() === "0x6B175474E89094C44Da98b954EedeAC495271d0F".toLowerCase()) {
        const amount1 = amountIn * 5 / 100;
        const res1 = await oneinchSwap({
            src: tokenIn,
            dst: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
            amount: amount1,
            from: data.CindexSwap.address
        });
        swapData.push([res1.tx.to, res1.tx.data, true]);
        // console.log("swapData:", swapData);
        console.log(`swapData: ${swapData}`);
    }
    await wait(2000);
    // const res = await valutContract.getFunction('deposit').staticCall([tokenIn, amountIn, swapData, referralCode], {gas: 2000000, gasPrice: 10000000000});
    // console.log(`res: ${res}`);
    const receipt = await valutContract.deposit([tokenIn, amountIn, swapData, referralCode], {gas: 2000000, gasPrice: 10000000000});
    await receipt.wait();
    console.log(`Deposit tx: ${receipt.hash}`);
}

const swapTosDAI = async(tokenIn, amount) => {
    const token = new ethers.Contract(tokenIn, tokenABI, wallet);
    const receipt2 = await token.transfer(data.Vault.address, amount);
    await receipt2.wait();
    await wait(1000);
    var swapData = [];
    const res1 = await oneinchSwap({
        src: tokenIn,
        dst: data.DAI.address,
        amount: amount,
        from: data.CindexSwap.address
    });
    swapData.push([res1.tx.to, res1.tx.data, true]);
    // console.log("swapData:", swapData);
    console.log(`swapData: ${swapData}`);
    const receipt = await valutContract._depositSavingDai(tokenIn, amount, swapData, {gas: 2000000, gasPrice: 10000000000});
    await receipt.wait();
    console.log(`swapTosDAI tx: ${receipt.hash}`);
}

const swapTostETH = async(tokenIn, amount) => {
    const token = new ethers.Contract(tokenIn, tokenABI, wallet);
    const receipt2 = await token.transfer(data.Vault.address, amount);
    await receipt2.wait();
    await wait(1000);
    var swapData = [];
    const res1 = await oneinchSwap({
        src: tokenIn,
        dst: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        amount: amount,
        from: data.CindexSwap.address
    });
    swapData.push([res1.tx.to, res1.tx.data, true]);
    swapData.push([res1.tx.to, res1.tx.data, true]);
    // console.log("swapData:", swapData);
    console.log(`swapData: ${swapData}`);
    const res = await valutContract.getFunction('_depositStEth').staticCall(tokenIn, amount, swapData, {gas: 2000000, gasPrice: 10000000000});
    console.log(`res: ${res}`);
    // const receipt = await valutContract._depositStEth(tokenIn, amount, swapData, {gas: 2000000, gasPrice: 10000000000});
    // await receipt.wait();
    // console.log(`swapTosDAI tx: ${receipt.hash}`);
}

const swap = async(tokenIn, amount) => {
    const token = new ethers.Contract(tokenIn, tokenABI, wallet);
    const receipt2 = await token.transfer(data.CindexSwap.address, amount);
    await receipt2.wait();
    await wait(1000);
    const res1 = await oneinchSwap({
        src: tokenIn,
        dst: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        amount: amount,
        from: data.CindexSwap.address
    });
    const swapContract = new ethers.Contract(data.CindexSwap.address, swapABI, wallet);
    console.log(res1.tx.to, res1.tx.data);
    const res = await swapContract.getFunction('swap').staticCall(tokenIn, amount, [res1.tx.to, res1.tx.data, true], {gas: 2000000, gasPrice: 10000000000});
    console.log(`res: ${res}`);
}

const wait = async(ms) => {
    return new Promise(resolve => setTimeout(() =>resolve(), ms));
}
const userBalance = async(user) => {
    const balance = await valutContract.balanceOf(user);
    console.log(`用户余额: ${balance}`);
}

const prices = async() => {
    const price = await valutContract.getPrices();
    console.log(`prices: ${price}`);
}

const withdraw = async(share, tokenOut) => {
    //总的份额
    const total = await valutContract.totalSupply();
    const amounts = await valutContract.getPoolAmounts();
    console.log(`total: ${total} amounts: ${amounts}`);
    const amount0 = new BigNumber(ethers.getBigInt(amounts[0]).toString()).mul(new BigNumber(share)).div(new BigNumber(ethers.getBigInt(total).toString()));
    const amount1 = new BigNumber(ethers.getBigInt(amounts[1]).toString()).mul(new BigNumber(share)).div(new BigNumber(ethers.getBigInt(total).toString()));
    console.log(`amount0: ${amount0} amount1: ${amount1}`);
    const sDAIContract = new ethers.Contract(data.sDAI.address, sDAIABI, wallet);
    //预估得到DAI数量
    const amount = await sDAIContract.convertToAssets(amount0.toString());
    console.log(`amount: ${amount}`);
    //如何提取的币是DAI，只需要swap一次
    var swapData = []
    if (tokenOut.toLowerCase() == data.DAI.address.toLowerCase()) {
        //stETH转换成目标币tokenOut
        const res1 = await oneinchSwap({
            src: data.stETH.address,
            dst: tokenOut,
            amount: amount1.toString(),
            from: data.CindexSwap.address,
            receiver: wallet.address
        });
        swapData.push([res1.tx.to, res1.tx.data, true]);
    } else {
        //DAI转换成目标币tokenOut
        const res0 = await oneinchSwap({
            src: data.DAI.address,
            dst: tokenOut,
            amount: amount,
            from: data.CindexSwap.address,
            receiver: wallet.address
        });
        swapData.push([res0.tx.to, res0.tx.data, true]);
        await wait(2000);
        //stETH转换成目标币tokenOut
        const res1 = await oneinchSwap({
            src: data.stETH.address,
            dst: tokenOut,
            amount: amount1.toString(),
            from: data.CindexSwap.address,
            receiver: wallet.address
        });
        swapData.push([res1.tx.to, res1.tx.data, true]);
    }
    await wait(1000);
    const res = await valutContract.getFunction('withdraw').staticCall([share, tokenOut, swapData], {gas: 2000000, gasPrice: 10000000000});
    console.log(`res: ${res}`);
    const receipt = await valutContract.withdraw([share, tokenOut, swapData], {gas: 2000000, gasPrice: 10000000000});
    await receipt.wait();
    console.log(`Withdraw tx: ${receipt.hash}`);

}
const Trans = async() => {
    await balance(wallet.address);
    // await balance(data.CindexSwap.address)
    // await prices();
    // await approve();
    const totalSupply = await valutContract.totalSupply();
    console.log(`totalSupply: ${totalSupply} sharePrePrice: ${await valutContract.sharePrePrice()}`)
    // await swapTosDAI(data.USDC.address, 10000000);
    // await swapTostETH(data.USDC.address, 10000000);
    // await swap(data.USDT.address, 10000000);
    // await oneinchSwap();
    // await deposit(data.USDT.address, 10000000, 'code');
    // await deposit(data.DAI.address, "10000000000000000000", 'code');
    // await userBalance(wallet.address);
    await withdraw("9935066353364787954", data.DAI.address);
    // await balance(wallet.address);
    // console.log(await provider.getTransactionReceipt('0x101fb5710ec2cd240a30094216b895f46cc878aa866ce5ae569b22e2fe3bd630'));
}
Trans().then(() => process.exit(0)).catch((error) => {
    console.error(error);
    process.exit(1);
});