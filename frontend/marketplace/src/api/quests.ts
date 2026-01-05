import axios from 'axios';
import { z } from 'zod';
import type { Quest } from '../types';
import { API_CONFIG } from '@/config/api';

const API_BASE = API_CONFIG.QUEST_ENGINE_URL;
const api = axios.create({ baseURL: API_BASE });

api.interceptors.response.use(
    (res) => res,
    (err) => { console.error('API Error:', err); return Promise.reject(err); }
);

export const CreateQuestSchema = z.object({
    objective: z.string().min(10),
    budget: z.number().min(1).max(1000),
    // domain: z.enum(['biotech', 'climate', 'finance']).optional() // Optional for now based on current backend
});

export const createQuest = async (data: z.infer<typeof CreateQuestSchema>): Promise<Quest> => {
    //   const validated = CreateQuestSchema.parse(data);
    // Adapting to current backend which expects 'objectives' as array
    const payload = {
        objectives: [data.objective],
        budget: data.budget,
        constraints: []
    };

    const res = await api.post('/quests', payload);
    return res.data;
};

export const fetchQuests = async (): Promise<Quest[]> => {
    // Mock fetch for now as backend doesn't have GET /quests yet
    return [];
};

export default api;
