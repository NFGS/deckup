import { cloneDeckSchema, deckSchema, pageSchema, publicDeckSchema } from '@deckup/shared';
import type { CloneDeck, Deck, Page, PublicDeck, PublicDeckListQuery } from '@deckup/shared';

import { apiRequest } from '../../lib/api-client';
import { toQueryString } from '../../lib/query-string';

const publicDeckPageSchema = pageSchema(publicDeckSchema);

export async function listPublicDecks(
  query: Partial<PublicDeckListQuery> = {},
  signal?: AbortSignal,
): Promise<Page<PublicDeck>> {
  const search = toQueryString({
    q: query.q,
    subject: query.subject,
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 24,
  });

  return apiRequest(`/decks/public?${search}`, { schema: publicDeckPageSchema, signal });
}

export async function cloneDeck(deckId: string, input: CloneDeck = {}): Promise<Deck> {
  return apiRequest(`/decks/${deckId}/clone`, {
    method: 'POST',
    body: cloneDeckSchema.parse(input),
    schema: deckSchema,
  });
}
