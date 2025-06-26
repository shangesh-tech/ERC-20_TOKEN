const hre = require("hardhat");

async function main() {
    console.log("Deploying Shangesh token contract...");

    // Deploy Shangesh token with cap of 10,000,000 tokens and block reward of 50 tokens
    const tokenCap = 10000000; // 10 million tokens
    const blockReward = 50;     // 50 tokens reward per block

    const Shangesh = await hre.ethers.getContractFactory("Shangesh");
    const shangeshToken = await Shangesh.deploy(tokenCap, blockReward);

    await shangeshToken.waitForDeployment();
    const tokenAddress = await shangeshToken.getAddress();

    console.log("Shangesh token deployed to:", tokenAddress);

    // Deploy Faucet contract with the token address
    console.log("Deploying Faucet contract...");

    const Faucet = await hre.ethers.getContractFactory("Faucet");
    const faucet = await Faucet.deploy(tokenAddress);

    await faucet.waitForDeployment();
    const faucetAddress = await faucet.getAddress();

    console.log("Faucet deployed to:", faucetAddress);

    // Fund the faucet with some tokens (optional)
    console.log("Funding the faucet with tokens...");

    // Get the deployer's address
    const [deployer] = await hre.ethers.getSigners();

    // Transfer 100,000 tokens to the faucet
    const fundAmount = hre.ethers.parseEther("100000");
    await shangeshToken.transfer(faucetAddress, fundAmount);

    console.log(`Sent 100,000 SHAN tokens to the faucet`);

    // Display summary
    console.log("\nDeployment Summary:");
    console.log("-------------------");
    console.log("Shangesh Token:", tokenAddress);
    console.log("Faucet:", faucetAddress);
    console.log("Owner:", deployer.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });