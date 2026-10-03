import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonResponse, requestUrl } from '../../test/http';
import { renderWithProviders } from '../../test/render';
import { AccountPage } from './account-page';

const fetchMock = vi.fn<typeof fetch>();

const USER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ana@example.com',
  displayName: 'Ana',
  timezone: 'America/Bogota',
  createdAt: '2026-09-22T10:00:00.000Z',
};

const SESSION = {
  accessToken: 'access-token',
  expiresIn: 900,
  user: USER,
};

let patchResponse: Response;

function callsTo(path: string, method?: string): typeof fetchMock.mock.calls {
  return fetchMock.mock.calls.filter(([input, init]) => {
    const url = requestUrl(input);
    return url.includes(path) && (method === undefined || init?.method === method);
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  patchResponse = jsonResponse({ ...USER, displayName: 'Ana María' });

  fetchMock.mockImplementation((input, init) => {
    const url = requestUrl(input);

    if (url.includes('/auth/refresh')) {
      return Promise.resolve(jsonResponse(SESSION));
    }

    if (url.includes('/users/me') && init?.method === 'PATCH') {
      return Promise.resolve(patchResponse);
    }

    if (url.includes('/users/me')) {
      return Promise.resolve(jsonResponse(USER));
    }

    return Promise.resolve(jsonResponse({ title: 'Not found', status: 404 }, 404));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AccountPage', () => {
  it('prefills the profile with the signed-in student', async () => {
    await renderWithProviders(<AccountPage />, { route: '/account' });

    expect(await screen.findByLabelText('Display name')).toHaveValue('Ana');
    expect(screen.getByLabelText('Timezone')).toHaveValue('America/Bogota');
    expect(screen.getByText(/signed in as/i)).toHaveTextContent('ana@example.com');
  });

  it('saves the profile and confirms the update', async () => {
    await renderWithProviders(<AccountPage />, { route: '/account' });

    const displayName = await screen.findByLabelText('Display name');
    await userEvent.clear(displayName);
    await userEvent.type(displayName, 'Ana María');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/profile updated/i);

    const patches = callsTo('/users/me', 'PATCH');
    expect(patches).toHaveLength(1);

    const body = patches[0]?.[1]?.body;

    if (typeof body !== 'string') {
      throw new Error('Expected the profile request body to be a JSON string');
    }

    expect(JSON.parse(body) as { displayName: string; timezone: string }).toEqual({
      displayName: 'Ana María',
      timezone: 'America/Bogota',
    });
  });

  it('surfaces API errors when the update is rejected', async () => {
    patchResponse = jsonResponse(
      {
        type: 'about:blank',
        title: 'Unprocessable Entity',
        status: 422,
        detail: 'Use a valid IANA timezone like America/Bogota',
      },
      422,
    );

    await renderWithProviders(<AccountPage />, { route: '/account' });

    await screen.findByLabelText('Display name');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/valid IANA timezone/i);
  });
});
