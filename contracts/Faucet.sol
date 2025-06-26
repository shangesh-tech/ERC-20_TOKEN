// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract Faucet {
    address payable public owner;
    IERC20 public immutable token;
    IERC20Metadata public immutable tokenMetadata;
    uint256 public withdrawalAmount;
    uint256 public lockTime;

    event Withdrawal(address indexed to, uint256 amount);
    event Deposit(address indexed from, uint256 amount);
    event WithdrawalAmountChanged(uint256 newAmount);
    event LockTimeChanged(uint256 newLockTime);

    mapping(address => uint256) public nextAccessTime;

    constructor(address tokenAddress) payable {
        require(tokenAddress != address(0), "Token address cannot be zero");
        token = IERC20(tokenAddress);
        owner = payable(msg.sender);
        tokenMetadata = IERC20Metadata(tokenAddress);
        withdrawalAmount = 50 * (10 ** tokenMetadata.decimals());
        lockTime = 1 minutes;
    }

    /// @notice Users request tokens after cooldown
    function requestTokens() external {
        require(msg.sender != address(0), "Zero address not allowed");
        require(
            block.timestamp >= nextAccessTime[msg.sender],
            "Please wait before requesting again"
        );
        require(
            token.balanceOf(address(this)) >= withdrawalAmount,
            "Faucet has insufficient tokens"
        );

        nextAccessTime[msg.sender] = block.timestamp + lockTime;

        bool success = token.transfer(msg.sender, withdrawalAmount);
        require(success, "Token transfer failed");

        emit Withdrawal(msg.sender, withdrawalAmount);
    }

    /// @notice Accept ETH (optional)
    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    /// @notice View current token balance
    function getBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    /// @notice Set withdrawal amount in whole tokens
    function setWithdrawalAmount(uint256 _amount) external onlyOwner {
        withdrawalAmount = _amount * (10 ** tokenMetadata.decimals());
        emit WithdrawalAmountChanged(withdrawalAmount);
    }

    /// @notice Set lock time in minutes
    function setLockTime(uint256 _minutes) external onlyOwner {
        lockTime = _minutes * 1 minutes;
        emit LockTimeChanged(lockTime);
    }

    /// @notice Owner withdraws all ERC20 tokens from faucet
    function withdraw() external onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");

        bool success = token.transfer(owner, balance);
        require(success, "Token transfer failed");

        emit Withdrawal(owner, balance);
    }

    /// @notice Owner withdraws any ETH accidentally sent to the contract
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");

        (bool sent, ) = payable(owner).call{value: balance}("");
        require(sent, "ETH withdrawal failed");
    }

    /// @dev Restricts function to owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the contract owner can call this");
        _;
    }
}
