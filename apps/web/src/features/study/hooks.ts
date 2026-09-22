import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { StudyMode, SubmitReview } from '@deckup/shared';

import { completeStudySession, fetchStudyQueue, startStudySession, submitReview } from './api';

export function useStartStudySession() {
  return useMutation({
    mutationFn: ({ deckId, mode }: { deckId: string; mode: StudyMode }) =>
      startStudySession(deckId, mode),
  });
}

export function useStudyQueue(sessionId: string | null) {
  return useQuery({
    queryKey: ['study', sessionId, 'queue'],
    queryFn: () => fetchStudyQueue(sessionId ?? ''),
    enabled: sessionId !== null,
  });
}

export function useSubmitReview(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SubmitReview) => submitReview(sessionId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['decks'] });
    },
  });
}

export function useCompleteStudySession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => completeStudySession(sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['decks'] });
      void queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}
