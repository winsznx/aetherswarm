// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentRegistry
 * @notice ERC-8004 compliant agent identity registry
 * @dev Each agent in the swarm gets a unique NFT identity
 */
contract AgentRegistry is ERC721, Ownable {
    struct Agent {
        address owner;
        string agentType; // "scout", "verifier", "synthesizer"
        string capabilities; // JSON metadata
        string[] skills;
        uint256 registeredAt;
        bool active;
    }

    // Agent ID counter
    uint256 private _nextAgentId;

    // Agent ID => Agent data
    mapping(uint256 => Agent) public agents;

    // Agent type => list of agent IDs
    mapping(string => uint256[]) public agentsByType;

    // Owner address => agent IDs they own
    mapping(address => uint256[]) public agentsByOwner;

    // Events
    event AgentRegistered(
        uint256 indexed agentId,
        address indexed owner,
        string agentType,
        string capabilities
    );

    event AgentUpdated(
        uint256 indexed agentId,
        string capabilities
    );

    event AgentStatusChanged(
        uint256 indexed agentId,
        bool active
    );

    constructor() ERC721("AetherSwarm Agent", "ASAGENT") Ownable(msg.sender) {
        _nextAgentId = 1; // Start at 1
    }

    /**
     * @notice Register a new agent
     * @param agentType Type of agent (scout/verifier/synthesizer)
     * @param capabilities JSON metadata describing capabilities
     * @param skills Array of skill tags
     * @return agentId The newly minted agent ID
     */
    function registerAgent(
        string memory agentType,
        string memory capabilities,
        string[] memory skills
    ) external returns (uint256) {
        uint256 agentId = _nextAgentId++;

        // Mint NFT to caller
        _safeMint(msg.sender, agentId);

        // Store agent data
        agents[agentId] = Agent({
            owner: msg.sender,
            agentType: agentType,
            capabilities: capabilities,
            skills: skills,
            registeredAt: block.timestamp,
            active: true
        });

        // Index by type
        agentsByType[agentType].push(agentId);

        // Index by owner
        agentsByOwner[msg.sender].push(agentId);

        emit AgentRegistered(agentId, msg.sender, agentType, capabilities);

        return agentId;
    }

    /**
     * @notice Update agent capabilities
     * @param agentId The agent to update
     * @param capabilities New capabilities JSON
     */
    function updateCapabilities(
        uint256 agentId,
        string memory capabilities
    ) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        
        agents[agentId].capabilities = capabilities;
        
        emit AgentUpdated(agentId, capabilities);
    }

    /**
     * @notice Update agent skills
     * @param agentId The agent to update
     * @param skills New skills array
     */
    function updateSkills(
        uint256 agentId,
        string[] memory skills
    ) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        
        agents[agentId].skills = skills;
        
        emit AgentUpdated(agentId, "");
    }

    /**
     * @notice Activate or deactivate an agent
     * @param agentId The agent to update
     * @param active New status
     */
    function setAgentStatus(
        uint256 agentId,
        bool active
    ) external {
        require(ownerOf(agentId) == msg.sender, "Not agent owner");
        
        agents[agentId].active = active;
        
        emit AgentStatusChanged(agentId, active);
    }

    /**
     * @notice Get agent details
     * @param agentId The agent ID to query
     * @return Agent struct with all details
     */
    function getAgent(uint256 agentId) external view returns (Agent memory) {
        require(_ownerOf(agentId) != address(0), "Agent does not exist");
        return agents[agentId];
    }

    /**
     * @notice Get all agents of a specific type
     * @param agentType The type to filter by
     * @return Array of agent IDs
     */
    function getAgentsByType(string memory agentType) external view returns (uint256[] memory) {
        return agentsByType[agentType];
    }

    /**
     * @notice Get all agents owned by an address
     * @param owner The owner address
     * @return Array of agent IDs
     */
    function getAgentsByOwner(address owner) external view returns (uint256[] memory) {
        return agentsByOwner[owner];
    }

    /**
     * @notice Get total number of registered agents
     * @return Total count
     */
    function getTotalAgents() external view returns (uint256) {
        return _nextAgentId - 1;
    }
}
