import React, { useState } from 'react';
import { cn } from './Button';
import { Eye, EyeOff } from 'lucide-react';

export * from './input/index';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordType = type === 'password';
    const computedType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type={computedType}
            className={cn(
              'flex h-11 w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-transparent',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium',
              'placeholder:text-gray-400',
              isPasswordType && 'pr-11',
              error && 'border-red-500 focus-visible:ring-red-500',
              className
            )}
            {...props}
          />
          {isPasswordType && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none p-1 rounded-lg transition-colors cursor-pointer"
              tabIndex={-1}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <Eye className="w-4 h-4" />
              ) : (
                <EyeOff className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-500">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
