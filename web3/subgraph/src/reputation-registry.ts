import { BigInt } from "@graphprotocol/graph-ts";
import {
    FeedbackPosted,
    ReputationUpdated
} from "../generated/ReputationRegistry/ReputationRegistry";
import { Agent, Feedback } from "../generated/schema";

export function handleFeedbackPosted(event: FeedbackPosted): void {
    let feedbackId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
    let feedback = new Feedback(feedbackId);

    feedback.agent = event.params.agentId.toString();
    feedback.reviewer = event.params.reviewer;
    feedback.score = event.params.score;
    feedback.questId = event.params.questId;
    feedback.x402PaymentHash = event.params.questId; // Using questId as placeholder
    feedback.timestamp = event.block.timestamp;

    feedback.save();

    // Update agent feedback count
    let agent = Agent.load(event.params.agentId.toString());
    if (agent) {
        agent.feedbackCount = agent.feedbackCount.plus(BigInt.fromI32(1));
        agent.save();
    }
}

export function handleReputationUpdated(event: ReputationUpdated): void {
    let agentId = event.params.agentId.toString();
    let agent = Agent.load(agentId);

    if (agent) {
        agent.reputationScore = event.params.newAverageScore;
        agent.feedbackCount = event.params.totalFeedbacks;
        agent.save();
    }
}
