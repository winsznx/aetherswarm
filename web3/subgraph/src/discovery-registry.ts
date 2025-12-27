import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
    AgentRegistered,
    AgentUpdated,
    AgentStakeSlashed
} from "../generated/DiscoveryRegistry/DiscoveryRegistry";
import { Agent, Stats } from "../generated/schema";

export function handleAgentRegistered(event: AgentRegistered): void {
    let agentId = event.params.agentId.toString();
    let agent = new Agent(agentId);

    // Map role enum
    let roleIndex = event.params.role;
    if (roleIndex == 0) {
        agent.role = "Scout";
    } else if (roleIndex == 1) {
        agent.role = "Verifier";
    } else {
        agent.role = "Synthesizer";
    }

    agent.paymentAddress = event.params.paymentAddress;
    agent.tokenURI = event.params.tokenURI;
    agent.wsEndpoint = "";
    agent.a2aEndpoint = "";
    agent.stakeAmount = BigInt.fromI32(0);
    agent.isActive = true;
    agent.registeredAt = event.block.timestamp;

    // Initialize reputation
    agent.reputationScore = BigInt.fromI32(50); // Default
    agent.feedbackCount = BigInt.fromI32(0);
    agent.questsCompleted = BigInt.fromI32(0);

    agent.save();

    // Update global stats
    updateStats(agent.role);
}

export function handleAgentUpdated(event: AgentUpdated): void {
    let agentId = event.params.agentId.toString();
    let agent = Agent.load(agentId);

    if (agent) {
        agent.wsEndpoint = event.params.wsEndpoint;
        agent.a2aEndpoint = event.params.a2aEndpoint;
        agent.isActive = event.params.isActive;
        agent.save();
    }
}

export function handleAgentSlashed(event: AgentStakeSlashed): void {
    let agentId = event.params.agentId.toString();
    let agent = Agent.load(agentId);

    if (agent) {
        agent.stakeAmount = agent.stakeAmount.minus(event.params.amount);
        agent.save();
    }
}

function updateStats(role: string): void {
    let stats = Stats.load("global");

    if (!stats) {
        stats = new Stats("global");
        stats.totalAgents = BigInt.fromI32(0);
        stats.totalQuests = BigInt.fromI32(0);
        stats.totalArtifacts = BigInt.fromI32(0);
        stats.totalVolumeUSDC = BigInt.fromI32(0);
        stats.activeScouts = BigInt.fromI32(0);
        stats.activeVerifiers = BigInt.fromI32(0);
        stats.activeSynthesizers = BigInt.fromI32(0);
    }

    stats.totalAgents = stats.totalAgents.plus(BigInt.fromI32(1));

    if (role == "Scout") {
        stats.activeScouts = stats.activeScouts.plus(BigInt.fromI32(1));
    } else if (role == "Verifier") {
        stats.activeVerifiers = stats.activeVerifiers.plus(BigInt.fromI32(1));
    } else {
        stats.activeSynthesizers = stats.activeSynthesizers.plus(BigInt.fromI32(1));
    }

    stats.save();
}
