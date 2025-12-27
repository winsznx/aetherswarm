import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Quest } from '../types';

interface QuestState {
    quests: Quest[];
    setQuests: (quests: Quest[]) => void;
    addQuest: (quest: Quest) => void;
}

export const useQuestStore = create<QuestState>()(
    persist(
        (set) => ({
            quests: [],
            setQuests: (quests) => set({ quests }),
            addQuest: (quest) => set((state) => ({ quests: [...state.quests, quest] }))
        }),
        { name: 'aetherswarm-quests' }
    )
);
