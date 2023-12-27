const {ethers} = require('ethers');
const BigNumber = require('bn.js')
const bankBridgeABI = require('../artifacts/contracts/bridge/token-bridge/StandardTokenBridge.sol/StandardTokenBridge.json').abi;
const tokenABI = require('../artifacts/contracts/Token.sol/Token.json').abi;
require('dotenv').config();
const privateKey = process.env.PRIVATE_KEY;
const apiKey = process.env.ALCHEMY_API_KEY;
const provider = new ethers.JsonRpcProvider(`https://eth-goerli.alchemyapi.io/v2/${apiKey}`);
const wallet = new ethers.Wallet(privateKey, provider);

const tokenBridge = '0xC66a2cAF21e31D335B05569Ac39526bCB5894b97';
const tokenBridgeContract = new ethers.Contract(tokenBridge, bankBridgeABI, wallet);

const bridgeOut = async() => {
    const receipt = await tokenBridgeContract.bridgeOut("2591988700", "1000000000000000000", "0x07a7ba97fa6122a653213049842193e1ae59c0b3f330cfaf6c464f4c3aca3bcb");
    await receipt.wait();
    console.log("Transaction hash:", receipt.hash);
}

const approve = async(token, amount) => {
    
    const tokenContract = new ethers.Contract(token, tokenABI, wallet);
    const approveTx = await tokenContract.approve(tokenBridge, amount);
    await approveTx.wait();
    console.log("Transaction hash:", approveTx.hash);
}

const Trans = async() => {
    await approve("0xbA9f53Ba9aDa5FaEc27f53da83e09A5a684beD78", "100000000000000000000")
    await bridgeOut();
}

Trans().then(() => process.exit(0)).catch((error) => {
    console.error(error);
    process.exit(1);
});
