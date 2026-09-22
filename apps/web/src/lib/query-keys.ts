import type { CardListQuery, DeckListQuery } from '@deckup/shared';

export const queryKeys = {
  currentUser: ['current-user'] as const,
  decks: (filters: Partial<DeckListQuery>) => ['decks', filters] as const,
  deck: (deckId: string) => ['decks', deckId] as const,
  cards: (deckId: string, query: Partial<CardListQuery>) =>
    ['decks', deckId, 'cards', query] as const,
};
