import { cloneElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { cn } from '../../lib/utils';

export interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

interface AriaProps {
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  const hintId = `${htmlFor}-hint`;
  const errorId = `${htmlFor}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<AriaProps>, {
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })
    : children;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-200">
        {label}
      </label>
      {control}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-slate-400">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-rose-400">
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
