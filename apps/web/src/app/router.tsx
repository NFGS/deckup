import { createBrowserRouter } from 'react-router';

import { LoginPage } from '../features/auth/login-page';
import { ProtectedRoute } from '../features/auth/protected-route';
import { RegisterPage } from '../features/auth/register-page';
import { DashboardPage } from '../features/decks/dashboard-page';
import { DeckDetailPage } from '../features/decks/deck-detail-page';
import { LandingPage } from '../features/landing/landing-page';
import { AppLayout } from './app-layout';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'decks/:deckId', element: <DeckDetailPage /> },
        ],
      },
    ],
  },
]);
