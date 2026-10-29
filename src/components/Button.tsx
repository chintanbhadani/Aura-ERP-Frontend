import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ButtonComponent, type IButtonComponentProps } from './button/ButtonComponent';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { ButtonComponent } from './button/ButtonComponent';
export * from './button/index';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'outlined' | 'ghost' | 'soft' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  loading?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  children,
  ...props
}: ButtonProps) {
  // Normalize variant
  let mappedVariant: any = variant;
  if (variant === 'outline') mappedVariant = 'outlined';
  if (variant === 'ghost') mappedVariant = 'text';

  // Normalize size
  let mappedSize: 'small' | 'medium' | 'large' = 'medium';
  if (size === 'sm' || size === 'small') mappedSize = 'small';
  if (size === 'lg' || size === 'large') mappedSize = 'large';

  return (
    <ButtonComponent
      variant={mappedVariant}
      size={mappedSize}
      fullWidth={fullWidth}
      {...(props as any)}
    >
      {children}
    </ButtonComponent>
  );
}

export default Button;
