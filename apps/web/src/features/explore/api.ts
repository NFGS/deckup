import { cloneDeckSchema, deckSchema, pageSchema, publicDeckSchema } from '@deckup/shared';
import type { CloneDeck, Deck, Page, PublicDeck, PublicDeckListQuery } from '@deckup/shared';

import { apiRequest } from '../../lib/api-client';

const publicDeckPageSchema = pageSchema(publicDeckSchema);

function toQueryString(entries: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }

  return params.toString();
}

export async function listPublicDecks(
  query: Partial<PublicDeckListQuery> = {},
): Promise<Page<PublicDeck>> {
  const search = toQueryString({
    q: query.q,
    subject: query.subject,
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 24,
  });

  return apiRequest(`/decks/public?${search}`, { schema: publicDeckPageSchema });
}

export async function cloneDeck(deckId: string, input: CloneDeck = {}): Promise<Deck> {
  return apiRequest(`/decks/${deckId}/clone`, {
    method: 'POST',
    body: cloneDeckSchema.parse(input),
    schema: deckSchema,
  });
}
