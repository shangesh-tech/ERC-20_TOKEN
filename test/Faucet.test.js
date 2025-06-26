const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Faucet Contract", function () {
    // Global variables
    let Faucet;
    let faucet;
    let Token;
    let token;
    let owner;
    let user1;
    let user2;
    let initialFaucetBalance = 10000; // 10,000 tokens

    beforeEach(async function () {
        // Get contract factories
        Token = await ethers.getContractFactory("Shangesh");
        Faucet = await ethers.getContractFactory("Faucet");

        // Get signers
        [owner, user1, user2] = await ethers.getSigners();

        // Deploy token with cap and block reward
        token = await Token.deploy(100000000, 50);
        await token.waitForDeployment();

        // Deploy faucet with token address
        faucet = await Faucet.deploy(await token.getAddress());
        await faucet.waitForDeployment();

        // Transfer tokens to faucet
        await token.transfer(await faucet.getAddress(), ethers.parseEther(initialFaucetBalance.toString()));
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await faucet.owner()).to.equal(owner.address);
        });

        it("Should set the right token address", async function () {
            expect(await faucet.token()).to.equal(await token.getAddress());
        });

        it("Should have correct initial withdrawal amount", async function () {
            const withdrawalAmount = await faucet.withdrawalAmount();
            // Default is 50 tokens
            expect(ethers.formatEther(withdrawalAmount)).to.equal("50.0");
        });

        it("Should have correct initial lock time", async function () {
            const lockTime = await faucet.lockTime();
            // Default is 1 minute (60 seconds)
            expect(lockTime).to.equal(60n);
        });

        it("Should have the correct balance", async function () {
            const faucetBalance = await faucet.getBalance();
            // Compare the numeric value, not the string representation
            expect(Number(ethers.formatEther(faucetBalance))).to.equal(initialFaucetBalance);
        });
    });

    describe("Token Requests", function () {
        it("Should allow users to request tokens", async function () {
            const initialUserBalance = await token.balanceOf(user1.address);

            // Request tokens
            await faucet.connect(user1).requestTokens();

            const newUserBalance = await token.balanceOf(user1.address);
            const withdrawalAmount = await faucet.withdrawalAmount();

            expect(newUserBalance).to.equal(initialUserBalance + withdrawalAmount);
        });

        it("Should enforce cooldown period", async function () {
            // Request tokens first time
            await faucet.connect(user1).requestTokens();

            // Try to request again immediately
            await expect(
                faucet.connect(user1).requestTokens()
            ).to.be.revertedWith("Please wait before requesting again");

            // Advance time by lock period
            const lockTime = await faucet.lockTime();
            await time.increase(Number(lockTime));

            // Should be able to request again
            await faucet.connect(user1).requestTokens();
        });

        it("Should fail if faucet has insufficient funds", async function () {
            // Direct approach: set withdrawal amount higher than current balance
            const faucetBalance = await faucet.getBalance();

            // Set to a very large amount (more than what's in the faucet)
            await faucet.setWithdrawalAmount(ethers.formatEther(faucetBalance) * 2);

            // Request should fail
            await expect(
                faucet.connect(user1).requestTokens()
            ).to.be.revertedWith("Faucet has insufficient tokens");
        });
    });

    describe("Admin Functions", function () {
        it("Should allow owner to change withdrawal amount", async function () {
            await faucet.setWithdrawalAmount(100);
            const withdrawalAmount = await faucet.withdrawalAmount();

            // 100 tokens with 18 decimals
            expect(ethers.formatEther(withdrawalAmount)).to.equal("100.0");
        });

        it("Should allow owner to change lock time", async function () {
            await faucet.setLockTime(5); // 5 minutes
            const lockTime = await faucet.lockTime();

            // 5 minutes = 300 seconds
            expect(lockTime).to.equal(300n);
        });

        it("Should allow owner to withdraw all tokens", async function () {
            const initialOwnerBalance = await token.balanceOf(owner.address);
            const faucetBalance = await faucet.getBalance();

            // Owner withdraws all tokens
            await faucet.withdraw();

            const newOwnerBalance = await token.balanceOf(owner.address);
            const newFaucetBalance = await faucet.getBalance();

            expect(newOwnerBalance).to.equal(initialOwnerBalance + faucetBalance);
            expect(newFaucetBalance).to.equal(0n);
        });

        it("Should allow owner to withdraw ETH", async function () {
            // Send ETH to faucet
            await owner.sendTransaction({
                to: await faucet.getAddress(),
                value: ethers.parseEther("1.0")
            });

            const initialContractBalance = await ethers.provider.getBalance(await faucet.getAddress());
            const initialOwnerBalance = await ethers.provider.getBalance(owner.address);

            // Withdraw ETH
            const tx = await faucet.withdrawETH();
            const receipt = await tx.wait();

            // Calculate gas used
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            const newContractBalance = await ethers.provider.getBalance(await faucet.getAddress());
            const newOwnerBalance = await ethers.provider.getBalance(owner.address);

            expect(newContractBalance).to.equal(0n);
            expect(newOwnerBalance).to.be.closeTo(
                initialOwnerBalance + initialContractBalance - gasUsed,
                ethers.parseEther("0.01") // Allow small difference due to gas estimation
            );
        });

        it("Should not allow non-owner to call admin functions", async function () {
            await expect(
                faucet.connect(user1).setWithdrawalAmount(100)
            ).to.be.revertedWith("Only the contract owner can call this");

            await expect(
                faucet.connect(user1).setLockTime(5)
            ).to.be.revertedWith("Only the contract owner can call this");

            await expect(
                faucet.connect(user1).withdraw()
            ).to.be.revertedWith("Only the contract owner can call this");

            await expect(
                faucet.connect(user1).withdrawETH()
            ).to.be.revertedWith("Only the contract owner can call this");
        });
    });
}); 