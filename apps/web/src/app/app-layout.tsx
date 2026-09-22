import { Suspense } from 'react';
import { Link, Outlet, useNavigate } from 'react-router';

import { Button } from '../components/ui/button';
import { LogOutIcon } from '../components/ui/icons';
import { Spinner } from '../components/ui/surfaces';
import { useAuth } from '../features/auth/auth-context';

export function AppLayout() {
  const { status, user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    void navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-emerald-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-black tracking-tight text-white">
            DeckUp
          </Link>

          <nav className="flex items-center gap-3">
            {status === 'authenticated' ? (
              <>
                <Link to="/dashboard" className="text-sm text-slate-300 hover:text-white">
                  My decks
                </Link>
                <Link to="/analytics" className="text-sm text-slate-300 hover:text-white">
                  Analytics
                </Link>
                <span className="hidden text-sm text-slate-400 sm:inline">{user?.displayName}</span>
                <Button variant="ghost" size="sm" onClick={() => void handleSignOut()}>
                  <LogOutIcon className="h-4 w-4" />
                  Sign out
                </Button>
              </>
            ) : status === 'anonymous' ? (
              <>
                <Link to="/login" className="text-sm text-slate-300 hover:text-white">
                  Sign in
                </Link>
                <Link to="/register">
                  <Button size="sm">Create account</Button>
                </Link>
              </>
            ) : null}
          </nav>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <Suspense
          fallback={
            <div className="flex justify-center py-16">
              <Spinner label="Loading page" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-400">
        DeckUp · Epic 03 — Education
      </footer>
    </div>
  );
}
