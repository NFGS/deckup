import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { jsonResponse, requestUrl } from '../../test/http';
import { renderWithProviders } from '../../test/render';
import { LoginPage } from './login-page';

const fetchMock = vi.fn<typeof fetch>();

const VALID_SESSION = {
  accessToken: 'access-token',
  expiresIn: 900,
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'ana@example.com',
    displayName: 'Ana',
    timezone: 'UTC',
    createdAt: '2026-09-22T10:00:00.000Z',
  },
};

function callsTo(path: string): typeof fetchMock.mock.calls {
  return fetchMock.mock.calls.filter(([input]) => requestUrl(input).includes(path));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation((input) => {
    const url = requestUrl(input);

    if (url.includes('/auth/refresh')) {
      return Promise.resolve(jsonResponse({ title: 'Unauthorized', status: 401 }, 401));
    }

    if (url.includes('/auth/login')) {
      return Promise.resolve(jsonResponse(VALID_SESSION));
    }

    return Promise.resolve(jsonResponse({ title: 'Not found', status: 404 }, 404));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LoginPage', () => {
  it('renders the sign-in form', () => {
    renderWithProviders(<LoginPage />, { route: '/login' });

    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty fields', async () => {
    renderWithProviders(<LoginPage />, { route: '/login' });

    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    const alerts = await screen.findAllByRole('alert');

    expect(alerts).toHaveLength(2);
    expect(callsTo('/auth/login')).toHaveLength(0);
  });

  it('posts the credentials to the API', async () => {
    renderWithProviders(<LoginPage />, { route: '/login' });

    await userEvent.type(screen.getByLabelText('Email'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'super-secret-1');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => expect(callsTo('/auth/login')).toHaveLength(1));

    const body = callsTo('/auth/login')[0]?.[1]?.body;

    if (typeof body !== 'string') {
      throw new Error('Expected the login request body to be a JSON string');
    }

    expect(JSON.parse(body) as { email: string; password: string }).toEqual({
      email: 'ana@example.com',
      password: 'super-secret-1',
    });
  });
});
