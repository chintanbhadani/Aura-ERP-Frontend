import { createTheme, alpha } from '@mui/material/styles';

/**
 * Central Theme Color Configuration for Aura ERP.
 * Change primary here, and the entire app (MUI components + Tailwind CSS)
 * will automatically update to your new color!
 */
export const THEME_CONFIG = {
  primary: '#0f8b5a',
  primaryLight: '#34d399',
  primaryDark: '#0b6b45',
  primaryBg: '#ebf7f0',
  contrastText: '#ffffff',
  borderRadius: 14,
};

// Sync with CSS variables for Tailwind
export const applyThemeCssVariables = () => {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', THEME_CONFIG.primary);
    root.style.setProperty('--color-primary-dark', THEME_CONFIG.primaryDark);
    root.style.setProperty('--color-primary-light', THEME_CONFIG.primaryLight);
    root.style.setProperty('--color-primary-bg', THEME_CONFIG.primaryBg);
  }
};

applyThemeCssVariables();

export const auraTheme = createTheme({
  palette: {
    primary: {
      main: THEME_CONFIG.primary,
      light: THEME_CONFIG.primaryLight,
      dark: THEME_CONFIG.primaryDark,
      contrastText: THEME_CONFIG.contrastText,
    },
    success: {
      main: THEME_CONFIG.primary,
      light: THEME_CONFIG.primaryLight,
      dark: THEME_CONFIG.primaryDark,
    },
    error: {
      main: '#ef4444',
    },
    background: {
      default: THEME_CONFIG.primaryBg,
      paper: '#ffffff',
    },
    text: {
      primary: '#111827',
      secondary: '#4b5563',
    },
  },
  shape: {
    borderRadius: THEME_CONFIG.borderRadius,
  },
  typography: {
    fontFamily: 'inherit',
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: ({ ownerState }: { ownerState: any }) => ({
          borderRadius: 9999,
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
          transition: 'all 0.15s ease-in-out',
          '&:hover': {
            boxShadow: 'none',
          },
          ...(ownerState?.variant === 'contained' && ownerState?.color === 'primary' && {
            backgroundColor: THEME_CONFIG.primary,
            color: THEME_CONFIG.contrastText,
            '&:hover': {
              backgroundColor: THEME_CONFIG.primaryDark,
            },
          }),
          ...(ownerState?.variant === 'outlined' && ownerState?.color === 'primary' && {
            borderColor: '#e5e7eb',
            color: THEME_CONFIG.primary,
            '&:hover': {
              borderColor: THEME_CONFIG.primary,
              backgroundColor: alpha(THEME_CONFIG.primary, 0.08),
            },
          }),
          ...(ownerState?.variant === 'text' && ownerState?.color === 'primary' && {
            color: THEME_CONFIG.primary,
            '&:hover': {
              backgroundColor: alpha(THEME_CONFIG.primary, 0.08),
            },
          }),
        }),
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: THEME_CONFIG.borderRadius,
          backgroundColor: '#ffffff',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#e5e7eb',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: THEME_CONFIG.primary,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: THEME_CONFIG.primary,
            borderWidth: 2,
          },
          '&.Mui-error .MuiOutlinedInput-notchedOutline': {
            borderColor: '#ef4444',
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          '&.Mui-focused': {
            color: THEME_CONFIG.primary,
          },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          marginLeft: 4,
          marginTop: 4,
          fontSize: '0.75rem',
          fontWeight: 500,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        colorPrimary: {
          color: THEME_CONFIG.primary,
          '&:hover': {
            backgroundColor: alpha(THEME_CONFIG.primary, 0.08),
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        colorPrimary: {
          '&.Mui-checked': {
            color: THEME_CONFIG.primary,
          },
        },
      },
    },
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: THEME_CONFIG.primary,
            color: '#ffffff',
            '&:hover': {
              backgroundColor: THEME_CONFIG.primaryDark,
            },
          },
        },
      },
    },
  },
});
