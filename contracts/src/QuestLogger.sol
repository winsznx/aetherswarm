// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title QuestLogger
 * @notice On-chain verifiable quest completion logging
 * @dev Records full quest lifecycle with proof trail
 */
contract QuestLogger is Ownable {
    struct QuestLog {
        string questId;
        address creator;
        string objectives;
        uint256 budgetUSDC;
        uint256 createdAt;
        uint256 completedAt;
        QuestStatus status;
        string resultsIPFSHash;
        uint256[] participatingAgents;
        PaymentProof[] payments;
    }

    struct PaymentProof {
        uint256 agentId;
        string apiEndpoint;
        uint256 amountUSDC;
        bytes32 txHash;
        uint256 timestamp;
    }

    enum QuestStatus {
        CREATED,
        IN_PROGRESS,
        VERIFIED,
        COMPLETED,
        FAILED
    }

    // Quest ID => Quest Log
    mapping(string => QuestLog) public quests;

    // Array of all quest IDs
    string[] public questIds;

    // Creator address => quest IDs
    mapping(address => string[]) public questsByCreator;

    // Events
    event QuestCreated(
        string indexed questId,
        address indexed creator,
        uint256 budgetUSDC
    );

    event QuestStatusUpdated(
        string indexed questId,
        QuestStatus status
    );

    event PaymentRecorded(
        string indexed questId,
        uint256 indexed agentId,
        string apiEndpoint,
        uint256 amountUSDC,
        bytes32 txHash
    );

    event QuestCompleted(
        string indexed questId,
        string resultsIPFSHash,
        uint256 totalCost
    );

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Create a new quest log
     */
    function createQuest(
        string memory questId,
        string memory objectives,
        uint256 budgetUSDC
    ) external {
        require(bytes(quests[questId].questId).length == 0, "Quest already exists");

        quests[questId] = QuestLog({
            questId: questId,
            creator: msg.sender,
            objectives: objectives,
            budgetUSDC: budgetUSDC,
            createdAt: block.timestamp,
            completedAt: 0,
            status: QuestStatus.CREATED,
            resultsIPFSHash: "",
            participatingAgents: new uint256[](0),
            payments: new PaymentProof[](0)
        });

        questIds.push(questId);
        questsByCreator[msg.sender].push(questId);

        emit QuestCreated(questId, msg.sender, budgetUSDC);
    }

    /**
     * @notice Update quest status
     */
    function updateQuestStatus(
        string memory questId,
        QuestStatus status
    ) external {
        require(bytes(quests[questId].questId).length > 0, "Quest does not exist");
        
        quests[questId].status = status;

        if (status == QuestStatus.IN_PROGRESS && quests[questId].createdAt == block.timestamp) {
            // Mark when quest actually started
            quests[questId].createdAt = block.timestamp;
        }

        emit QuestStatusUpdated(questId, status);
    }

    /**
     * @notice Record an x402 payment made during quest
     */
    function recordPayment(
        string memory questId,
        uint256 agentId,
        string memory apiEndpoint,
        uint256 amountUSDC,
        bytes32 txHash
    ) external {
        require(bytes(quests[questId].questId).length > 0, "Quest does not exist");

        PaymentProof memory proof = PaymentProof({
            agentId: agentId,
            apiEndpoint: apiEndpoint,
            amountUSDC: amountUSDC,
            txHash: txHash,
            timestamp: block.timestamp
        });

        quests[questId].payments.push(proof);

        // Add agent to participants if not already there
        bool found = false;
        for (uint i = 0; i < quests[questId].participatingAgents.length; i++) {
            if (quests[questId].participatingAgents[i] == agentId) {
                found = true;
                break;
            }
        }
        if (!found) {
            quests[questId].participatingAgents.push(agentId);
        }

        emit PaymentRecorded(questId, agentId, apiEndpoint, amountUSDC, txHash);
    }

    /**
     * @notice Complete a quest with results
     */
    function completeQuest(
        string memory questId,
        string memory resultsIPFSHash
    ) external {
        require(bytes(quests[questId].questId).length > 0, "Quest does not exist");

        quests[questId].status = QuestStatus.COMPLETED;
        quests[questId].completedAt = block.timestamp;
        quests[questId].resultsIPFSHash = resultsIPFSHash;

        // Calculate total cost
        uint256 totalCost = 0;
        for (uint i = 0; i < quests[questId].payments.length; i++) {
            totalCost += quests[questId].payments[i].amountUSDC;
        }

        emit QuestCompleted(questId, resultsIPFSHash, totalCost);
    }

    /**
     * @notice Get quest details
     */
    function getQuest(string memory questId) 
        external 
        view 
        returns (
            address creator,
            string memory objectives,
            uint256 budgetUSDC,
            QuestStatus status,
            string memory resultsIPFSHash,
            uint256 createdAt,
            uint256 completedAt
        ) 
    {
        QuestLog memory log = quests[questId];
        return (
            log.creator,
            log.objectives,
            log.budgetUSDC,
            log.status,
            log.resultsIPFSHash,
            log.createdAt,
            log.completedAt
        );
    }

    /**
     * @notice Get quest payments audit trail
     */
    function getQuestPayments(string memory questId) 
        external 
        view 
        returns (PaymentProof[] memory) 
    {
        return quests[questId].payments;
    }

    /**
     * @notice Get quests by creator
     */
    function getQuestsByCreator(address creator) 
        external 
        view 
        returns (string[] memory) 
    {
        return questsByCreator[creator];
    }

    /**
     * @notice Get total number of quests
     */
    function getTotalQuests() external view returns (uint256) {
        return questIds.length;
    }

    /**
     * @notice Get quest participants
     */
    function getQuestParticipants(string memory questId) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return quests[questId].participatingAgents;
    }
}
