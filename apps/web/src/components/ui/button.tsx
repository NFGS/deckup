import type { ButtonHTMLAttributes } from 'react';

import { cn } from '../../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 focus-visible:outline-emerald-400',
  secondary:
    'border border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 focus-visible:outline-slate-500',
  ghost: 'text-slate-300 hover:bg-slate-800 hover:text-white focus-visible:outline-slate-500',
  danger: 'bg-rose-600 text-white hover:bg-rose-500 focus-visible:outline-rose-400',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition',
        'focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
