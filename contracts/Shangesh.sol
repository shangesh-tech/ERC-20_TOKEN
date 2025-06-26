// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/**
 * @title Shangesh Token (SHAN)
 * @dev ERC20 token with capped supply, burnable functionality, and miner rewards.
 */
contract Shangesh is ERC20Capped, ERC20Burnable {
    address payable public owner;
    uint256 public blockReward;

    constructor(
        uint256 cap,
        uint256 reward
    ) ERC20("Shangesh", "SHAN") ERC20Capped(cap * (10 ** decimals())) {
        owner = payable(msg.sender);
        _mint(owner, 2_000_000 * (10 ** decimals()));
        blockReward = reward * (10 ** decimals());
    }

    /**
     * @dev Modifier to restrict function calls to contract owner.
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    /**
     * @dev Updates the miner block reward. Only callable by the owner.
     */
    function setBlockReward(uint256 reward) external onlyOwner {
        blockReward = reward * (10 ** decimals());
    }

    /**
     * @dev Internal function to mint reward to the block miner.
     */
    function _mintMinerReward() internal {
        _mint(block.coinbase, blockReward);
    }

    /**
     * @dev Internal override: core logic for transfers, minting, and burning.
     * Adds miner reward logic but skips rewards for burn operations.
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Capped) {
        super._update(from, to, value);

        if (
            from != address(0) &&
            to != address(0) && // Skip rewards for burn operations
            to != block.coinbase &&
            block.coinbase != address(0) &&
            blockReward > 0 &&
            totalSupply() + blockReward <= cap()
        ) {
            _mintMinerReward();
        }
    }
}
