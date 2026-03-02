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
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import DesktopWindowsOutlinedIcon from '@mui/icons-material/DesktopWindowsOutlined';
import PhoneIphoneOutlinedIcon from '@mui/icons-material/PhoneIphoneOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import AdminSettingsSubnav from '../components/AdminSettingsSubnav';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { defaultThemeSettings, fontFamilyOptions, normalizeThemeSettings } from '../theme';
import { emitToast } from '../utils/toastBus';
import { readValidatedImages } from '../utils/imageUpload';

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

const homepageBannerPlaceholders = [
  {
    desktopImage: '/placeholders/banner-desktop-1.svg',
    mobileImage: '/placeholders/banner-mobile-1.svg',
    altText: 'New arrivals and premium seasonal styles'
  },
  {
    desktopImage: '/placeholders/banner-desktop-2.svg',
    mobileImage: '/placeholders/banner-mobile-2.svg',
    altText: 'Weekend edit with casual and street-ready outfits'
  },
  {
    desktopImage: '/placeholders/banner-desktop-3.svg',
    mobileImage: '/placeholders/banner-mobile-3.svg',
    altText: 'Workwear capsule and elevated essentials'
  }
];

const createBannerId = () => `banner-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const normalizeHomepageBannerSliderDraft = (value = {}) => {
  const source = value && typeof value === 'object' ? value : {};
  const banners = Array.isArray(source.banners) ? source.banners : [];
  return {
    enabled: Boolean(source.enabled),
    banners: banners
      .map((entry, index) => {
        const item = entry && typeof entry === 'object' ? entry : {};
        const desktopImage = String(item.desktopImage || '').trim();
        const mobileImage = String(item.mobileImage || '').trim();
        if (!desktopImage || !mobileImage) return null;

        return {
          id: String(item.id || '').trim() || `banner-${index + 1}`,
          desktopImage,
          mobileImage,
          altText: String(item.altText || '').trim(),
          linkUrl: String(item.linkUrl || '').trim()
        };
      })
      .filter(Boolean)
  };
};

const AdminSettingsPage = () => {
  const { isAdmin } = useAuth();
  const { storeName, footerText, showOutOfStockProducts, themeSettings, homepageBannerSlider, updateStoreSettings } =
    useStoreSettings();
  const [nameDraft, setNameDraft] = useState(storeName);
  const [footerTextDraft, setFooterTextDraft] = useState(footerText);
  const [showOutOfStockDraft, setShowOutOfStockDraft] = useState(showOutOfStockProducts);
  const [themeDraft, setThemeDraft] = useState(() => normalizeThemeSettings(themeSettings));
  const [homepageBannerSliderDraft, setHomepageBannerSliderDraft] = useState(() =>
    normalizeHomepageBannerSliderDraft(homepageBannerSlider)
  );
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingBannerKey, setUploadingBannerKey] = useState('');

  useEffect(() => {
    setNameDraft(storeName);
    setFooterTextDraft(footerText);
    setShowOutOfStockDraft(showOutOfStockProducts);
    setThemeDraft(normalizeThemeSettings(themeSettings));
    setHomepageBannerSliderDraft(normalizeHomepageBannerSliderDraft(homepageBannerSlider));
  }, [storeName, footerText, showOutOfStockProducts, themeSettings, homepageBannerSlider]);

  const onThemeFieldChange = (field, value) => {
    setThemeDraft((current) => ({
      ...current,
      [field]: value
    }));
  };

  const onResetTheme = () => {
    setThemeDraft(defaultThemeSettings);
  };

  const onAddBanner = () => {
    setHomepageBannerSliderDraft((current) => {
      const placeholder = homepageBannerPlaceholders[current.banners.length % homepageBannerPlaceholders.length];
      return {
        ...current,
        banners: [
          ...current.banners,
          {
            id: createBannerId(),
            desktopImage: placeholder.desktopImage,
            mobileImage: placeholder.mobileImage,
            altText: placeholder.altText,
            linkUrl: '/'
          }
        ]
      };
    });
  };

  const onRemoveBanner = (bannerId) => {
    setHomepageBannerSliderDraft((current) => ({
      ...current,
      banners: current.banners.filter((banner) => banner.id !== bannerId)
    }));
  };

  const onBannerFieldChange = (bannerId, field, value) => {
    setHomepageBannerSliderDraft((current) => ({
      ...current,
      banners: current.banners.map((banner) =>
        banner.id === bannerId
          ? {
              ...banner,
              [field]: value
            }
          : banner
      )
    }));
  };

  const onBannerImageSelect = async (event, bannerId, field, profileKey) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    setSuccess('');
    setUploadingBannerKey(`${bannerId}:${field}`);

    try {
      const validated = await readValidatedImages([file], profileKey);
      const optimizedImage = validated[0]?.dataUrl || '';
      if (!optimizedImage) {
        throw new Error('Unable to process selected image');
      }
      onBannerFieldChange(bannerId, field, optimizedImage);
      emitToast({
        severity: 'success',
        message: 'Banner image optimized and ready to save.'
      });
    } catch (uploadError) {
      const message = uploadError.message || 'Failed to process banner image';
      setError(message);
      emitToast({
        severity: 'error',
        message
      });
    } finally {
      setUploadingBannerKey('');
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      if (!String(nameDraft || '').trim()) {
        throw new Error('Store name is required');
      }
      if (!String(footerTextDraft || '').trim()) {
        throw new Error('Footer text is required');
      }

      const payload = {
        storeName: nameDraft,
        footerText: footerTextDraft,
        showOutOfStockProducts: showOutOfStockDraft,
        theme: themeDraft
      };
      if (isAdmin) {
        payload.homepageBannerSlider = homepageBannerSliderDraft;
      }

      const updatedSettings = await updateStoreSettings(payload);
      if (isAdmin) {
        setHomepageBannerSliderDraft(normalizeHomepageBannerSliderDraft(updatedSettings.homepageBannerSlider));
      }
      setSuccess(`Settings updated. Store name: "${updatedSettings.storeName}"`);
    } catch (requestError) {
      const message = requestError.response?.data?.message || requestError.message || 'Failed to update store settings';
      setError(message);
      emitToast({
        severity: 'error',
        message
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <PageHeader
        eyebrow="Admin"
        title="Store Settings"
        subtitle="Update branding, compact homepage banner slider, and full website theme."
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
        <CardContent component="form" onSubmit={onSubmit} sx={{ p: 1.2 }} noValidate>
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
                inputProps={{ maxLength: 80 }}
                helperText="Shown in navbar, auth pages, checkout and invoice."
              />

              <TextField
                label="Footer Text"
                size="small"
                value={footerTextDraft}
                onChange={(event) => setFooterTextDraft(event.target.value)}
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

            {isAdmin ? (
              <>
                <Divider />

                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={0.8}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Homepage Banner Slider
                  </Typography>
                  <Button
                    type="button"
                    size="small"
                    variant="outlined"
                    startIcon={<AddRoundedIcon fontSize="small" />}
                    onClick={onAddBanner}
                  >
                    Add Banner
                  </Button>
                </Stack>

                <FormControlLabel
                  control={
                    <Switch
                      checked={homepageBannerSliderDraft.enabled}
                      onChange={(event) =>
                        setHomepageBannerSliderDraft((current) => ({
                          ...current,
                          enabled: event.target.checked
                        }))
                      }
                    />
                  }
                  label="Enable compact homepage banner slider"
                />

                <Alert severity="info" sx={{ py: 0.2 }}>
                  Upload desktop and mobile banners separately. Images are automatically compressed before saving.
                </Alert>

                {homepageBannerSliderDraft.banners.length === 0 ? (
                  <Alert severity="warning">No banners added yet. Click "Add Banner" to create one.</Alert>
                ) : (
                  <Stack spacing={0.9}>
                    {homepageBannerSliderDraft.banners.map((banner, index) => {
                      const desktopUploading = uploadingBannerKey === `${banner.id}:desktopImage`;
                      const mobileUploading = uploadingBannerKey === `${banner.id}:mobileImage`;

                      return (
                        <Card key={banner.id} variant="outlined">
                          <CardContent sx={{ p: 1 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.8 }}>
                              <Typography variant="subtitle2">Banner {index + 1}</Typography>
                              <IconButton
                                aria-label={`Remove banner ${index + 1}`}
                                size="small"
                                onClick={() => onRemoveBanner(banner.id)}
                              >
                                <DeleteOutlineRoundedIcon fontSize="small" />
                              </IconButton>
                            </Stack>

                            <Box
                              sx={{
                                display: 'grid',
                                gap: 0.9,
                                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }
                              }}
                            >
                              <Box>
                                <Stack direction="row" spacing={0.6} alignItems="center" sx={{ mb: 0.5 }}>
                                  <DesktopWindowsOutlinedIcon fontSize="small" color="action" />
                                  <Typography variant="caption" color="text.secondary">
                                    Desktop Banner
                                  </Typography>
                                </Stack>
                                <Box
                                  sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    minHeight: 86,
                                    display: 'grid',
                                    placeItems: 'center',
                                    p: 0.6,
                                    bgcolor: 'background.default',
                                    mb: 0.6
                                  }}
                                >
                                  {banner.desktopImage ? (
                                    <Box
                                      component="img"
                                      src={banner.desktopImage}
                                      alt={banner.altText || `Banner ${index + 1} desktop`}
                                      sx={{ maxWidth: '100%', maxHeight: 78, objectFit: 'contain' }}
                                    />
                                  ) : (
                                    <Typography variant="caption" color="text.secondary">
                                      No desktop image
                                    </Typography>
                                  )}
                                </Box>
                                <Button
                                  component="label"
                                  type="button"
                                  size="small"
                                  variant="outlined"
                                  startIcon={
                                    desktopUploading ? (
                                      <CircularProgress size={12} color="inherit" />
                                    ) : (
                                      <AddPhotoAlternateOutlinedIcon fontSize="small" />
                                    )
                                  }
                                  disabled={desktopUploading || mobileUploading}
                                >
                                  {desktopUploading ? 'Processing...' : 'Upload Desktop'}
                                  <input
                                    hidden
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/webp"
                                    onChange={(event) => onBannerImageSelect(event, banner.id, 'desktopImage', 'bannerDesktop')}
                                  />
                                </Button>
                              </Box>

                              <Box>
                                <Stack direction="row" spacing={0.6} alignItems="center" sx={{ mb: 0.5 }}>
                                  <PhoneIphoneOutlinedIcon fontSize="small" color="action" />
                                  <Typography variant="caption" color="text.secondary">
                                    Mobile Banner
                                  </Typography>
                                </Stack>
                                <Box
                                  sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    minHeight: 86,
                                    display: 'grid',
                                    placeItems: 'center',
                                    p: 0.6,
                                    bgcolor: 'background.default',
                                    mb: 0.6
                                  }}
                                >
                                  {banner.mobileImage ? (
                                    <Box
                                      component="img"
                                      src={banner.mobileImage}
                                      alt={banner.altText || `Banner ${index + 1} mobile`}
                                      sx={{ maxWidth: '100%', maxHeight: 78, objectFit: 'contain' }}
                                    />
                                  ) : (
                                    <Typography variant="caption" color="text.secondary">
                                      No mobile image
                                    </Typography>
                                  )}
                                </Box>
                                <Button
                                  component="label"
                                  type="button"
                                  size="small"
                                  variant="outlined"
                                  startIcon={
                                    mobileUploading ? (
                                      <CircularProgress size={12} color="inherit" />
                                    ) : (
                                      <AddPhotoAlternateOutlinedIcon fontSize="small" />
                                    )
                                  }
                                  disabled={desktopUploading || mobileUploading}
                                >
                                  {mobileUploading ? 'Processing...' : 'Upload Mobile'}
                                  <input
                                    hidden
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/webp"
                                    onChange={(event) => onBannerImageSelect(event, banner.id, 'mobileImage', 'bannerMobile')}
                                  />
                                </Button>
                              </Box>
                            </Box>

                            <Box
                              sx={{
                                mt: 0.9,
                                display: 'grid',
                                gap: 0.8,
                                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }
                              }}
                            >
                              <TextField
                                size="small"
                                label="Alt Text"
                                value={banner.altText}
                                onChange={(event) => onBannerFieldChange(banner.id, 'altText', event.target.value)}
                                inputProps={{ maxLength: 180 }}
                              />
                              <TextField
                                size="small"
                                label="Link URL (optional)"
                                placeholder="/ or https://example.com/collection"
                                value={banner.linkUrl}
                                onChange={(event) => onBannerFieldChange(banner.id, 'linkUrl', event.target.value)}
                                inputProps={{ maxLength: 700 }}
                              />
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                )}
              </>
            ) : null}

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
