import { createBrowserRouter } from 'react-router';

import { AccountPage } from '../features/account/account-page';
import { LoginPage } from '../features/auth/login-page';
import { ProtectedRoute } from '../features/auth/protected-route';
import { RegisterPage } from '../features/auth/register-page';
import { DashboardPage } from '../features/decks/dashboard-page';
import { DeckDetailPage } from '../features/decks/deck-detail-page';
import { ExplorePage } from '../features/explore/explore-page';
import { LandingPage } from '../features/landing/landing-page';
import { AppLayout } from './app-layout';
import { NotFoundPage } from './not-found-page';
import { RouteErrorPage } from './route-error-page';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'account', element: <AccountPage /> },
          { path: 'explore', element: <ExplorePage /> },
          { path: 'decks/:deckId', element: <DeckDetailPage /> },
          {
            path: 'decks/:deckId/study',
            lazy: async () => {
              const module = await import('../features/study/study-session-page');
              return { Component: module.StudySessionPage };
            },
          },
          {
            path: 'analytics',
            lazy: async () => {
              const module = await import('../features/analytics/analytics-page');
              return { Component: module.AnalyticsPage };
            },
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
