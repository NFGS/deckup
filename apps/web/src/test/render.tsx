import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';

import { AuthProvider } from '../features/auth/auth-provider';

export interface RenderOptions {
  route?: string;
  /** When provided, the element is rendered inside a matching <Route>. */
  path?: string;
}

export async function renderWithProviders(
  ui: ReactElement,
  { route = '/', path }: RenderOptions = {},
): Promise<RenderResult> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  let result: RenderResult | undefined;

  await act(async () => {
    result = render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MemoryRouter initialEntries={[route]}>
            {path ? (
              <Routes>
                <Route path={path} element={ui} />
              </Routes>
            ) : (
              ui
            )}
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>,
    );

    await Promise.resolve();
  });

  return result as RenderResult;
}
