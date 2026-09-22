import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CardListQuery,
  CreateCard,
  CreateDeck,
  DeckListQuery,
  UpdateCard,
  UpdateDeck,
} from '@deckup/shared';

import { queryKeys } from '../../lib/query-keys';
import {
  createCard,
  createDeck,
  deleteCard,
  deleteDeck,
  exportDeck,
  getDeck,
  importCards,
  listCards,
  listDecks,
  updateCard,
  updateDeck,
} from './api';

export function useDecks(query: Partial<DeckListQuery> = {}) {
  return useQuery({
    queryKey: queryKeys.decks(query),
    queryFn: () => listDecks(query),
  });
}

export function useDeck(deckId: string) {
  return useQuery({
    queryKey: queryKeys.deck(deckId),
    queryFn: () => getDeck(deckId),
    enabled: deckId.length > 0,
  });
}

export function useCreateDeck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDeck) => createDeck(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['decks'] });
    },
  });
}

export function useUpdateDeck(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateDeck) => updateDeck(deckId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['decks'] });
    },
  });
}

export function useDeleteDeck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deckId: string) => deleteDeck(deckId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['decks'] });
    },
  });
}

export function useCards(deckId: string, query: Partial<CardListQuery> = {}) {
  return useQuery({
    queryKey: queryKeys.cards(deckId, query),
    queryFn: () => listCards(deckId, query),
    enabled: deckId.length > 0,
  });
}

export function useCreateCard(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCard) => createCard(deckId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['decks', deckId] });
    },
  });
}

export function useUpdateCard(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cardId, input }: { cardId: string; input: UpdateCard }) =>
      updateCard(cardId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['decks', deckId] });
    },
  });
}

export function useDeleteCard(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cardId: string) => deleteCard(cardId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['decks', deckId] });
    },
  });
}

export function useImportCards(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => importCards(deckId, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['decks', deckId] });
    },
  });
}

export function useExportDeck() {
  return useMutation({
    mutationFn: (deckId: string) => exportDeck(deckId),
  });
}
