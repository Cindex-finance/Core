require("@nomicfoundation/hardhat-toolbox");
require("hardhat-contract-sizer");
require('dotenv').config();

function mnemonic() {
  return [process.env.PRIVATE_KEY];
}


/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers:[
      {
        version: "0.8.18",
        settings: {
          optimizer: {
            enabled: true,
            runs: 2000
          }
        }
      }
    ]
    
  },
  networks: {
    goerli: {
      url: `https://eth-goerli.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: mnemonic()
    },
    bscTest: {
      url: 'https://bsc-testnet.public.blastapi.io',
      accounts: mnemonic()
    }
  }
};
