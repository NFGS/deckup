import {
  cardSchema,
  createCardSchema,
  createDeckSchema,
  deckSchema,
  deckSubjectsResponseSchema,
  importSummarySchema,
  pageSchema,
  updateCardSchema,
  updateDeckSchema,
} from '@deckup/shared';
import type {
  Card,
  CardListQuery,
  CreateCard,
  CreateDeck,
  Deck,
  DeckListQuery,
  DeckSubjectsResponse,
  ImportSummary,
  Page,
  UpdateCard,
  UpdateDeck,
} from '@deckup/shared';

import { apiDownload, apiRequest, apiUpload } from '../../lib/api-client';
import type { DownloadedFile } from '../../lib/api-client';
import { toQueryString } from '../../lib/query-string';

const deckPageSchema = pageSchema(deckSchema);
const cardPageSchema = pageSchema(cardSchema);

export async function listDecks(
  query: Partial<DeckListQuery> = {},
  signal?: AbortSignal,
): Promise<Page<Deck>> {
  const search = toQueryString({
    q: query.q,
    subject: query.subject,
    tag: query.tag,
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 24,
  });

  return apiRequest(`/decks?${search}`, { schema: deckPageSchema, signal });
}

export async function listDeckSubjects(signal?: AbortSignal): Promise<DeckSubjectsResponse> {
  return apiRequest('/decks/subjects', { schema: deckSubjectsResponseSchema, signal });
}

export async function getDeck(deckId: string): Promise<Deck> {
  return apiRequest(`/decks/${deckId}`, { schema: deckSchema });
}

export async function createDeck(input: CreateDeck): Promise<Deck> {
  return apiRequest('/decks', {
    method: 'POST',
    body: createDeckSchema.parse(input),
    schema: deckSchema,
  });
}

export async function updateDeck(deckId: string, input: UpdateDeck): Promise<Deck> {
  return apiRequest(`/decks/${deckId}`, {
    method: 'PATCH',
    body: updateDeckSchema.parse(input),
    schema: deckSchema,
  });
}

export async function deleteDeck(deckId: string): Promise<void> {
  await apiRequest(`/decks/${deckId}`, { method: 'DELETE' });
}

export async function listCards(
  deckId: string,
  query: Partial<CardListQuery> = {},
  signal?: AbortSignal,
): Promise<Page<Card>> {
  const search = toQueryString({
    q: query.q,
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 50,
  });

  return apiRequest(`/decks/${deckId}/cards?${search}`, { schema: cardPageSchema, signal });
}

export async function createCard(deckId: string, input: CreateCard): Promise<Card> {
  return apiRequest(`/decks/${deckId}/cards`, {
    method: 'POST',
    body: createCardSchema.parse(input),
    schema: cardSchema,
  });
}

export async function updateCard(cardId: string, input: UpdateCard): Promise<Card> {
  return apiRequest(`/cards/${cardId}`, {
    method: 'PATCH',
    body: updateCardSchema.parse(input),
    schema: cardSchema,
  });
}

export async function deleteCard(cardId: string): Promise<void> {
  await apiRequest(`/cards/${cardId}`, { method: 'DELETE' });
}

export async function uploadCardImage(cardId: string, file: File): Promise<Card> {
  const formData = new FormData();
  formData.append('file', file);

  return apiUpload(`/cards/${cardId}/image`, formData, { schema: cardSchema });
}

export async function removeCardImage(cardId: string): Promise<Card> {
  return apiRequest(`/cards/${cardId}/image`, { method: 'DELETE', schema: cardSchema });
}

export async function importCards(deckId: string, file: File): Promise<ImportSummary> {
  const formData = new FormData();
  formData.append('file', file);

  return apiUpload(`/decks/${deckId}/import`, formData, { schema: importSummarySchema });
}

export async function exportDeck(deckId: string): Promise<DownloadedFile> {
  return apiDownload(`/decks/${deckId}/export`);
}
