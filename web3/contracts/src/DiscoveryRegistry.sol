// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DiscoveryRegistry (ERC-8004 Identity Registry)
 * @notice Implements the ERC-8004 standard for Trustless AI Agent identity and discovery
 * @dev Each agent receives a unique AgentID (ERC-721 token) with metadata including:
 *      - Agent type (scout, verifier, synthesizer)
 *      - Communication endpoints (WebSocket, A2A)
 *      - Wallet address for x402 payments
 *      - Initial stake for slashing
 */
contract DiscoveryRegistry is ERC721URIStorage, Ownable {
    uint256 private _agentIdCounter;

    // Agent roles enum
    enum AgentRole { Scout, Verifier, Synthesizer }

    // Agent metadata stored on-chain
    struct AgentInfo {
        AgentRole role;
        address paymentAddress;   // Wallet for receiving x402 payments
        string wsEndpoint;        // WebSocket endpoint for coordinator
        string a2aEndpoint;       // Agent-to-Agent communication endpoint
        uint256 stakeAmount;      // Collateral for slashing
        bool isActive;            // Whether agent is available for quests
        uint256 registeredAt;     // Timestamp of registration
    }

    // Mapping from agentId to agent info
    mapping(uint256 => AgentInfo) public agents;
    
    // Mapping from wallet address to agentId (for reverse lookup)
    mapping(address => uint256) public addressToAgentId;
    
    // Mapping from role to array of agentIds
    mapping(AgentRole => uint256[]) public agentsByRole;

    // Minimum stake required to register
    uint256 public minimumStake = 10 * 10**6; // 10 USDC (6 decimals)

    // Events (ERC-8004 compliant)
    event AgentRegistered(
        uint256 indexed agentId,
        address indexed paymentAddress,
        AgentRole role,
        string tokenURI
    );
    
    event AgentUpdated(
        uint256 indexed agentId,
        string wsEndpoint,
        string a2aEndpoint,
        bool isActive
    );
    
    event AgentStakeSlashed(
        uint256 indexed agentId,
        uint256 amount,
        string reason
    );

    constructor() ERC721("AetherSwarm Agent", "AGENT") Ownable(msg.sender) {}

    /**
     * @notice Register a new agent in the discovery registry
     * @param role The agent's role (Scout=0, Verifier=1, Synthesizer=2)
     * @param wsEndpoint WebSocket endpoint for real-time communication
     * @param a2aEndpoint Agent-to-Agent communication URL
     * @param tokenURI IPFS URI containing full agent metadata JSON
     */
    function registerAgent(
        AgentRole role,
        string calldata wsEndpoint,
        string calldata a2aEndpoint,
        string calldata tokenURI
    ) external payable returns (uint256) {
        require(msg.value >= minimumStake, "Insufficient stake");
        require(addressToAgentId[msg.sender] == 0, "Agent already registered");

        _agentIdCounter++;
        uint256 newAgentId = _agentIdCounter;

        // Mint the identity NFT
        _safeMint(msg.sender, newAgentId);
        _setTokenURI(newAgentId, tokenURI);

        // Store agent info
        agents[newAgentId] = AgentInfo({
            role: role,
            paymentAddress: msg.sender,
            wsEndpoint: wsEndpoint,
            a2aEndpoint: a2aEndpoint,
            stakeAmount: msg.value,
            isActive: true,
            registeredAt: block.timestamp
        });

        // Index by address and role
        addressToAgentId[msg.sender] = newAgentId;
        agentsByRole[role].push(newAgentId);

        emit AgentRegistered(newAgentId, msg.sender, role, tokenURI);
        
        return newAgentId;
    }

    /**
     * @notice Update agent endpoints and status
     * @param agentId The agent's token ID
     * @param wsEndpoint New WebSocket endpoint
     * @param a2aEndpoint New A2A endpoint
     * @param isActive Whether agent is available
     */
    function updateAgent(
        uint256 agentId,
        string calldata wsEndpoint,
        string calldata a2aEndpoint,
        bool isActive
    ) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        
        AgentInfo storage agent = agents[agentId];
        agent.wsEndpoint = wsEndpoint;
        agent.a2aEndpoint = a2aEndpoint;
        agent.isActive = isActive;

        emit AgentUpdated(agentId, wsEndpoint, a2aEndpoint, isActive);
    }

    /**
     * @notice Get all active agents of a specific role
     * @param role The role to filter by
     * @return Array of agent IDs with that role
     */
    function getAgentsByRole(AgentRole role) external view returns (uint256[] memory) {
        uint256[] memory roleAgents = agentsByRole[role];
        
        // Count active agents
        uint256 activeCount = 0;
        for (uint256 i = 0; i < roleAgents.length; i++) {
            if (agents[roleAgents[i]].isActive) {
                activeCount++;
            }
        }

        // Build active agents array
        uint256[] memory activeAgents = new uint256[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < roleAgents.length; i++) {
            if (agents[roleAgents[i]].isActive) {
                activeAgents[index] = roleAgents[i];
                index++;
            }
        }

        return activeAgents;
    }

    /**
     * @notice Get full agent details
     * @param agentId The agent's token ID
     */
    function getAgent(uint256 agentId) external view returns (
        AgentRole role,
        address paymentAddress,
        string memory wsEndpoint,
        string memory a2aEndpoint,
        uint256 stakeAmount,
        bool isActive,
        uint256 registeredAt
    ) {
        AgentInfo storage agent = agents[agentId];
        return (
            agent.role,
            agent.paymentAddress,
            agent.wsEndpoint,
            agent.a2aEndpoint,
            agent.stakeAmount,
            agent.isActive,
            agent.registeredAt
        );
    }

    /**
     * @notice Slash agent stake for misbehavior (called by owner/governance)
     * @param agentId The agent to slash
     * @param amount Amount to slash
     * @param reason Reason for slashing
     */
    function slashAgent(
        uint256 agentId,
        uint256 amount,
        string calldata reason
    ) external onlyOwner {
        AgentInfo storage agent = agents[agentId];
        require(agent.stakeAmount >= amount, "Insufficient stake to slash");
        
        agent.stakeAmount -= amount;
        
        // Transfer slashed funds to owner (treasury)
        payable(owner()).transfer(amount);
        
        emit AgentStakeSlashed(agentId, amount, reason);
    }

    /**
     * @notice Withdraw stake when deregistering
     * @param agentId The agent's token ID
     */
    function withdrawStake(uint256 agentId) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        
        AgentInfo storage agent = agents[agentId];
        uint256 stake = agent.stakeAmount;
        
        agent.stakeAmount = 0;
        agent.isActive = false;
        
        payable(msg.sender).transfer(stake);
    }

    /**
     * @notice Total registered agents
     */
    function totalAgents() external view returns (uint256) {
        return _agentIdCounter;
    }

    /**
     * @notice Update minimum stake (governance)
     */
    function setMinimumStake(uint256 newMinimum) external onlyOwner {
        minimumStake = newMinimum;
    }
}
