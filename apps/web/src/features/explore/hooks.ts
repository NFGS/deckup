import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CloneDeck, PublicDeckListQuery } from '@deckup/shared';

import { queryKeys } from '../../lib/query-keys';
import { cloneDeck, listPublicDecks } from './api';

export function usePublicDecks(query: Partial<PublicDeckListQuery> = {}) {
  return useQuery({
    queryKey: queryKeys.explore.publicDecks(query),
    queryFn: ({ signal }) => listPublicDecks(query, signal),
    placeholderData: keepPreviousData,
  });
}

export function useCloneDeck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deckId, input }: { deckId: string; input?: CloneDeck }) =>
      cloneDeck(deckId, input ?? {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
    },
  });
}
