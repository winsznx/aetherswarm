import { BigInt } from "@graphprotocol/graph-ts";
import { QuestCreated } from "../generated/QuestPool/QuestPool";
import { Quest, Stats } from "../generated/schema";

export function handleQuestCreated(event: QuestCreated): void {
    let questId = event.params.id.toHexString();
    let quest = new Quest(questId);

    quest.budget = event.params.budget;
    quest.status = "Created";
    quest.createdAt = event.block.timestamp;

    quest.save();

    // Update stats
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

    stats.totalQuests = stats.totalQuests.plus(BigInt.fromI32(1));
    stats.totalVolumeUSDC = stats.totalVolumeUSDC.plus(event.params.budget);
    stats.save();
}
