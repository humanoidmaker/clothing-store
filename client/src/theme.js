import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1f3a5f'
    },
    secondary: {
      main: '#c15b73'
    },
    background: {
      default: '#f6f2ed',
      paper: '#ffffff'
    },
    text: {
      primary: '#1e1f24',
      secondary: '#5f6470'
    }
  },
  shape: {
    borderRadius: 14
  },
  typography: {
    fontFamily: 'Manrope, sans-serif',
    h1: {
      fontFamily: 'Playfair Display, serif',
      fontWeight: 700
    },
    h2: {
      fontFamily: 'Playfair Display, serif',
      fontWeight: 700
    },
    h3: {
      fontFamily: 'Playfair Display, serif',
      fontWeight: 700
    },
    h4: {
      fontFamily: 'Playfair Display, serif',
      fontWeight: 700
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 999
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 12px 30px rgba(31, 58, 95, 0.08)'
        }
      }
    }
  }
});

export default theme;
