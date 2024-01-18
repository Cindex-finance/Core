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
            runs: 8888
          }
        }
      }
    ]
    
  },
  networks: {
    goerli: {
      url: 'https://eth-goerli.g.alchemy.com/v2/JRV7Xs-TqLcyYoZ2i3XeTfEMyy1MuWhM',
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
