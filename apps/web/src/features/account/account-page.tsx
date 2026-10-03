import { zodResolver } from '@hookform/resolvers/zod';
import { updateUserSchema } from '@deckup/shared';
import type { UpdateUser } from '@deckup/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '../../components/ui/button';
import { Input, Select } from '../../components/ui/controls';
import { Field, FormError } from '../../components/ui/field';
import { Card, CardDescription, CardTitle } from '../../components/ui/surfaces';
import { ApiError } from '../../lib/api-client';
import { useAuth } from '../auth/auth-context';

const FALLBACK_TIMEZONES = [
  'UTC',
  'America/Bogota',
  'America/Mexico_City',
  'America/Lima',
  'America/Santiago',
  'America/Argentina/Buenos_Aires',
  'America/Sao_Paulo',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/Madrid',
  'Europe/London',
  'Europe/Paris',
];

function timeZoneOptions(current: string): string[] {
  let zones: string[];

  try {
    zones = Intl.supportedValuesOf('timeZone');
  } catch {
    zones = FALLBACK_TIMEZONES;
  }

  return zones.includes(current) ? zones : [current, ...zones];
}

function formatMemberSince(createdAt: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date(createdAt));
}

export function AccountPage() {
  const { user, updateProfile } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUser>({
    resolver: zodResolver(updateUserSchema),
    values: {
      displayName: user?.displayName ?? '',
      timezone: user?.timezone ?? 'UTC',
    },
  });

  if (!user) {
    return null;
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSaved(false);

    try {
      await updateProfile(values);
      setSaved(true);
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'Unable to save your profile right now',
      );
    }
  });

  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Account settings</h1>
        <p className="text-sm text-slate-400">Signed in as {user.email}.</p>
      </header>

      <Card className="flex flex-col gap-4">
        <div>
          <CardTitle as="h2">Profile</CardTitle>
          <CardDescription>
            Your name and timezone shape your streak and the dates you see.
          </CardDescription>
        </div>

        <form
          onSubmit={(event) => void onSubmit(event)}
          onChange={() => setSaved(false)}
          className="flex flex-col gap-4"
          noValidate
        >
          <FormError message={formError ?? undefined} />

          {saved ? (
            <p
              role="status"
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
            >
              Profile updated.
            </p>
          ) : null}

          <Field label="Display name" htmlFor="displayName" error={errors.displayName?.message}>
            <Input
              id="displayName"
              autoComplete="name"
              maxLength={80}
              {...register('displayName')}
            />
          </Field>

          <Field
            label="Timezone"
            htmlFor="timezone"
            error={errors.timezone?.message}
            hint="Due dates, streaks and the forecast are computed in this timezone."
          >
            <Select id="timezone" {...register('timezone')}>
              {timeZoneOptions(user.timezone).map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="flex flex-col gap-2">
        <CardTitle as="h2">Session</CardTitle>
        <dl className="grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-400">Email</dt>
            <dd className="text-slate-200">{user.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-400">Member since</dt>
            <dd className="text-slate-200">{formatMemberSince(user.createdAt)}</dd>
          </div>
        </dl>
      </Card>
    </section>
  );
}
