require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: "../../.env" });

module.exports = {
    solidity: "0.8.20",
    paths: {
        sources: "./src",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    },
    networks: {
        amoy: {
            url: "https://rpc-amoy.polygon.technology",
            accounts: process.env.AGENT_PRIVATE_KEY ? [process.env.AGENT_PRIVATE_KEY] : [],
            chainId: 80002
        }
    },
    etherscan: {
        apiKey: process.env.POLYGONSCAN_API_KEY || "",
        customChains: [
            {
                network: "amoy",
                chainId: 80002,
                urls: {
                    apiURL: "https://api-amoy.polygonscan.com/api",
                    browserURL: "https://amoy.polygonscan.com"
                }
            }
        ]
    },
    sourcify: {
        enabled: true
    }
};
