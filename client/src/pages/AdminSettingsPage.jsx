import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import AdminSettingsSubnav from '../components/AdminSettingsSubnav';
import PageHeader from '../components/PageHeader';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { defaultThemeSettings, fontFamilyOptions, normalizeThemeSettings } from '../theme';

const colorFieldItems = [
  { key: 'primaryColor', label: 'Primary Color' },
  { key: 'secondaryColor', label: 'Secondary Color' },
  { key: 'backgroundDefault', label: 'Background Color' },
  { key: 'backgroundPaper', label: 'Surface Color' },
  { key: 'textPrimary', label: 'Primary Text Color' },
  { key: 'textSecondary', label: 'Secondary Text Color' }
];

const colorInputSx = {
  '& input': {
    cursor: 'pointer',
    p: '6px !important',
    height: 34
  }
};

const AdminSettingsPage = () => {
  const { storeName, footerText, showOutOfStockProducts, themeSettings, updateStoreSettings } = useStoreSettings();
  const [nameDraft, setNameDraft] = useState(storeName);
  const [footerTextDraft, setFooterTextDraft] = useState(footerText);
  const [showOutOfStockDraft, setShowOutOfStockDraft] = useState(showOutOfStockProducts);
  const [themeDraft, setThemeDraft] = useState(() => normalizeThemeSettings(themeSettings));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNameDraft(storeName);
    setFooterTextDraft(footerText);
    setShowOutOfStockDraft(showOutOfStockProducts);
    setThemeDraft(normalizeThemeSettings(themeSettings));
  }, [storeName, footerText, showOutOfStockProducts, themeSettings]);

  const onThemeFieldChange = (field, value) => {
    setThemeDraft((current) => ({
      ...current,
      [field]: value
    }));
  };

  const onResetTheme = () => {
    setThemeDraft(defaultThemeSettings);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const updatedSettings = await updateStoreSettings({
        storeName: nameDraft,
        footerText: footerTextDraft,
        showOutOfStockProducts: showOutOfStockDraft,
        theme: themeDraft
      });
      setSuccess(`Settings updated. Store name: "${updatedSettings.storeName}"`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Failed to update store settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <PageHeader
        eyebrow="Admin"
        title="Store Settings"
        subtitle="Update global branding and full website theme (colors + fonts)."
      />

      <Card sx={{ mb: 1.2 }}>
        <CardContent sx={{ p: 1 }}>
          <AdminSettingsSubnav />
        </CardContent>
      </Card>

      {(error || success) && (
        <Stack spacing={0.8} sx={{ mb: 1.1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
        </Stack>
      )}

      <Card>
        <CardContent component="form" onSubmit={onSubmit} sx={{ p: 1.2 }}>
          <Stack spacing={1.2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Branding
            </Typography>

            <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
              <TextField
                label="Store Name"
                size="small"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                required
                inputProps={{ maxLength: 80 }}
                helperText="Shown in navbar, auth pages, checkout and invoice."
              />

              <TextField
                label="Footer Text"
                size="small"
                value={footerTextDraft}
                onChange={(event) => setFooterTextDraft(event.target.value)}
                required
                multiline
                minRows={2}
                inputProps={{ maxLength: 220 }}
                helperText="Shown at the bottom-right of website footer."
              />
            </Box>

            <Divider />

            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Catalog Visibility
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={showOutOfStockDraft}
                  onChange={(event) => setShowOutOfStockDraft(event.target.checked)}
                />
              }
              label="Show out-of-stock products across storefront"
            />

            <Divider />

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Theme
              </Typography>
              <Button type="button" size="small" variant="outlined" onClick={onResetTheme}>
                Reset Theme
              </Button>
            </Stack>

            <Box
              sx={{
                display: 'grid',
                gap: 1,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }
              }}
            >
              {colorFieldItems.map((item) => (
                <TextField
                  key={item.key}
                  type="color"
                  size="small"
                  label={item.label}
                  value={themeDraft[item.key]}
                  onChange={(event) => onThemeFieldChange(item.key, event.target.value)}
                  sx={colorInputSx}
                  helperText={themeDraft[item.key]}
                />
              ))}
            </Box>

            <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
              <TextField
                select
                label="Body Font"
                size="small"
                value={themeDraft.bodyFontFamily}
                onChange={(event) => onThemeFieldChange('bodyFontFamily', event.target.value)}
              >
                {fontFamilyOptions.map((font) => (
                  <MenuItem key={font.value} value={font.value} sx={{ fontFamily: font.css }}>
                    {font.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Heading Font"
                size="small"
                value={themeDraft.headingFontFamily}
                onChange={(event) => onThemeFieldChange('headingFontFamily', event.target.value)}
              >
                {fontFamilyOptions.map((font) => (
                  <MenuItem key={font.value} value={font.value} sx={{ fontFamily: font.css }}>
                    {font.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Stack direction="row" spacing={0.8}>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveOutlinedIcon />}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminSettingsPage;
