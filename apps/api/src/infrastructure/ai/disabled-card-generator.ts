import { ServiceUnavailableError } from '../../domain/errors/domain-errors.js';
import { CardGeneratorPort } from '../../domain/ports/card-generator.port.js';
import type { GeneratedCard } from '../../domain/ports/card-generator.port.js';

/**
 * Fallback used when no LLM provider is configured: the endpoint answers 503
 * instead of failing unexpectedly.
 */
export class DisabledCardGenerator extends CardGeneratorPort {
  readonly isEnabled = false;

  generate(): Promise<GeneratedCard[]> {
    return Promise.reject(
      new ServiceUnavailableError('AI card generation is not configured on this deployment'),
    );
  }
}
