import { alpha, createTheme } from '@mui/material/styles';

export const fontFamilyOptions = [
  { label: 'Manrope', value: 'Manrope', css: 'Manrope, sans-serif' },
  { label: 'Poppins', value: 'Poppins', css: 'Poppins, sans-serif' },
  { label: 'Nunito Sans', value: 'Nunito Sans', css: '"Nunito Sans", sans-serif' },
  { label: 'Lato', value: 'Lato', css: 'Lato, sans-serif' },
  { label: 'Inter', value: 'Inter', css: 'Inter, sans-serif' },
  { label: 'Playfair Display', value: 'Playfair Display', css: '"Playfair Display", serif' },
  { label: 'Merriweather', value: 'Merriweather', css: 'Merriweather, serif' },
  { label: 'Lora', value: 'Lora', css: 'Lora, serif' },
  { label: 'Roboto Slab', value: 'Roboto Slab', css: '"Roboto Slab", serif' }
];

export const defaultThemeSettings = {
  primaryColor: '#1b3557',
  secondaryColor: '#b54d66',
  backgroundDefault: '#f6f3ef',
  backgroundPaper: '#ffffff',
  textPrimary: '#1d2230',
  textSecondary: '#5e6472',
  bodyFontFamily: 'Manrope',
  headingFontFamily: 'Playfair Display'
};

const hexColorPattern = /^#([0-9a-f]{6})$/i;

const resolveThemeColor = (candidate, fallback) => {
  const normalized = String(candidate || '').trim();
  if (hexColorPattern.test(normalized)) return normalized;
  return fallback;
};

const resolveFontCss = (fontValue, fallbackValue) => {
  const selected = fontFamilyOptions.find((item) => item.value === String(fontValue || '').trim());
  if (selected) return selected.css;

  const fallback = fontFamilyOptions.find((item) => item.value === fallbackValue);
  return fallback ? fallback.css : 'sans-serif';
};

export const normalizeThemeSettings = (themeSettings = {}) => ({
  primaryColor: resolveThemeColor(themeSettings.primaryColor, defaultThemeSettings.primaryColor),
  secondaryColor: resolveThemeColor(themeSettings.secondaryColor, defaultThemeSettings.secondaryColor),
  backgroundDefault: resolveThemeColor(themeSettings.backgroundDefault, defaultThemeSettings.backgroundDefault),
  backgroundPaper: resolveThemeColor(themeSettings.backgroundPaper, defaultThemeSettings.backgroundPaper),
  textPrimary: resolveThemeColor(themeSettings.textPrimary, defaultThemeSettings.textPrimary),
  textSecondary: resolveThemeColor(themeSettings.textSecondary, defaultThemeSettings.textSecondary),
  bodyFontFamily: String(themeSettings.bodyFontFamily || '').trim() || defaultThemeSettings.bodyFontFamily,
  headingFontFamily: String(themeSettings.headingFontFamily || '').trim() || defaultThemeSettings.headingFontFamily
});

export const createAppTheme = (themeSettings = defaultThemeSettings) => {
  const normalized = normalizeThemeSettings(themeSettings);
  const bodyFontCss = resolveFontCss(normalized.bodyFontFamily, defaultThemeSettings.bodyFontFamily);
  const headingFontCss = resolveFontCss(normalized.headingFontFamily, defaultThemeSettings.headingFontFamily);

  return createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: normalized.primaryColor,
        light: alpha(normalized.primaryColor, 0.78)
      },
      secondary: {
        main: normalized.secondaryColor,
        light: alpha(normalized.secondaryColor, 0.78)
      },
      success: {
        main: '#2b7a5e'
      },
      background: {
        default: normalized.backgroundDefault,
        paper: normalized.backgroundPaper
      },
      text: {
        primary: normalized.textPrimary,
        secondary: normalized.textSecondary
      },
      divider: alpha(normalized.textPrimary, 0.14)
    },
    shape: {
      borderRadius: 0
    },
    typography: {
      fontFamily: bodyFontCss,
      fontSize: 13,
      button: {
        fontWeight: 700,
        fontSize: '0.85rem'
      },
      h1: {
        fontFamily: headingFontCss,
        fontWeight: 700,
        letterSpacing: '-0.01em',
        fontSize: '1.95rem'
      },
      h2: {
        fontFamily: headingFontCss,
        fontWeight: 700,
        letterSpacing: '-0.01em',
        fontSize: '1.7rem'
      },
      h3: {
        fontFamily: headingFontCss,
        fontWeight: 700,
        letterSpacing: '-0.01em',
        fontSize: '1.4rem'
      },
      h4: {
        fontFamily: headingFontCss,
        fontWeight: 700,
        letterSpacing: '-0.01em',
        fontSize: '1.2rem'
      },
      h5: {
        fontFamily: headingFontCss,
        fontSize: '1.05rem'
      },
      h6: {
        fontFamily: headingFontCss,
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
        styleOverrides: (muiTheme) => ({
          '*': {
            boxSizing: 'border-box'
          },
          body: {
            margin: 0,
            minHeight: '100vh',
            WebkitFontSmoothing: 'antialiased'
          },
          a: {
            color: muiTheme.palette.primary.main
          }
        })
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
            border: `1px solid ${alpha(normalized.textPrimary, 0.14)}`
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
            backgroundColor: alpha(normalized.backgroundPaper, 0.95)
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
            color: alpha(normalized.textPrimary, 0.8),
            backgroundColor: alpha(normalized.backgroundDefault, 0.72)
          }
        }
      }
    }
  });
};

const defaultTheme = createAppTheme(defaultThemeSettings);

export default defaultTheme;
