import React from 'react';
import { Button as MuiButton, CircularProgress, type ButtonProps as MuiButtonProps } from '@mui/material';

export type ButtonVariant = 'primary' | 'secondary' | 'outlined' | 'soft' | 'danger' | 'contained' | 'text';

export interface IButtonComponentProps extends Omit<MuiButtonProps, 'variant' | 'color'> {
  variant?: ButtonVariant;
  color?: 'primary' | 'secondary' | 'error' | 'success' | 'warning' | 'info' | 'inherit';
  loading?: boolean;
  loadingText?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  children?: React.ReactNode;
  sx?: any;
}

export const ButtonComponent: React.FC<IButtonComponentProps> = ({
  variant = 'primary',
  size = 'small',
  loading = false,
  loadingText,
  startIcon,
  endIcon,
  disabled,
  children,
  sx = {},
  ...rest
}) => {
  // Map custom semantic variants to MUI styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
      case 'contained':
        return {
          backgroundColor: '#059669',
          color: '#ffffff',
          border: '1px solid transparent',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          '&:hover': {
            backgroundColor: '#047857',
            borderColor: 'transparent',
            boxShadow: '0 4px 6px -1px rgba(5, 150, 105, 0.25)',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
          '&:disabled': {
            backgroundColor: '#a7f3d0',
            color: '#ffffff',
            opacity: 0.7,
            cursor: 'not-allowed',
          },
        };

      case 'secondary':
        return {
          backgroundColor: '#f3f4f6',
          color: '#1f2937',
          border: '1px solid #e5e7eb',
          boxShadow: 'none',
          '&:hover': {
            backgroundColor: '#e5e7eb',
            borderColor: '#d1d5db',
            color: '#111827',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
          '&:disabled': {
            backgroundColor: '#f9fafb',
            color: '#9ca3af',
            borderColor: '#e5e7eb',
            cursor: 'not-allowed',
          },
        };

      case 'soft':
        return {
          backgroundColor: '#ecfdf5',
          color: '#065f46',
          border: '1px solid #a7f3d0',
          boxShadow: 'none',
          '&:hover': {
            backgroundColor: '#d1fae5',
            borderColor: '#6ee7b7',
            color: '#047857',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
          '&:disabled': {
            backgroundColor: '#f0fdf4',
            color: '#a7f3d0',
            borderColor: '#e5e7eb',
            cursor: 'not-allowed',
          },
        };

      case 'outlined':
        return {
          backgroundColor: '#ffffff',
          color: '#374151',
          border: '1px solid #e5e7eb',
          boxShadow: 'none',
          '&:hover': {
            backgroundColor: '#f9fafb',
            borderColor: '#cbd5e1',
            color: '#111827',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
          '&:disabled': {
            backgroundColor: '#ffffff',
            color: '#9ca3af',
            borderColor: '#e5e7eb',
            cursor: 'not-allowed',
          },
        };

      case 'danger':
        return {
          backgroundColor: '#ef4444',
          color: '#ffffff',
          border: '1px solid transparent',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          '&:hover': {
            backgroundColor: '#dc2626',
            boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.25)',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
          '&:disabled': {
            backgroundColor: '#fca5a5',
            color: '#ffffff',
            opacity: 0.7,
            cursor: 'not-allowed',
          },
        };

      case 'text':
        return {
          backgroundColor: 'transparent',
          color: '#4b5563',
          border: '1px solid transparent',
          '&:hover': {
            backgroundColor: '#f3f4f6',
            color: '#111827',
          },
          '&:disabled': {
            color: '#9ca3af',
            cursor: 'not-allowed',
          },
        };

      default:
        return {};
    }
  };

  const getHeight = () => {
    switch (size) {
      case 'small':
        return '36px';
      case 'large':
        return '44px';
      case 'medium':
      default:
        return '40px';
    }
  };

  const getPadding = () => {
    if (sx?.minWidth === 36 || sx?.width === 36) {
      return '0';
    }
    switch (size) {
      case 'small':
        return '0 14px';
      case 'large':
        return '0 20px';
      case 'medium':
      default:
        return '0 16px';
    }
  };

  const fontSize = size === 'small' ? '0.8125rem' : size === 'large' ? '0.9375rem' : '0.875rem';

  return (
    <MuiButton
      disabled={disabled || loading}
      size={size}
      startIcon={
        loading ? (
          <CircularProgress size={14} color="inherit" thickness={5} />
        ) : (
          startIcon
        )
      }
      endIcon={!loading ? endIcon : undefined}
      sx={{
        height: getHeight(),
        minHeight: getHeight(),
        px: getPadding(),
        borderRadius: '10px',
        textTransform: 'none',
        fontFamily: "'Inter', sans-serif",
        fontWeight: 600,
        fontSize,
        lineHeight: 1.25,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.15s ease-in-out',
        '& .MuiButton-startIcon': {
          marginRight: '6px',
          marginLeft: size === 'small' ? '-2px' : '-4px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        '& .MuiButton-endIcon': {
          marginLeft: '6px',
          marginRight: size === 'small' ? '-2px' : '-4px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
        ...getVariantStyles(),
        ...sx,
      }}
      {...rest}
    >
      {loading && loadingText ? loadingText : children}
    </MuiButton>
  );
};

export default ButtonComponent;
