const {ethers} = require('ethers');
const BigNumber = require('bn.js')
const bankABI = require('../artifacts/contracts/Bank.sol/Bank.json').abi;
const tokenABI = require('../artifacts/contracts/Token.sol/Token.json').abi;
const oracleABI = require('../artifacts/@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol/AggregatorV3Interface.json').abi;
const data = require('../deployments/deployed-contracts-goerli.json');
const etherseumData = require('../deployments/deployed-contracts-ethereum.json')
require('dotenv').config();
const privateKey = process.env.PRIVATE_KEY;
const apiKey = process.env.ALCHEMY_API_KEY;
const provider = new ethers.JsonRpcProvider(`https://eth-goerli.alchemyapi.io/v2/${apiKey}`);
const wallet = new ethers.Wallet(privateKey, provider);
const provider2 = new ethers.JsonRpcProvider('https://eth-mainnet.g.alchemy.com/v2/j_TSwVEuEBo2Hw1qZ7f6WK8CauPDs2Hs');

const bank = data.Bank.address;
const bankContract = new ethers.Contract(bank, bankABI, wallet);

const updatePrice = async() => {
    const ABI = [{
		"inputs": [
			{
				"internalType": "int256",
				"name": "_answer",
				"type": "int256"
			}
		],
		"name": "updateAnswer",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}];
    const stETHOracle = new ethers.Contract(etherseumData.stETH.oracle, oracleABI, provider2);
    const maticOracle = new ethers.Contract(etherseumData.MATIC.oracle, oracleABI, provider2);
    const aaveOracle = new ethers.Contract(etherseumData.AAVE.oracle, oracleABI, provider2);
    const uniOracle = new ethers.Contract(etherseumData.UNI.oracle, oracleABI, provider2);
    const linkOracle = new ethers.Contract(etherseumData.LINK.oracle, oracleABI, provider2);
    const stETHPrice = (await stETHOracle.latestRoundData())[1];
    console.log(`stETHPrice: ${stETHPrice}`);
    const maticPrice = (await maticOracle.latestRoundData())[1];
    console.log(`maticPrice: ${maticPrice}`);
    const aavePrice = (await aaveOracle.latestRoundData())[1];
    console.log(`aavePrice: ${aavePrice}`);
    const uniPrice = (await uniOracle.latestRoundData())[1];
    console.log(`uniPrice: ${uniPrice}`);
    const linkPrice = (await linkOracle.latestRoundData())[1];
    console.log(`linkPrice: ${linkPrice}`);
    const stETHOracle2 = new ethers.Contract(data.stETH.oracle, ABI, wallet);
    const stETHReceipt = await stETHOracle2.updateAnswer(stETHPrice);
    await stETHReceipt.wait();
    console.log(`stETH update price tx: ${stETHReceipt.hash}`)
    const maticOracle2 = new ethers.Contract(data.MATIC.oracle, ABI, wallet);
    const maticReceipt = await maticOracle2.updateAnswer(maticPrice);
    await maticReceipt.wait();
    console.log(`Matic update price tx: ${maticReceipt.hash}`)
    const aaveOracle2 = new ethers.Contract(data.AAVE.oracle, ABI, wallet);
    const aaveReceipt = await aaveOracle2.updateAnswer(aavePrice);
    await aaveReceipt.wait();
    console.log(`AAVE update price tx: ${aaveReceipt.hash}`);
    const uniOracle2 = new ethers.Contract(data.UNI.oracle, ABI, wallet);
    const uniReceipt = await uniOracle2.updateAnswer(uniPrice);
    await uniReceipt.wait();
    console.log(`UNI update price tx: ${uniReceipt.hash}`);
    const linkOracle2 = new ethers.Contract(data.LINK.oracle, ABI, wallet);
    const linkReceipt = await linkOracle2.updateAnswer(linkPrice);
    await linkReceipt.wait();
    console.log(`Link update price tx: ${linkReceipt.hash}`);

}


const approve = async(bank) => {
    const stETH = data.stETH.address;
    const matic = data.MATIC.address;
    const aave = data.AAVE.address;
    const uni = data.UNI.address;
    const link = data.LINK.address;
    const stETHToken = new ethers.Contract(stETH, tokenABI, wallet);
    const maticToken = new ethers.Contract(matic, tokenABI, wallet);
    const aaveToken = new ethers.Contract(aave, tokenABI, wallet);
    const uniToken = new ethers.Contract(uni, tokenABI, wallet);
    const linkToken = new ethers.Contract(link, tokenABI, wallet);
    const receipt = await stETHToken.approve(bank, ethers.MaxUint256);
    await receipt.wait();
    console.log(`stETH approve bank: ${bank} tx: ${receipt.hash}`);
    const receipt2 = await maticToken.approve(bank, ethers.MaxUint256);
    await receipt2.wait();
    console.log(`matic approve bank: ${bank} tx: ${receipt2.hash}`);
    const receipt3 = await aaveToken.approve(bank, ethers.MaxUint256);
    await receipt3.wait();  
    console.log(`aave approve bank: ${bank} tx: ${receipt3.hash}`);
    const receipt4 = await uniToken.approve(bank, ethers.MaxUint256);
    await receipt4.wait();
    console.log(`uni approve bank: ${bank} tx: ${receipt4.hash}`);
    const receipt5 = await linkToken.approve(bank, ethers.MaxUint256);
    await receipt5.wait();
    console.log(`link approve bank: ${bank} tx: ${receipt5.hash}`);
}

