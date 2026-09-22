import { importSummarySchema, userSchema } from '@deckup/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonResponse, requestUrl } from '../test/http';
import { ApiError, apiRequest, apiUpload, setAccessToken } from './api-client';

const fetchMock = vi.fn<typeof fetch>();

const VALID_SESSION = {
  accessToken: 'fresh-token',
  expiresIn: 900,
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'ana@example.com',
    displayName: 'Ana',
    timezone: 'UTC',
    createdAt: '2026-09-22T10:00:00.000Z',
  },
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  setAccessToken(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('sends the bearer token when a session exists', async () => {
    setAccessToken('token-123');
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiRequest('/decks');

    const call = fetchMock.mock.calls[0];
    const init = call?.[1];
    const headers = init?.headers as Record<string, string>;

    expect(call && requestUrl(call[0])).toContain('/decks');
    expect(headers.Authorization).toBe('Bearer token-123');
  });

  it('refreshes once and retries when the access token expired', async () => {
    setAccessToken('expired-token');
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ title: 'Unauthorized', status: 401 }, 401))
      .mockResolvedValueOnce(jsonResponse(VALID_SESSION))
      .mockResolvedValueOnce(jsonResponse({ items: [], total: 0 }));

    const result = await apiRequest<{ items: unknown[] }>('/decks');

    expect(result.items).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const refreshCall = fetchMock.mock.calls[1];
    expect(refreshCall && requestUrl(refreshCall[0])).toContain('/auth/refresh');
  });

  it('does not retry when the refresh fails', async () => {
    setAccessToken('expired-token');
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ title: 'Unauthorized', status: 401 }, 401))
      .mockResolvedValueOnce(jsonResponse({ title: 'Unauthorized', status: 401 }, 401));

    await expect(apiRequest('/decks')).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws ApiError with problem details and field errors', async () => {
    setAccessToken('token-123');
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          type: 'https://deckup.app/problems/validation',
          title: 'Validation failed',
          status: 422,
          detail: 'Request validation failed',
          errors: [{ path: 'title', message: 'Title is required' }],
        },
        422,
      ),
    );

    const error = await apiRequest('/decks', { method: 'POST', body: {} }).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(422);
    expect((error as ApiError).fieldErrors).toHaveLength(1);
  });

  it('parses responses with the provided schema', async () => {
    setAccessToken('token-123');
    fetchMock.mockResolvedValueOnce(jsonResponse({ unexpected: true }));

    await expect(apiRequest('/users/me', { schema: userSchema })).rejects.toThrow();
  });

  it('uploads multipart form data without overriding the content type', async () => {
    setAccessToken('token-123');
    fetchMock.mockResolvedValueOnce(jsonResponse({ imported: 1, skipped: 0, errors: [] }));

    const formData = new FormData();
    formData.append('file', new File(['front,back'], 'cards.csv', { type: 'text/csv' }));

    const result = await apiUpload('/decks/x/import', formData, { schema: importSummarySchema });

    expect(result.imported).toBe(1);

    const init = fetchMock.mock.calls[0]?.[1];

    expect(init?.body).toBe(formData);
    expect((init?.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  });
});
