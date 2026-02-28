import { alpha, createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1b3557',
      light: '#375b88'
    },
    secondary: {
      main: '#b54d66',
      light: '#cf768d'
    },
    success: {
      main: '#2b7a5e'
    },
    background: {
      default: '#f6f3ef',
      paper: '#ffffff'
    },
    text: {
      primary: '#1d2230',
      secondary: '#5e6472'
    },
    divider: '#e5ddd5'
  },
  shape: {
    borderRadius: 0
  },
  typography: {
    fontFamily: 'Manrope, sans-serif',
    fontSize: 13,
    button: {
      fontWeight: 700,
      fontSize: '0.85rem'
    },
    h1: {
      fontFamily: 'Playfair Display, serif',
      fontWeight: 700,
      letterSpacing: '-0.01em',
      fontSize: '1.95rem'
    },
    h2: {
      fontFamily: 'Playfair Display, serif',
      fontWeight: 700,
      letterSpacing: '-0.01em',
      fontSize: '1.7rem'
    },
    h3: {
      fontFamily: 'Playfair Display, serif',
      fontWeight: 700,
      letterSpacing: '-0.01em',
      fontSize: '1.4rem'
    },
    h4: {
      fontFamily: 'Playfair Display, serif',
      fontWeight: 700,
      letterSpacing: '-0.01em',
      fontSize: '1.2rem'
    },
    h5: {
      fontSize: '1.05rem'
    },
    h6: {
      fontSize: '0.95rem'
    },
    body1: {
      fontSize: '0.9rem'
    },
    body2: {
      fontSize: '0.82rem'
    }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          boxSizing: 'border-box'
        },
        body: {
          margin: 0,
          minHeight: '100vh',
          WebkitFontSmoothing: 'antialiased'
        },
        a: {
          color: '#1b3557'
        }
      }
    },
    MuiButton: {
      defaultProps: {
        size: 'small'
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 0,
          paddingInline: 12,
          minHeight: 34
        },
        contained: {
          boxShadow: 'none'
        }
      }
    },
    MuiTextField: {
      defaultProps: {
        size: 'small'
      }
    },
    MuiFormControl: {
      defaultProps: {
        size: 'small'
      }
    },
    MuiIconButton: {
      defaultProps: {
        size: 'small'
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          border: '1px solid #e5ddd5'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 0
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.14)'
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          height: 24
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          backgroundColor: alpha('#fff', 0.95)
        },
        input: {
          paddingTop: 9,
          paddingBottom: 9
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 0
        }
      }
    },
    MuiToolbar: {
      styleOverrides: {
        regular: {
          minHeight: 56
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          paddingTop: 8,
          paddingBottom: 8
        },
        head: {
          fontWeight: 700,
          color: '#4f5668',
          backgroundColor: '#fbf9f6'
        }
      }
    }
  }
});

export default theme;
