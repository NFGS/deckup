import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@deckup/shared';
import type { LoginInput } from '@deckup/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/controls';
import { Field, FormError } from '../../components/ui/field';
import { ApiError } from '../../lib/api-client';
import { useAuth } from './auth-context';

export function LoginPage() {
  const { signIn, sessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      await signIn(values);
      const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';
      void navigate(from, { replace: true });
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Unable to sign in right now');
    }
  });

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold text-white">Welcome back</h1>
        <p className="text-sm text-slate-400">Sign in to keep your decks and streak going.</p>
      </header>

      <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4" noValidate>
        {sessionExpired ? (
          <p
            role="status"
            className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200"
          >
            Your session expired. Sign in again to continue where you left off.
          </p>
        ) : null}

        <FormError message={formError ?? undefined} />

        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@school.edu"
            {...register('email')}
          />
        </Field>

        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            {...register('password')}
          />
        </Field>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-400">
        New to DeckUp?{' '}
        <Link to="/register" className="font-medium text-emerald-400 hover:text-emerald-300">
          Create an account
        </Link>
      </p>
    </section>
  );
}
