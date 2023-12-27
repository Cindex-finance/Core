// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const fs = require("fs");
const {ethers} = require("hardhat");

async function deployTokenBridge(anchor, decimals, name, symbol) {
    const TokenBridge = await ethers.getContractFactory("TokenBridge");
    const tokenBridge = await TokenBridge.deploy(decimals, name, symbol, ethers.parseUnits("1000000", decimals), anchor);
    // const vault = await Vault.deploy();
    console.log("TokenBridge deployed to:", tokenBridge.target);
    return tokenBridge.target;
}

async function deployToken() {
    const Token = await ethers.getContractFactory('Token');
    const token = await Token.deploy("DeFi Treasury Bill Enhancement", "TBE", 18);
    console.log("Token deployed to:", token.target);
    return token.target;
}

async function deployStandardTokenBridge(anchor, token) {
    const StardardTokenBridge = await ethers.getContractFactory('StandardTokenBridge');
    const stardardTokenBridge = await StardardTokenBridge.deploy(true, anchor);
    console.log("StandardTokenBridge deployed to:", stardardTokenBridge.target);
    // const receipt = await stardardTokenBridge.initialize(token);
    // await receipt.wait(6)
    // console.log(`Transaction hash: ${receipt.hash}`);
}

async function standardTokenInitialize(stardardToken, token) {
    const stardardTokenBridge = await ethers.getContractAt("StandardTokenBridge", stardardToken);
    const receipt = await stardardTokenBridge.initialize(token);
    await receipt.wait(10)
    console.log(`Transaction hash: ${receipt.hash}`);
}

async function tokenBridgeDeposit(bridge, id, amount, sender){
    const tokenBridgeC = await ethers.getContractAt("TokenBridge", bridge)

    const dstRecipient = ethers.zeroPadValue(sender.address, 32)
    console.log(`dstRecipient: ${dstRecipient}`);
    const crossFee = await tokenBridgeC.calculateFee(id, amount, dstRecipient)

    console.log(
        `Depositing ${ethers.formatUnits(
            amount,
            await tokenBridgeC.decimals()
        )} ${await tokenBridgeC.symbol()} to chain ${id}`
    )
    const txResponse = await tokenBridgeC.deposit(id, sender.address, amount, dstRecipient, {
        value: crossFee,
    })
    await txResponse.wait(6)
    console.log(`Transaction hash: ${txResponse.hash}`)
}
async function main() {
    const [deployer] = await ethers.getSigners();
    console.log('Depolying Contract with the account:', deployer.address);
    console.log('Account Balance:', (await deployer.provider.getBalance(deployer.address)).toString());
    // const tokenBridge = await deployTokenBridge('0x0504aa0b3127fbe54386f1caf1e3ec8d61b90f9c', 9, 'BoolTestToken', 'BTT');
    // const tokenBridge = await deployTokenBridge('0x86f4a1fb7f64c8f5427c4a08fc8314ec5a7d1711', 9, 'BoolTestToken', 'BTT');
    // console.log('tokenBridge:', tokenBridge);
    // const bridge = "0xa860330B5a327Ab10e9a104C909bbdC5A5568Db9";
    // const amount = "1000000000";
    // const id = 5;
    // await tokenBridgeDeposit(bridge, id, amount, deployer)
    // const token = await deployToken();
    // const anchor = '0x022a69e5f560362f60dd3042296118510b9fca1b';
    // await deployStandardTokenBridge(anchor, token);
    const stardardToken = '0xC66a2cAF21e31D335B05569Ac39526bCB5894b97';
    const token = '0xbA9f53Ba9aDa5FaEc27f53da83e09A5a684beD78';
    await standardTokenInitialize(stardardToken, token);
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
