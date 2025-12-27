import { useMutation, useQuery } from '@tanstack/react-query';
import { createQuest, fetchQuests } from '@/api/quests';
import { useQuestStore } from '@/store/questStore';
import { Quest } from '@/types';

export const useQuest = () => {
    const setQuests = useQuestStore((state) => state.setQuests);

    const { data: quests, refetch } = useQuery<Quest[]>({
        queryKey: ['quests'],
        queryFn: fetchQuests,
        // onSuccess: (data) => setQuests(data), // Removed in v5, handle in useEffect or component
        staleTime: 5 * 60 * 1000
    });

    const createMutation = useMutation({
        mutationFn: createQuest,
        onSuccess: (newQuest) => {
            // Optimistic update or state update
            useQuestStore.getState().addQuest(newQuest);
        }
    });

    return {
        quests: useQuestStore((state) => state.quests), // Use store as source of truth combined with query
        createQuest: createMutation.mutate,
        isLoading: createMutation.isPending
    };
};
