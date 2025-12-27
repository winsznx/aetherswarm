import { z } from 'zod';

export const CreateQuestSchema = z.object({
    objective: z.string().min(10, "Objective must be at least 10 characters"),
    budget: z.number().min(1, "Budget must be at least 1 USDC").max(1000, "Max budget is 1000")
});
