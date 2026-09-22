import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/utils';

type BadgeTone = 'neutral' | 'emerald' | 'amber' | 'sky';

const TONES: Record<BadgeTone, string> = {
  neutral: 'border-slate-700 bg-slate-800/70 text-slate-300',
  emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  amber: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  sky: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
};

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-slate-800 bg-slate-900/60 p-5', className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-base font-semibold text-white', className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-slate-400', className)} {...props} />;
}

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <svg
      role="status"
      aria-label={label}
      className={cn('h-5 w-5 animate-spin text-slate-400', className)}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx={12} cy={12} r={10} stroke="currentColor" strokeWidth={3} className="opacity-25" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-12 text-center">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      {description ? <p className="max-w-md text-sm text-slate-400">{description}</p> : null}
      {action}
    </div>
  );
}
