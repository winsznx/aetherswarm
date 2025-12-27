// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract QuestPool {
    address public constant USDC = 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359;
    mapping(bytes32 => uint256) public questBudgets;
    
    event QuestCreated(bytes32 indexed questId, uint256 budget);
    
    function createQuest(bytes32 questId, uint256 budget) external {
        require(IERC20(USDC).transferFrom(msg.sender, address(this), budget), "Transfer failed");
        questBudgets[questId] = budget;
        emit QuestCreated(questId, budget);
    }
    
    function drip(bytes32 questId, address agent, uint256 amount) external {
        // Called by coordinator after x402 payment verification
        // In real app, add access control
        require(questBudgets[questId] >= amount, "Insufficient budget");
        questBudgets[questId] -= amount;
        require(IERC20(USDC).transfer(agent, amount), "Transfer failed");
    }
}
