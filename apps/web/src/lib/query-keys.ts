import type { CardListQuery, DeckListQuery, PublicDeckListQuery } from '@deckup/shared';

export const queryKeys = {
  currentUser: ['current-user'] as const,
  decks: {
    /** Prefix that matches every deck list, deck detail and card list. */
    all: ['decks'] as const,
    list: (filters: Partial<DeckListQuery>) => ['decks', filters] as const,
    detail: (deckId: string) => ['decks', deckId] as const,
    cards: (deckId: string, query: Partial<CardListQuery>) =>
      ['decks', deckId, 'cards', query] as const,
    subjects: ['decks', 'subjects'] as const,
  },
  study: {
    queue: (sessionId: string | null) => ['study', sessionId, 'queue'] as const,
  },
  analytics: {
    /** Prefix that matches the overview and every forecast window. */
    all: ['analytics'] as const,
    overview: ['analytics', 'overview'] as const,
    forecast: (days: number) => ['analytics', 'forecast', days] as const,
  },
  explore: {
    publicDecks: (query: Partial<PublicDeckListQuery>) => ['public-decks', query] as const,
  },
};
