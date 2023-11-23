require("@nomicfoundation/hardhat-toolbox");
require("hardhat-contract-sizer");
require("@nomicfoundation/hardhat-verify");
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
    },
    test: {
      url: 'http://10.9.1.248:7545',
      accounts: mnemonic()
    }
  },
  etherscan: {
    apiKey: {
      goerli: "FGNQSRF5IFKBN2ZDWDQ76M3U8DJAG785Y9"
    },
    customChains: [
      {
        network: "goerli",
        chainId: 5,
        urls: {
          apiURL: "https://api-goerli.etherscan.io/api",
          browserURL: "https://goerli.etherscan.io"
        }
      }
    ]
  }
};
