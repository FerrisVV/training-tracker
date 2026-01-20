'use client'

import { createTheme } from '@mui/material/styles'

// Material You (Pixel-style) Theme Configuration
export const theme = createTheme({
  shape: {
    borderRadius: 20, // Pixel roundedness
  },
  palette: {
    mode: 'light',
    primary: {
      main: '#6750A4', // Material You purple
      light: '#EADDFF',
      dark: '#21005D',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#625B71',
      light: '#E8DEF8',
      dark: '#1D192B',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#BA1A1A',
      light: '#FFDAD6',
      dark: '#410002',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FFFBFE',
      paper: '#F7F2FA',
    },
    text: {
      primary: '#1C1B1F',
      secondary: '#49454F',
    },
  },
  typography: {
    fontFamily: '"Roboto", "system-ui", sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
    h1: {
      fontSize: '3.5rem',
      fontWeight: 700,
    },
    h2: {
      fontSize: '2.5rem',
      fontWeight: 700,
    },
    h3: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999, // Pill shape
          padding: '10px 24px',
          transition: 'all 200ms cubic-bezier(0.2, 0, 0, 1)',
          '&:active': {
            transform: 'scale(0.97)', // Subtle press animation
          },
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          transition: 'box-shadow 250ms cubic-bezier(0.2, 0, 0, 1)',
          boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
          '&:hover': {
            boxShadow: '0px 4px 8px 3px rgba(0, 0, 0, 0.15), 0px 1px 3px rgba(0, 0, 0, 0.3)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: 'all 200ms cubic-bezier(0.2, 0, 0, 1)',
          '&:active': {
            transform: 'scale(0.95)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            transition: 'all 200ms cubic-bezier(0.2, 0, 0, 1)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          transition: 'box-shadow 250ms cubic-bezier(0.2, 0, 0, 1)',
        },
        elevation1: {
          boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)',
        },
        elevation2: {
          boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15)',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          transition: 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          transition: 'all 200ms cubic-bezier(0.2, 0, 0, 1)',
          '&:active': {
            transform: 'scale(0.9)',
          },
        },
      },
    },
  },
})
