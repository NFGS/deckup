import type { ConfigService } from '@nestjs/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ServiceUnavailableError } from '../../domain/errors/domain-errors.js';
import { OpenAiCardGenerator } from './openai-card-generator.js';

const fetchMock = vi.fn<typeof fetch>();

function config(values: Record<string, string | undefined>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

function providerResponse(content: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve({ choices: [{ message: { content } }] }),
  } as unknown as Response;
}

function requestUrl(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  return input.url;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OpenAiCardGenerator', () => {
  const request = { notes: 'Mitosis is a type of cell division.', maxCards: 5 };

  it('is disabled without an API key', () => {
    const generator = new OpenAiCardGenerator(config({ LLM_PROVIDER: 'openai' }));

    expect(generator.isEnabled).toBe(false);
  });

  it('parses and trims a valid provider response', async () => {
    const generator = new OpenAiCardGenerator(
      config({ LLM_API_KEY: 'test-key', LLM_MODEL: 'test-model' }),
    );
    fetchMock.mockResolvedValueOnce(
      providerResponse(
        JSON.stringify({
          cards: [
            { front: '  What is mitosis?  ', back: ' Cell division ', hint: '  ' },
            { front: 'Q2', back: 'A2' },
          ],
        }),
      ),
    );

    const cards = await generator.generate(request);

    expect(cards).toEqual([
      { front: 'What is mitosis?', back: 'Cell division', hint: null },
      { front: 'Q2', back: 'A2', hint: null },
    ]);

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url && requestUrl(url)).toContain('/chat/completions');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
  });

  it('never returns more cards than requested', async () => {
    const generator = new OpenAiCardGenerator(config({ LLM_API_KEY: 'test-key' }));
    const cards = Array.from({ length: 9 }, (_, index) => ({
      front: `Q${index}`,
      back: `A${index}`,
    }));
    fetchMock.mockResolvedValueOnce(providerResponse(JSON.stringify({ cards })));

    const result = await generator.generate({ ...request, maxCards: 2 });

    expect(result).toHaveLength(2);
  });

  it('fails when the provider rejects the request', async () => {
    const generator = new OpenAiCardGenerator(config({ LLM_API_KEY: 'test-key' }));
    fetchMock.mockResolvedValueOnce(providerResponse('{}', 429));

    await expect(generator.generate(request)).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it('fails when the provider returns malformed JSON', async () => {
    const generator = new OpenAiCardGenerator(config({ LLM_API_KEY: 'test-key' }));
    fetchMock.mockResolvedValueOnce(providerResponse('not-json'));

    await expect(generator.generate(request)).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it('fails when the provider returns an unexpected shape', async () => {
    const generator = new OpenAiCardGenerator(config({ LLM_API_KEY: 'test-key' }));
    fetchMock.mockResolvedValueOnce(providerResponse(JSON.stringify({ items: [] })));

    await expect(generator.generate(request)).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it('fails when the provider is unreachable', async () => {
    const generator = new OpenAiCardGenerator(config({ LLM_API_KEY: 'test-key' }));
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    await expect(generator.generate(request)).rejects.toBeInstanceOf(ServiceUnavailableError);
  });
});
