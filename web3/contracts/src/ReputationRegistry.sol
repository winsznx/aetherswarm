// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ReputationRegistry (ERC-8004 Reputation Pillar)
 * @notice Stores and retrieves reputation feedback for agents
 * @dev Implements the ERC-8004 Reputation Registry interface
 *      - Scores range from 0-100
 *      - Only authorized clients (quest completers) can leave feedback
 *      - Supports x402 payment proof verification
 */
contract ReputationRegistry is Ownable {
    
    // Feedback structure
    struct Feedback {
        address reviewer;        // Who left the feedback
        uint256 agentId;         // Target agent
        uint8 score;             // 0-100 score
        string[] tags;           // Tags like "fast", "accurate", "reliable"
        bytes32 questId;         // Quest this feedback is for
        bytes32 x402PaymentHash; // Hash of x402 payment proof (prevents spam)
        string detailsURI;       // IPFS URI for detailed off-chain feedback
        uint256 timestamp;
    }

    // Aggregated reputation for an agent
    struct AgentReputation {
        uint256 totalScore;      // Sum of all scores
        uint256 feedbackCount;   // Number of feedbacks received
        uint256 questsCompleted; // Number of quests participated in
    }

    // Storage
    mapping(uint256 => AgentReputation) public reputations;
    mapping(uint256 => Feedback[]) public agentFeedback;
    mapping(bytes32 => bool) public usedPaymentProofs; // Prevent replay

    // Address of the DiscoveryRegistry for validation
    address public discoveryRegistry;

    // Events
    event FeedbackPosted(
        uint256 indexed agentId,
        address indexed reviewer,
        uint8 score,
        bytes32 questId
    );
    
    event ReputationUpdated(
        uint256 indexed agentId,
        uint256 newAverageScore,
        uint256 totalFeedbacks
    );

    constructor(address _discoveryRegistry) Ownable(msg.sender) {
        discoveryRegistry = _discoveryRegistry;
    }

    /**
     * @notice Post feedback for an agent after quest completion
     * @param agentId The agent to rate
     * @param score Score from 0-100
     * @param tags Array of string tags
     * @param questId The quest this feedback is for
     * @param x402PaymentHash Hash of the x402 payment signature (proves payer)
     * @param detailsURI IPFS URI for detailed feedback
     */
    function postFeedback(
        uint256 agentId,
        uint8 score,
        string[] calldata tags,
        bytes32 questId,
        bytes32 x402PaymentHash,
        string calldata detailsURI
    ) external {
        require(score <= 100, "Score must be 0-100");
        require(!usedPaymentProofs[x402PaymentHash], "Payment proof already used");
        
        // Mark payment proof as used
        usedPaymentProofs[x402PaymentHash] = true;

        // Create feedback
        Feedback memory fb = Feedback({
            reviewer: msg.sender,
            agentId: agentId,
            score: score,
            tags: tags,
            questId: questId,
            x402PaymentHash: x402PaymentHash,
            detailsURI: detailsURI,
            timestamp: block.timestamp
        });

        // Store feedback
        agentFeedback[agentId].push(fb);

        // Update aggregated reputation
        AgentReputation storage rep = reputations[agentId];
        rep.totalScore += score;
        rep.feedbackCount++;
        rep.questsCompleted++;

        emit FeedbackPosted(agentId, msg.sender, score, questId);
        emit ReputationUpdated(
            agentId,
            rep.totalScore / rep.feedbackCount,
            rep.feedbackCount
        );
    }

    /**
     * @notice Get the average reputation score for an agent
     * @param agentId The agent to query
     * @return averageScore The average score (0-100)
     * @return feedbackCount Number of feedbacks received
     */
    function getReputation(uint256 agentId) external view returns (
        uint256 averageScore,
        uint256 feedbackCount
    ) {
        AgentReputation storage rep = reputations[agentId];
        if (rep.feedbackCount == 0) {
            return (0, 0);
        }
        return (rep.totalScore / rep.feedbackCount, rep.feedbackCount);
    }

    /**
     * @notice Get full reputation details
     * @param agentId The agent to query
     */
    function getFullReputation(uint256 agentId) external view returns (
        uint256 totalScore,
        uint256 feedbackCount,
        uint256 questsCompleted,
        uint256 averageScore
    ) {
        AgentReputation storage rep = reputations[agentId];
        uint256 avg = rep.feedbackCount > 0 ? rep.totalScore / rep.feedbackCount : 0;
        return (rep.totalScore, rep.feedbackCount, rep.questsCompleted, avg);
    }

    /**
     * @notice Get all feedbacks for an agent
     * @param agentId The agent to query
     * @param limit Maximum number of feedbacks to return
     * @param offset Starting index
     */
    function getFeedbacks(
        uint256 agentId,
        uint256 limit,
        uint256 offset
    ) external view returns (
        address[] memory reviewers,
        uint8[] memory scores,
        bytes32[] memory questIds,
        uint256[] memory timestamps
    ) {
        Feedback[] storage fbs = agentFeedback[agentId];
        uint256 total = fbs.length;
        
        if (offset >= total) {
            return (new address[](0), new uint8[](0), new bytes32[](0), new uint256[](0));
        }

        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 resultSize = end - offset;

        reviewers = new address[](resultSize);
        scores = new uint8[](resultSize);
        questIds = new bytes32[](resultSize);
        timestamps = new uint256[](resultSize);

        for (uint256 i = 0; i < resultSize; i++) {
            Feedback storage fb = fbs[offset + i];
            reviewers[i] = fb.reviewer;
            scores[i] = fb.score;
            questIds[i] = fb.questId;
            timestamps[i] = fb.timestamp;
        }
    }

    /**
     * @notice Update the discovery registry address
     */
    function setDiscoveryRegistry(address _discoveryRegistry) external onlyOwner {
        discoveryRegistry = _discoveryRegistry;
    }
}
