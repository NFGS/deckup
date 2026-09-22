import {
  cardSchema,
  createCardSchema,
  createDeckSchema,
  deckSchema,
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
  Page,
  UpdateCard,
  UpdateDeck,
} from '@deckup/shared';

import { apiRequest } from '../../lib/api-client';

const deckPageSchema = pageSchema(deckSchema);
const cardPageSchema = pageSchema(cardSchema);

function toQueryString(entries: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }

  return params.toString();
}

export async function listDecks(query: Partial<DeckListQuery> = {}): Promise<Page<Deck>> {
  const search = toQueryString({
    q: query.q,
    subject: query.subject,
    tag: query.tag,
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 24,
  });

  return apiRequest(`/decks?${search}`, { schema: deckPageSchema });
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
): Promise<Page<Card>> {
  const search = toQueryString({
    q: query.q,
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 50,
  });

  return apiRequest(`/decks/${deckId}/cards?${search}`, { schema: cardPageSchema });
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
