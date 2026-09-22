import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CloneDeck, PublicDeckListQuery } from '@deckup/shared';

import { cloneDeck, listPublicDecks } from './api';

export function usePublicDecks(query: Partial<PublicDeckListQuery> = {}) {
  return useQuery({
    queryKey: ['public-decks', query],
    queryFn: () => listPublicDecks(query),
  });
}

export function useCloneDeck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deckId, input }: { deckId: string; input?: CloneDeck }) =>
      cloneDeck(deckId, input ?? {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['decks'] });
    },
  });
}
