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
    console.log(`CindexSwap: ${data.CindexSwap.address} stETH balance: ${await stEthToken.balanceOf(data.CindexSwap.address)}`);
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
    var protocol;
    var token = query.src;
    if (token.toLowerCase() == data.stETH.address.toLowerCase()){
        protocol = "CURVE,SUSHI,CURVE_V2_SPELL_2_ASSET,CURVE_V2_SGT_2_ASSET,CURVE_V2_THRESHOLDNETWORK_2_ASSET,DODO_V2,SAKESWAP,CURVE_V2,CURVE_V2_EURS_2_ASSET,CURVE_3CRV,MOONISWAP,BALANCER,BALANCER_V2"
    }
    const response = await axios.get(url, {
        headers: {
            "Authorization": "Bearer U9yP69d3obZnRC3ZPxcXlnDammgnu7Di" // Replace with your actual API key
        },
        params: {
            src: query.src,//"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            dst: query.dst,//"0x6B175474E89094C44Da98b954EedeAC495271d0F",
            amount: query.amount,//100000000,
            from: query.from,//"0xF501D4C73aEe0D88b1cbb72412Fa53f32542459A",
            slippage: 5,
            receiver: query.receiver,
            // allowPartialFill: true,
            disableEstimate: true,
            includeProtocols: true,
            protocols: protocol
        }
    })
    console.log("swap data:", response.data);
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
            from: data.CindexSwap.address,
            receiver: data.Vault.address,
        });
        swapData.push([res0.tx.to, res0.tx.data, true]);
        await wait(1000);
        const res1 = await oneinchSwap({
            src: tokenIn,
            dst: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
            amount: amount1,
            from: data.CindexSwap.address,
            receiver: data.Vault.address,
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
            from: data.CindexSwap.address,
            receiver: data.Vault.address,
        });
        swapData.push([res1.tx.to, res1.tx.data, true]);
        // console.log("swapData:", swapData);
        console.log(`swapData: ${swapData}`);
    }
    await wait(1000);
    const res = await valutContract.getFunction('deposit').staticCall([tokenIn, amountIn, swapData, referralCode], {gas: 2000000, gasPrice: 10000000000});
    console.log(`res: ${res}`);
    const receipt = await valutContract.deposit([tokenIn, amountIn, swapData, referralCode], {gas: 1000000000, gasPrice: 5000000000000});
    await receipt.wait();
    console.log(`Deposit tx: ${receipt.hash}`);
    return receipt.hash;
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
        from: data.CindexSwap.address,
        receiver: data.Vault.address,
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
        from: data.CindexSwap.address,
        receiver: data.Vault.address,
    });
    swapData.push([res1.tx.to, res1.tx.data, true]);
    swapData.push([res1.tx.to, res1.tx.data, true]);
    // console.log("swapData:", swapData);
    console.log(`swapData: ${swapData}`);
    const res = await valutContract.getFunction('_depositStEth').staticCall(tokenIn, amount, swapData, {gas: 2000000, gasPrice: 10000000000});
    console.log(`res: ${res}`);
    const receipt = await valutContract._depositStEth(tokenIn, amount, swapData, {gas: 2000000, gasPrice: 10000000000});
    await receipt.wait();
    console.log(`swapTosDAI tx: ${receipt.hash}`);
}

const swap = async(tokenIn, tokenOut, amount, from, receiver) => {
    const token = new ethers.Contract(tokenIn, tokenABI, wallet);
    // const receipt2 = await token.transfer(data.CindexSwap.address, amount);
    // await receipt2.wait();
    // await wait(1000);
    // const newAmount = await token.balanceOf(data.CindexSwap.address);
    // console.log(`amount: ${amount} newAmount: ${newAmount}`);
    const newAmount = amount;
    const res1 = await oneinchSwap({
        src: tokenIn,
        dst: tokenOut,
        amount: newAmount,
        from: from,
        receiver: receiver,
    });
    const swapContract = new ethers.Contract(data.CindexSwap.address, swapABI, wallet);
    console.log(res1.tx.to, res1.tx.data);
    const res = await swapContract.getFunction('swap').staticCall(tokenIn, newAmount, [res1.tx.to, res1.tx.data, true], {gas: 2000000, gasPrice: 10000000000});
    console.log(`res: ${res}`);
    // const receipt = await swapContract.swap(tokenIn, amount, [res1.tx.to, res1.tx.data, true], {gas: 2000000, gasPrice: 10000000000});
    // await receipt.wait();
    // console.log(`swapTosDAI tx: ${receipt.hash}`);
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

const write = async() => {
    const stEthToken = new ethers.Contract(data.stETH.address, tokenABI, wallet);
    const receipt = await stEthToken.approve("0x1111111254eeb25477b68fb85ed929f73a960582", "1000000000000000000000000");
    await receipt.wait();
    await wait(1000);
    const transaction = {
        from: "0x068312c3b5FfD0cA32A45A3ba163A59525895397",
        to: "0x1111111254eeb25477b68fb85ed929f73a960582",
        data: '0xbc80f1a80000000000000000000000003978d026fcaa577b80c74f95733ef53b61e009d60000000000000000000000000000000000000000000000000000e3de455a6612000000000000000000000000000000000000000000000000000000000007bada000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000018000000000000000000000006c83b0feef04139eb5520b1ce0e78069c6e7e2c58b1ccac8'
        // data: data
    }
    var res = await provider.call(
        transaction
    );
    console.log('res:', res)

    // const res2 = inface.decodeFunctionResult('balanceOf', res)
    // console.log(`res2: ${res2}`)
}

const Trans = async() => {
    await balance(wallet.address);
    // await balance("0x068312c3b5FfD0cA32A45A3ba163A59525895397")
    await prices();
    // await approve();
    const totalSupply = await valutContract.totalSupply();
    console.log(`totalSupply: ${totalSupply} sharePrePrice: ${await valutContract.sharePrePrice()} poolAmounts: ${await valutContract.getPoolAmounts()}`)
    // await swapTosDAI(data.USDT.address, 10000000);
    // await swapTostETH(data.USDT.address, 10000000);
    // await swap(data.stETH.address, data.DAI.address, "287323375483911", data.CindexSwap.address, wallet.address);
    // await oneinchSwap();
    // await deposit(data.USDC.address, '11759260', 'code');
    // await deposit(data.DAI.address, "100000000000000000000", 'cindex');
    // await userBalance(wallet.address);
    // await withdraw("117928754471966798594", data.DAI.address);
    // await balance(wallet.address);
    // await write();
    //0xbc1ebded6c14c80c226bdb2f03b6405e1744dbc3342a79ad85ed5d8eb544a9f9
    // console.log(await provider.getTransactionReceipt('0xceb4eb463363384d28a85343f28cd9c9c5707dba06a59420cad8e91e8fee031a'));
    // console.log(await provider.getLogs({blockHash:"0x1fd579f9a38fd64860c8dcfd9b3c9da84d81917565f0f76f01a2d7305018ca06"}));
}
Trans().then(() => process.exit(0)).catch((error) => {
    console.error(error);
    process.exit(1);
});