const queryMaxGapCoin = async() => {
    const gap = await bankContract.queryMaxGapCoin();
    console.log(`gap: ${gap}`);
    return gap;
}

const calIncreaseCoins = async(gap, amount) => {
    const increaseCoins = await bankContract.calIncreaseCoins(gap[0], gap[1], amount);
    console.log(`increaseCoins: ${increaseCoins}`);
    return increaseCoins;
}

const deposit = async(gap, amount) => {
    const receipt = await bankContract.deposit(gap[0], gap[1], amount);
    await receipt.wait();
    console.log(`deposit: ${amount} tx: ${receipt.hash}`);
}

const withdraw = async(amount) => {
    const receipt = await bankContract.withdraw(amount);
    await receipt.wait();
    console.log(`withdraw: ${amount} tx: ${receipt.hash}`);
}

const adjustTargetRatios = async(targetRatios) => {
    const receipt = await bankContract.adjustTargetRatios(targetRatios);
    await receipt.wait();
    console.log(`adjustTargetRatios: ${targetRatios} tx: ${receipt.hash}`); 
}

const getPoolAmounts = async() => {
    const amounts = await bankContract.getPoolAmounts();
    console.log(`amounts: ${amounts}`);
}

const calDecreaseCoins = async(amount) => {
    const decreaseCoins = await bankContract.calDecreaseCoins(amount);
    console.log(`decreaseCoins: ${decreaseCoins}`);
    return decreaseCoins;
}

const getPrices = async() => {
    const prices = await bankContract.getPrices();
    console.log(`prices: ${prices}`);
    return prices;
}

const totalSupply = async() => {
    const totalSupply = await bankContract.totalSupply();
    console.log(`totalSupply: ${totalSupply}`);
    return totalSupply;
}

const totalValue = async() => {
    const supply = await totalSupply();
    const amounts = (await calDecreaseCoins(supply))[1];
    const prices = await getPrices();
    var total = new BigNumber(0);
    for(var i=0;i<5;i++) {
        total = total.add(new BigNumber(amounts[i])
        .mul(new BigNumber(prices[0][i]))
        .div(new BigNumber(10 ** parseInt(prices[1][i]))));
    }
    console.log(`totalValue: ${total}`)
    return total;
}

const calDeltaAmounts = async() => {
    const amounts = await bankContract.calDeltaAmounts();
    console.log(`amounts: ${amounts}`)
    return amounts;
}

const calValue = async(amounts, prices) => {
    const totalVal = await totalValue();
    var total = new BigNumber(0);
    for(var i=0;i<5;i++) {
        total = total.add(new BigNumber(amounts[i])
        .mul(new BigNumber(prices[0][i]))
        .div(new BigNumber(10 ** parseInt(prices[1][i]))));
    }
    console.log(`total: ${total} ${total/totalVal}`);
}

const Trans = async() => {
    // await approve(bank);
    const gap = await queryMaxGapCoin();
    const amounts = await calIncreaseCoins(gap, ethers.parseEther("100"));
    // const prices = await getPrices();
    // var total = new BigNumber(0);
    // const amt = amounts[gap[0]];
    // for(var i=0;i<5;i++) {
        
    //     total = total.add(new BigNumber(amounts[i]).mul(new BigNumber(10))
    //     .mul(new BigNumber(prices[0][i])).mul(new BigNumber("1000000000000000000"))
    //     .div(new BigNumber(10 ** parseInt(prices[1][i]))).div(new BigNumber(amt)));
    // }
    // console.log(`total: ${total.toString()}`)
    // await deposit(gap, ethers.parseEther("7"));
    // await totalSupply();
    // await getPoolAmounts();
    // await calDecreaseCoins("26894243556771813000000");
    // await withdraw("26894243556771813000000");
    // await updatePrice();
    // await adjustTargetRatios([80,300,400,600,600]);
    // const deltaAmounts = await calDeltaAmounts();
    // await calValue(deltaAmounts, prices);
    // await totalValue();
}
Trans().then(() => process.exit(0)).catch((error) => {
    console.error(error);
    process.exit(1);
});
