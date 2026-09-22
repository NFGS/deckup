import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@deckup/shared';
import type { RegisterInput } from '@deckup/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/controls';
import { Field, FormError } from '../../components/ui/field';
import { ApiError } from '../../lib/api-client';
import { useAuth } from './auth-context';

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function RegisterPage() {
  const { register: registerAccount } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', displayName: '', password: '', timezone: detectTimezone() },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    try {
      await registerAccount(values);
      void navigate('/dashboard', { replace: true });
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Unable to create the account');
    }
  });

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold text-white">Create your account</h1>
        <p className="text-sm text-slate-400">
          Start building flashcard decks for your final exams.
        </p>
      </header>

      <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4" noValidate>
        <FormError message={formError ?? undefined} />

        <Field label="Name" htmlFor="displayName" error={errors.displayName?.message}>
          <Input
            id="displayName"
            autoComplete="name"
            placeholder="Ana María"
            {...register('displayName')}
          />
        </Field>

        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@school.edu"
            {...register('email')}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          hint="At least 10 characters."
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="Choose a strong password"
            {...register('password')}
          />
        </Field>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-emerald-400 hover:text-emerald-300">
          Sign in
        </Link>
      </p>
    </section>
  );
}
