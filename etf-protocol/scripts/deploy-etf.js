const {ethers} = require("hardhat");

async function deployToken(name, symbol, decimals) {
    const coin = await ethers.getContractFactory("Token");
    const token = await coin.deploy(name, symbol, decimals);
  
    console.log("Token address:", token.target);

    return token.target;
}

async function main() {

    const [deployer] = await ethers.getSigners();
  
    console.log(
      "Deploying contracts with the account:",
      deployer.address
    );
    
    console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());
    
    const usdc = await deployToken('USDC', 'USDC', 6);
    console.log(`Deploy Token is USDC address: ${usdc}`)
  }
  
main()
.then(() => process.exit(0))
.catch(error => {
    console.error(error);
    process.exit(1);
});