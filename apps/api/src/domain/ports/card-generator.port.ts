export interface CardGenerationRequest {
  notes: string;
  maxCards: number;
}

export interface GeneratedCard {
  front: string;
  back: string;
  hint: string | null;
}

/**
 * Draft card generation from study notes.
 *
 * Implemented in infrastructure with a provider adapter (ADR-0005 pattern);
 * suggestions are drafts the student reviews before saving.
 */
export abstract class CardGeneratorPort {
  /** Whether a provider is configured for this deployment. */
  abstract readonly isEnabled: boolean;

  abstract generate(request: CardGenerationRequest): Promise<GeneratedCard[]>;
}
