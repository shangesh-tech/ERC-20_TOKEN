const { expect } = require("chai");
const hre = require("hardhat");

describe("Shangesh Token contract", function () {
    // global vars
    let Token;
    let shangeshToken;
    let owner;
    let addr1;
    let addr2;
    let tokenCap = 10000000;
    let tokenBlockReward = 50;

    beforeEach(async function () {
        Token = await ethers.getContractFactory("Shangesh");
        [owner, addr1, addr2] = await hre.ethers.getSigners();

        shangeshToken = await Token.deploy(tokenCap, tokenBlockReward);
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await shangeshToken.owner()).to.equal(owner.address);
        });

        it("Should assign the initial supply of tokens to the owner", async function () {
            const ownerBalance = await shangeshToken.balanceOf(owner.address);
            // Initial supply is 2,000,000 tokens
            expect(ownerBalance).to.equal(ethers.parseEther("2000000"));
        });

        it("Should set the max capped supply to the argument provided during deployment", async function () {
            const cap = await shangeshToken.cap();
            expect(Number(ethers.formatEther(cap))).to.equal(tokenCap);
        });

        it("Should set the blockReward to the argument provided during deployment", async function () {
            const blockReward = await shangeshToken.blockReward();
            expect(Number(ethers.formatEther(blockReward))).to.equal(tokenBlockReward);
        });
    });

    describe("Transactions", function () {
        it("Should transfer tokens between accounts", async function () {
            // Transfer 100 tokens from owner to addr1
            await shangeshToken.transfer(addr1.address, ethers.parseEther("100"));
            const addr1Balance = await shangeshToken.balanceOf(addr1.address);
            expect(addr1Balance).to.equal(ethers.parseEther("100"));

            // Transfer 50 tokens from addr1 to addr2
            // We use .connect(signer) to send a transaction from another account
            await shangeshToken.connect(addr1).transfer(addr2.address, ethers.parseEther("50"));
            const addr2Balance = await shangeshToken.balanceOf(addr2.address);
            expect(addr2Balance).to.equal(ethers.parseEther("50"));
        });

        it("Should fail if sender doesn't have enough tokens", async function () {
            const initialOwnerBalance = await shangeshToken.balanceOf(owner.address);

            // Try to send 1 token from addr1 (0 tokens) to owner
            await expect(
                shangeshToken.connect(addr1).transfer(owner.address, ethers.parseEther("1"))
            ).to.be.reverted;

            // Owner balance shouldn't have changed.
            expect(await shangeshToken.balanceOf(owner.address)).to.equal(
                initialOwnerBalance
            );
        });

        it("Should update balances after transfers", async function () {
            const initialOwnerBalance = await shangeshToken.balanceOf(owner.address);

            // Transfer 100 tokens from owner to addr1.
            await shangeshToken.transfer(addr1.address, ethers.parseEther("100"));

            // Transfer another 50 tokens from owner to addr2.
            await shangeshToken.transfer(addr2.address, ethers.parseEther("50"));

            // Check balances using standard subtraction (not .sub() method which is v5)
            const finalOwnerBalance = await shangeshToken.balanceOf(owner.address);
            expect(finalOwnerBalance).to.equal(initialOwnerBalance - ethers.parseEther("150"));

            const addr1Balance = await shangeshToken.balanceOf(addr1.address);
            expect(addr1Balance).to.equal(ethers.parseEther("100"));

            const addr2Balance = await shangeshToken.balanceOf(addr2.address);
            expect(addr2Balance).to.equal(ethers.parseEther("50"));
        });
    });

    describe("Block Rewards", function () {
        it("Should update block reward", async function () {
            await shangeshToken.setBlockReward(100);
            const blockReward = await shangeshToken.blockReward();
            expect(Number(ethers.formatEther(blockReward))).to.equal(100);
        });

        it("Should not allow non-owner to update block reward", async function () {
            await expect(
                shangeshToken.connect(addr1).setBlockReward(100)
            ).to.be.revertedWith("Only owner can call this function");
        });
    });

    describe("Burning", function () {
        it("Should allow token burning", async function () {
            const initialSupply = await shangeshToken.totalSupply();

            // Owner burns 1000 tokens
            await shangeshToken.burn(ethers.parseEther("1000"));
            const newSupply = await shangeshToken.totalSupply();
            expect(newSupply).to.equal(initialSupply - ethers.parseEther("1000"));
        });
    });
}); 