import { CardGeneratorPort } from '../../domain/ports/card-generator.port.js';
import type {
  CardGenerationRequest,
  GeneratedCard,
} from '../../domain/ports/card-generator.port.js';

export class FakeCardGenerator extends CardGeneratorPort {
  isEnabled = true;

  lastRequest: CardGenerationRequest | null = null;

  cards: GeneratedCard[] = [{ front: 'Q1', back: 'A1', hint: null }];

  generate(request: CardGenerationRequest): Promise<GeneratedCard[]> {
    this.lastRequest = request;
    return Promise.resolve(this.cards);
  }
}
