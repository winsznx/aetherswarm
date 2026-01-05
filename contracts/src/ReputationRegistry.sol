// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./AgentRegistry.sol";

/**
 * @title ReputationRegistry
 * @notice ERC-8004 compliant reputation tracking for agents
 * @dev Records quest completions and calculates reputation scores
 */
contract ReputationRegistry is Ownable {
    struct QuestRecord {
        uint256 questId;
        uint256 agentId;
        uint8 score; // 0-100
        uint256 timestamp;
        address ratedBy;
        string feedback;
    }

    struct AgentReputation {
        uint256 totalScore;
        uint256 questCount;
        uint256 lastQuestTimestamp;
    }

    // Agent registry reference
    AgentRegistry public agentRegistry;

    // Agent ID => Reputation
    mapping(uint256 => AgentReputation) public reputations;

    // Quest ID => Agent ID => QuestRecord
    mapping(uint256 => mapping(uint256 => QuestRecord)) public questRecords;

    // Quest ID => list of participating agent IDs
    mapping(uint256 => uint256[]) public questParticipants;

    // Authorized raters (Quest Engine, Synthesizer)
    mapping(address => bool) public authorizedRaters;

    // Events
    event QuestRecorded(
        uint256 indexed questId,
        uint256 indexed agentId,
        uint8 score,
        address ratedBy
    );

    event RaterAuthorized(address indexed rater, bool authorized);

    constructor(address _agentRegistry) Ownable(msg.sender) {
        agentRegistry = AgentRegistry(_agentRegistry);
    }

    /**
     * @notice Authorize an address to rate agents
     * @param rater Address to authorize
     * @param authorized True to authorize, false to revoke
     */
    function setAuthorizedRater(address rater, bool authorized) external onlyOwner {
        authorizedRaters[rater] = authorized;
        emit RaterAuthorized(rater, authorized);
    }

    /**
     * @notice Record a quest completion and score
     * @param agentId The agent that completed the quest
     * @param questId The quest ID
     * @param score Performance score (0-100)
     * @param feedback Optional feedback string
     */
    function recordQuestCompletion(
        uint256 agentId,
        uint256 questId,
        uint8 score,
        string memory feedback
    ) external {
        require(authorizedRaters[msg.sender] || msg.sender == owner(), "Not authorized");
        require(score <= 100, "Score must be 0-100");
        require(agentRegistry.ownerOf(agentId) != address(0), "Agent does not exist");

        // Check if already recorded
        require(questRecords[questId][agentId].timestamp == 0, "Quest already recorded");

        // Record the quest
        questRecords[questId][agentId] = QuestRecord({
            questId: questId,
            agentId: agentId,
            score: score,
            timestamp: block.timestamp,
            ratedBy: msg.sender,
            feedback: feedback
        });

        // Update reputation
        AgentReputation storage rep = reputations[agentId];
        rep.totalScore += score;
        rep.questCount += 1;
        rep.lastQuestTimestamp = block.timestamp;

        // Add to participants list
        questParticipants[questId].push(agentId);

        emit QuestRecorded(questId, agentId, score, msg.sender);
    }

    /**
     * @notice Get agent reputation
     * @param agentId The agent to query
     * @return totalScore Total accumulated score
     * @return questCount Number of quests completed
     * @return averageScore Average score per quest
     * @return lastQuest Timestamp of last quest
     */
    function getReputation(uint256 agentId) 
        external 
        view 
        returns (
            uint256 totalScore,
            uint256 questCount,
            uint256 averageScore,
            uint256 lastQuest
        ) 
    {
        AgentReputation memory rep = reputations[agentId];
        
        averageScore = rep.questCount > 0 
            ? rep.totalScore / rep.questCount 
            : 0;

        return (
            rep.totalScore,
            rep.questCount,
            averageScore,
            rep.lastQuestTimestamp
        );
    }

    /**
     * @notice Get average score for an agent
     * @param agentId The agent to query
     * @return Average score (0-100), or 0 if no quests
     */
    function getAverageScore(uint256 agentId) external view returns (uint256) {
        AgentReputation memory rep = reputations[agentId];
        
        if (rep.questCount == 0) return 0;
        
        return rep.totalScore / rep.questCount;
    }

    /**
     * @notice Get quest record
     * @param questId The quest ID
     * @param agentId The agent ID
     * @return QuestRecord struct
     */
    function getQuestRecord(uint256 questId, uint256 agentId) 
        external 
        view 
        returns (QuestRecord memory) 
    {
        return questRecords[questId][agentId];
    }

    /**
     * @notice Get all agents that participated in a quest
     * @param questId The quest ID
     * @return Array of agent IDs
     */
    function getQuestParticipants(uint256 questId) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return questParticipants[questId];
    }

    /**
     * @notice Check if agent is high-reputation (average score >= threshold)
     * @param agentId The agent to check
     * @param threshold Minimum average score required
     * @return True if agent meets threshold
     */
    function isHighReputation(uint256 agentId, uint256 threshold) 
        external 
        view 
        returns (bool) 
    {
        AgentReputation memory rep = reputations[agentId];
        
        if (rep.questCount == 0) return false;
        
        uint256 average = rep.totalScore / rep.questCount;
        return average >= threshold;
    }
}
