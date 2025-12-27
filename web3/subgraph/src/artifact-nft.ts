import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { Transfer } from "../generated/ArtifactNFT/ArtifactNFT";
import { Artifact, Stats } from "../generated/schema";

export function handleArtifactMinted(event: Transfer): void {
    // Only handle mints (from zero address)
    let zeroAddress = Bytes.fromHexString("0x0000000000000000000000000000000000000000");
    if (event.params.from != zeroAddress) {
        return; // Not a mint, it's a transfer
    }

    let tokenId = event.params.tokenId.toString();
    let artifact = new Artifact(tokenId);

    artifact.metadataURI = "";
    artifact.merkleRoot = Bytes.empty();
    artifact.contributors = [];
    artifact.mintedAt = event.block.timestamp;
    artifact.owner = event.params.to;

    artifact.save();

    // Update stats
    let stats = Stats.load("global");
    if (stats) {
        stats.totalArtifacts = stats.totalArtifacts.plus(BigInt.fromI32(1));
        stats.save();
    }
}
