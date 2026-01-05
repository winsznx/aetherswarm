export const API_CONFIG = {
    // Quest Engine API (Quests, Payments)
    QUEST_ENGINE_URL: process.env.NEXT_PUBLIC_QUEST_ENGINE_URL || 'http://localhost:3001',

    // Swarm Coordinator API (Agent status, health)
    COORDINATOR_URL: process.env.NEXT_PUBLIC_COORDINATOR_URL || 'http://localhost:8081',
} as const;
