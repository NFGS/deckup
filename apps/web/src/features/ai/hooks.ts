import { useMutation } from '@tanstack/react-query';
import type { CardSuggestionRequest } from '@deckup/shared';

import { generateCardSuggestions } from './api';

export function useGenerateCardSuggestions() {
  return useMutation({
    mutationFn: (input: CardSuggestionRequest) => generateCardSuggestions(input),
  });
}
