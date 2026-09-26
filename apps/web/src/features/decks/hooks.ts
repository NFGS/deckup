import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
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
  listDeckSubjects,
  listDecks,
  removeCardImage,
  updateCard,
  updateDeck,
  uploadCardImage,
} from './api';

/** Refreshes every deck view plus the analytics derived from them. */
function invalidateDeckData(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.decks.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
}

export function useDecks(query: Partial<DeckListQuery> = {}) {
  return useQuery({
    queryKey: queryKeys.decks.list(query),
    queryFn: ({ signal }) => listDecks(query, signal),
    placeholderData: keepPreviousData,
  });
}

export function useDeckSubjects() {
  return useQuery({
    queryKey: queryKeys.decks.subjects,
    queryFn: ({ signal }) => listDeckSubjects(signal),
  });
}

export function useDeck(deckId: string) {
  return useQuery({
    queryKey: queryKeys.decks.detail(deckId),
    queryFn: () => getDeck(deckId),
    enabled: deckId.length > 0,
  });
}

export function useCreateDeck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDeck) => createDeck(input),
    onSuccess: () => invalidateDeckData(queryClient),
  });
}

export function useUpdateDeck(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateDeck) => updateDeck(deckId, input),
    onSuccess: () => invalidateDeckData(queryClient),
  });
}

export function useDeleteDeck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deckId: string) => deleteDeck(deckId),
    onSuccess: () => invalidateDeckData(queryClient),
  });
}

export function useCards(deckId: string, query: Partial<CardListQuery> = {}) {
  return useQuery({
    queryKey: queryKeys.decks.cards(deckId, query),
    queryFn: ({ signal }) => listCards(deckId, query, signal),
    enabled: deckId.length > 0,
    placeholderData: keepPreviousData,
  });
}

export function useCreateCard(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCard) => createCard(deckId, input),
    onSuccess: () => invalidateDeckData(queryClient),
  });
}

export function useUpdateCard(_deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cardId, input }: { cardId: string; input: UpdateCard }) =>
      updateCard(cardId, input),
    onSuccess: () => invalidateDeckData(queryClient),
  });
}

export function useDeleteCard(_deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cardId: string) => deleteCard(cardId),
    onSuccess: () => invalidateDeckData(queryClient),
  });
}

export function useUploadCardImage(_deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cardId, file }: { cardId: string; file: File }) => uploadCardImage(cardId, file),
    onSuccess: () => invalidateDeckData(queryClient),
  });
}

export function useRemoveCardImage(_deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cardId: string) => removeCardImage(cardId),
    onSuccess: () => invalidateDeckData(queryClient),
  });
}

export function useImportCards(deckId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => importCards(deckId, file),
    onSuccess: () => invalidateDeckData(queryClient),
  });
}

export function useExportDeck() {
  return useMutation({
    mutationFn: (deckId: string) => exportDeck(deckId),
  });
}
