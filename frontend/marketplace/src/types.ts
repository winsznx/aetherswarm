export interface Quest {
    id: string;
    objective?: string; // API might return different shape initially?
    objectives: string[]; // Frontend currently uses array
    budget: number;
    walletAddress?: string;
}
