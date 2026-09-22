import type { ReactNode } from 'react';

import { cn } from '../../lib/utils';

export interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-200">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-slate-500">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-xs text-rose-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p
      role="alert"
      className={cn(
        'rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200',
      )}
    >
      {message}
    </p>
  );
}
