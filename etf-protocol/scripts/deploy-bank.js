// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const {ethers} = require("hardhat");

async function deployBank(assets, oracles, currentRatios, name, symbol) {
    const Bank = await ethers.getContractFactory("Bank");
    const bank = await Bank.deploy(assets, oracles, currentRatios, name, symbol);
    console.log("Bank deployed to:", bank.target);
    return bank.target;
}

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log('Depolying Contract with the account:', deployer.address);
    console.log('Account Balance:', (await deployer.provider.getBalance(deployer.address)).toString());
    const assets = ["0xb1f2c8bf9F3AdCb3e049B25e5A6B75941B47555F","0xfE2B4a523Ec39f0aFC377811CBDE1B0B2DBeedd5","0xA3013489E6C510ef478c33bB5188D126c3F9dA9B","0xaC5B5067d200Bbe9e89Da3aD3c5cd7d376978b79","0xFDDB70602de559a1680119Fd232f5133AAA65a25"];
    const oracles = ["0xe3eC562e6794a87110052cc29eB8A63B8e5f93EB","0xD88447CcC952eC4f186dc0b629843b1A75a17E4E","0x927C2886fBe3a1ded4f6030e86C7954f56D82D25","0x0487C6F6a1Dd69AcACdcAE5Ae1AfFFB37a711dAA","0xD1f5B286E432C7490715a602F29E6fead58BF87F"];
    const initRatio = ["1000000000000000000","666666666666666667","666666666666666667","666666666666666667","7000000000000000000"];
    const bank = await deployBank(assets, oracles, initRatio, 'ETF', 'ETF');
    console.log('bank:', bank);
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
