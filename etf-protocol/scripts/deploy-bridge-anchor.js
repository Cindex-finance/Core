// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const fs = require("fs");
const {ethers} = require("hardhat");
const ANCHOR_ABI = require("../abi/anchor.json");

async function updateRemoteAnchor(anchor, remoteanchor, id, sender) {
    const anchorC = await ethers.getContractAt(ANCHOR_ABI, anchor);
    const currentConsumer = await anchorC.consumer()
    console.log(`The current consumer: ${currentConsumer}`)
    const anchorManager = await anchorC.manager()
    if (sender.toLowerCase() !== anchorManager.toLowerCase()) {
        console.log(
            `ERROR: The Manager of Anchor is not the sender: \nExpected: ${anchorManager} \nGot: ${sender.address}`
        )
    } else {
        console.log("Updating the remote anchors...")
        const txResponse = await anchorC.batchUpdateRemoteAnchors([id], [remoteanchor])
        await txResponse.wait(6)
        console.log(`Transaction hash: ${txResponse.hash}`)
    }
}



async function main() {
    const [deployer] = await ethers.getSigners();
    console.log('Depolying Contract with the account:', deployer.address);
    console.log('Account Balance:', (await deployer.provider.getBalance(deployer.address)).toString());
    // const anchor = "0x0504aa0b3127fbe54386f1caf1e3ec8d61b90f9c";
    // const remoteanchor = "0x00000000000000000000000086f4a1fb7f64c8f5427c4a08fc8314ec5a7d1711";//0x0000000000000000000000007eb25a4ab45e29c9306a1987c664111bf7ebd002
    // const id = 5;
    const anchor = "0x022a69e5f560362f60dd3042296118510b9fca1b";//0xc51adfa2bf27c978f36af1205bf6294c4af2cbec2b4cad1fccee2621f28440b7
    const remoteanchor = "0xc51adfa2bf27c978f36af1205bf6294c4af2cbec2b4cad1fccee2621f28440b7";
    const id = "2591988700";

    await updateRemoteAnchor(anchor, remoteanchor, id, deployer.address);
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});
