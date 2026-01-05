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
        uint256 paymentCount;
        uint256 participantCount;
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

    // Quest ID => Payment Index => Payment
    mapping(string => mapping(uint256 => PaymentProof)) public questPayments;

    // Quest ID => Participant Index => Agent ID
    mapping(string => mapping(uint256 => uint256)) public questParticipants;

    // Quest ID => Agent ID => is participant
    mapping(string => mapping(uint256 => bool)) public isParticipant;

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
            paymentCount: 0,
            participantCount: 0
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

        uint256 paymentIndex = quests[questId].paymentCount;
        questPayments[questId][paymentIndex] = PaymentProof({
            agentId: agentId,
            apiEndpoint: apiEndpoint,
            amountUSDC: amountUSDC,
            txHash: txHash,
            timestamp: block.timestamp
        });
        quests[questId].paymentCount++;

        // Add agent to participants if not already there
        if (!isParticipant[questId][agentId]) {
            uint256 participantIndex = quests[questId].participantCount;
            questParticipants[questId][participantIndex] = agentId;
            isParticipant[questId][agentId] = true;
            quests[questId].participantCount++;
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
        for (uint i = 0; i < quests[questId].paymentCount; i++) {
            totalCost += questPayments[questId][i].amountUSDC;
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
        QuestLog storage log = quests[questId];
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
        uint256 count = quests[questId].paymentCount;
        PaymentProof[] memory payments = new PaymentProof[](count);
        for (uint i = 0; i < count; i++) {
            payments[i] = questPayments[questId][i];
        }
        return payments;
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
        uint256 count = quests[questId].participantCount;
        uint256[] memory participants = new uint256[](count);
        for (uint i = 0; i < count; i++) {
            participants[i] = questParticipants[questId][i];
        }
        return participants;
    }
}

