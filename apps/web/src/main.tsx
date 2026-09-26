import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import { AppProviders } from './app/providers';
import { router } from './app/router';
import { PwaUpdatePrompt } from './components/ui/pwa-update-prompt';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
      <PwaUpdatePrompt />
    </AppProviders>
  </StrictMode>,
);
