import type { ConfigService } from '@nestjs/config';
import { z } from 'zod';

import { ServiceUnavailableError } from '../../domain/errors/domain-errors.js';
import { CardGeneratorPort } from '../../domain/ports/card-generator.port.js';
import type {
  CardGenerationRequest,
  GeneratedCard,
} from '../../domain/ports/card-generator.port.js';

const SYSTEM_PROMPT = [
  'You create study flashcards for high-school students preparing final exams.',
  'Reply with strict JSON only: {"cards":[{"front":"...","back":"...","hint":"..."}]}.',
  'Each front is one focused question; each back is a concise answer; hint is optional.',
  'Write in the language of the notes and never invent facts that are not in them.',
].join(' ');

const providerResponseSchema = z.object({
  cards: z.array(
    z.object({
      front: z.string().min(1),
      back: z.string().min(1),
      hint: z.string().nullish(),
    }),
  ),
});

/**
 * OpenAI-compatible chat completions adapter (works with any gateway that
 * exposes the same contract through `LLM_BASE_URL`).
 */
export class OpenAiCardGenerator extends CardGeneratorPort {
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    super();
    this.apiKey = config.get<string>('LLM_API_KEY');
    this.model = config.get<string>('LLM_MODEL') ?? 'gpt-4o-mini';
    this.baseUrl = (config.get<string>('LLM_BASE_URL') ?? 'https://api.openai.com/v1').replace(
      /\/$/,
      '',
    );
  }

  get isEnabled(): boolean {
    return Boolean(this.apiKey);
  }

  async generate({ notes, maxCards }: CardGenerationRequest): Promise<GeneratedCard[]> {
    if (!this.apiKey) {
      throw new ServiceUnavailableError('AI card generation is not configured');
    }

    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.3,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Create at most ${maxCards} flashcards from these notes:\n\n${notes}`,
            },
          ],
        }),
      });
    } catch {
      throw new ServiceUnavailableError('The AI provider could not be reached');
    }

    if (!response.ok) {
      throw new ServiceUnavailableError(
        `The AI provider rejected the request (${response.status})`,
      );
    }

    const content = extractContent(await response.json());

    if (content === null) {
      throw new ServiceUnavailableError('The AI provider returned an unexpected payload');
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new ServiceUnavailableError('The AI provider returned malformed JSON');
    }

    const result = providerResponseSchema.safeParse(parsed);

    if (!result.success) {
      throw new ServiceUnavailableError('The AI provider returned an unexpected shape');
    }

    return result.data.cards.slice(0, maxCards).map((card) => ({
      front: card.front.trim(),
      back: card.back.trim(),
      hint: card.hint?.trim() ? card.hint.trim() : null,
    }));
  }
}

function extractContent(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }

  const choices = (payload as { choices?: unknown }).choices;

  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }

  const first = choices[0] as { message?: { content?: unknown } };
  const content = first?.message?.content;

  return typeof content === 'string' ? content : null;
}
