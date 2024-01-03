// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const fs = require("fs");
const {ethers} = require("hardhat");

async function deployVault(supportAssets, assetOracles, protocolFeeReserve, name, symbol) {
    // const CindexSwap = await ethers.getContractFactory("CindexSwap");
    // const cindexSwap = await CindexSwap.deploy();
    // console.log("CindexSwap deployed to:", cindexSwap.target);
    const Vault = await ethers.getContractFactory("Vault");
    // const vault = await Vault.deploy(supportAssets, assetOracles, protocolFeeReserve, cindexSwap.target, name, symbol);
    const vault = await Vault.deploy();
    console.log("Vault deployed to:", vault.target);
    return vault.target;
}

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log('Depolying Contract with the account:', deployer.address);
    console.log('Account Balance:', (await deployer.provider.getBalance(deployer.address)).toString());
    const supportAssets = ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48","0xdAC17F958D2ee523a2206206994597C13D831ec7","0x6B175474E89094C44Da98b954EedeAC495271d0F"];
    const assetOracles = [["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0x986b5E1e1755e3C2440e960477f25201B0a8bbD4"],["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46"],["0x6B175474E89094C44Da98b954EedeAC495271d0F", "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9"],["0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", "0xCfE54B5cD566aB89272946F602D76Ea879CAb4a8"]];
    const protocolFeeReserve = "0x068312c3b5FfD0cA32A45A3ba163A59525895397";
    const vault = await deployVault(supportAssets, assetOracles, protocolFeeReserve, 'ETF', 'ETF');
    console.log('vault:', vault);
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
