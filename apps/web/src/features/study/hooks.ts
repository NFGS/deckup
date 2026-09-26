import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { StudyMode, SubmitReview } from '@deckup/shared';
import { useCallback, useEffect, useState } from 'react';

import { enqueueReview, flushQueue, readQueue } from '../../lib/offline-queue';
import type { FlushResult, QueuedReview } from '../../lib/offline-queue';
import { queryKeys } from '../../lib/query-keys';
import { useAuth } from '../auth/auth-context';
import {
  abandonStudySession,
  completeStudySession,
  fetchStudyQueue,
  startStudySession,
  submitReview,
} from './api';

export function useStartStudySession() {
  return useMutation({
    mutationFn: ({ deckId, mode }: { deckId: string; mode: StudyMode }) =>
      startStudySession(deckId, mode),
  });
}

export function useStudyQueue(sessionId: string | null) {
  return useQuery({
    queryKey: queryKeys.study.queue(sessionId),
    queryFn: () => fetchStudyQueue(sessionId ?? ''),
    enabled: sessionId !== null,
  });
}

export function useSubmitReview(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SubmitReview) => submitReview(sessionId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
    },
  });
}

export function useCompleteStudySession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => completeStudySession(sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
  });
}

export function useAbandonStudySession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => abandonStudySession(sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
    },
  });
}

export interface OfflineQueue {
  pending: number;
  enqueue: (review: Omit<QueuedReview, 'id' | 'queuedAt'>) => void;
  sync: () => Promise<FlushResult | null>;
}

/**
 * Per-student offline review queue: scoped storage, a global `online` listener
 * and a shared in-flight flush (the server revokes reused review ids, so
 * parallel flushes are pointless).
 */
export function useOfflineQueue(): OfflineQueue {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(0);

  const sync = useCallback(async (): Promise<FlushResult | null> => {
    if (!user) {
      return null;
    }

    const result = await flushQueue(user.id, async (review) => {
      await submitReview(review.sessionId, {
        cardId: review.cardId,
        rating: review.rating,
        clientReviewId: review.clientReviewId,
      });
    });

    setPending(result.pending);

    if (result.sent > 0 || result.dropped > 0) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    }

    return result;
  }, [user, queryClient]);

  const enqueue = useCallback(
    (review: Omit<QueuedReview, 'id' | 'queuedAt'>) => {
      if (!user) {
        return;
      }

      setPending(enqueueReview(user.id, review).length);
    },
    [user],
  );

  useEffect(() => {
    if (!user) {
      setPending(0);
      return;
    }

    setPending(readQueue(user.id).length);
    void sync();

    const handleOnline = () => {
      void sync();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user, sync]);

  return { pending, enqueue, sync };
}
