import { cardSuggestionResponseSchema, cardSuggestionRequestSchema } from '@deckup/shared';
import type { CardSuggestionRequest, CardSuggestionResponse } from '@deckup/shared';

import { apiRequest } from '../../lib/api-client';

export async function generateCardSuggestions(
  input: CardSuggestionRequest,
): Promise<CardSuggestionResponse> {
  return apiRequest('/ai/card-suggestions', {
    method: 'POST',
    body: cardSuggestionRequestSchema.parse(input),
    schema: cardSuggestionResponseSchema,
  });
}
