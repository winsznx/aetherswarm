// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ArtifactNFT
 * @notice NFTs representing synthesized knowledge artifacts from AetherSwarm quests
 */
contract ArtifactNFT is ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;
    
    struct Artifact {
        string metadataURI;       // IPFS link to full artifact data
        bytes32 merkleRoot;       // Merkle root for data provenance
        address[] contributors;   // Agent addresses who contributed
        uint256 createdAt;        // Timestamp
    }
    
    mapping(uint256 => Artifact) public artifacts;
    
    event ArtifactMinted(
        uint256 indexed tokenId, 
        bytes32 merkleRoot,
        address[] contributors
    );

    constructor() ERC721("AetherSwarm Artifact", "ARTIFACT") Ownable(msg.sender) {}
    
    /**
     * @notice Mint a new knowledge artifact NFT
     * @param recipient The address to receive the NFT
     * @param metadataURI IPFS URI containing artifact metadata
     * @param merkleRoot Merkle root proving data provenance
     * @param contributors Array of agent addresses who contributed
     */
    function mintArtifact(
        address recipient,
        string memory metadataURI,
        bytes32 merkleRoot,
        address[] memory contributors
    ) external onlyOwner returns (uint256) {
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        
        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, metadataURI);
        
        artifacts[tokenId] = Artifact({
            metadataURI: metadataURI,
            merkleRoot: merkleRoot,
            contributors: contributors,
            createdAt: block.timestamp
        });
        
        emit ArtifactMinted(tokenId, merkleRoot, contributors);
        return tokenId;
    }
    
    /**
     * @notice Get artifact details
     * @param tokenId The token ID to query
     */
    function getArtifact(uint256 tokenId) external view returns (
        string memory metadataURI,
        bytes32 merkleRoot,
        address[] memory contributors,
        uint256 createdAt
    ) {
        Artifact storage artifact = artifacts[tokenId];
        return (
            artifact.metadataURI,
            artifact.merkleRoot,
            artifact.contributors,
            artifact.createdAt
        );
    }
    
    /**
     * @notice Total minted artifacts
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
}
