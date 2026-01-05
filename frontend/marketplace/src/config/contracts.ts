export const AETHER_SWARM_CONTRACTS = {
    baseSepolia: {
        AgentRegistry: "0x924FB10829A05023E09AF126Fe97E3cD79690227",
        ReputationRegistry: "0xe720AdC0b72885fBf2EA079D043063Aa63b02a59",
        QuestLogger: "0xC4B63ba513882E35073319bb7e91F53FdCf6b3fd",
    },
    base: {
        AgentRegistry: "", // To be deployed
        ReputationRegistry: "", // To be deployed
        QuestLogger: "", // To be deployed
    }
} as const;

export const CURRENT_CHAIN_ID = 84532; // Base Sepolia
