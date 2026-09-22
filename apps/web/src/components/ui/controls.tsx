import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

import { cn } from '../../lib/utils';

const CONTROL_CLASSES = cn(
  'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100',
  'placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500',
  'disabled:cursor-not-allowed disabled:opacity-60',
);

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL_CLASSES, 'h-10', className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL_CLASSES, 'min-h-24 resize-y', className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(CONTROL_CLASSES, 'h-10', className)} {...props} />;
}
