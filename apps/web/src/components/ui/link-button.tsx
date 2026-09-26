import type { ComponentProps } from 'react';
import { Link } from 'react-router';

import { buttonClassName } from './button-styles';
import type { ButtonSize, ButtonVariant } from './button-styles';

export interface LinkButtonProps extends Omit<ComponentProps<typeof Link>, 'className'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

/**
 * A router link styled as a button. Prefer this over nesting a `<button>`
 * inside a link, which creates two focus stops and invalid HTML.
 */
export function LinkButton({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: LinkButtonProps) {
  return <Link className={buttonClassName(variant, size, className)} {...props} />;
}
