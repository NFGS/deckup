import { Navigate, Outlet, useLocation } from 'react-router';

import { Spinner } from '../../components/ui/surfaces';
import { useAuth } from './auth-context';

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner label="Restoring session" />
      </div>
    );
  }

  if (status === 'anonymous') {
    const from = `${location.pathname}${location.search}${location.hash}`;

    return <Navigate to="/login" replace state={{ from }} />;
  }

  return <Outlet />;
}
