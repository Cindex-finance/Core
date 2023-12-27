// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const fs = require("fs");
const {ethers} = require("hardhat");
const ANCHOR_ABI = require("../abi/anchor.json");

async function updateConsumer(anchor, consumer, sender) {
    const anchorC = await ethers.getContractAt(ANCHOR_ABI, anchor);
    const currentConsumer = await anchorC.consumer()
    console.log(`The current consumer: ${currentConsumer}`)
    const anchorManager = await anchorC.manager()
    if (sender.toLowerCase() !== anchorManager.toLowerCase()) {
        console.log(
            `ERROR: The Manager of Anchor is not the sender: \nExpected: ${anchorManager} \nGot: ${sender.address}`
        )
    } else {
        console.log("Updating the consumer...")
        const txResponse = await anchorC.updateConsumer(consumer)
        console.log(`Transaction hash: ${txResponse.hash}`)
        await txResponse.wait(6)
        console.log(`The new consumer: ${await anchorC.consumer()}`)
    }
}



async function main() {
    const [deployer] = await ethers.getSigners();
    console.log('Depolying Contract with the account:', deployer.address);
    console.log('Account Balance:', (await deployer.provider.getBalance(deployer.address)).toString());
    // const anchor = "0x0504aa0b3127fbe54386f1caf1e3ec8d61b90f9c";
    // const consumer = "0xa860330B5a327Ab10e9a104C909bbdC5A5568Db9";

    const anchor = "0x022a69e5f560362f60dd3042296118510b9fca1b";
    const consumer = "0xC66a2cAF21e31D335B05569Ac39526bCB5894b97";

    await updateConsumer(anchor, consumer, deployer.address);
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
