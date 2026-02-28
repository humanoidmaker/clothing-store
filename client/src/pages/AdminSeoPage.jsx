import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import PageHeader from '../components/PageHeader';
import api from '../api';

const DEFAULT_SEO_META = {
  title: '',
  description: '',
  keywords: '',
  canonicalUrl: '',
  robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  ogImageAlt: '',
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: '',
  twitterDescription: '',
  twitterImage: '',
  twitterImageAlt: '',
  twitterSite: '',
  twitterCreator: ''
};

const PROTECTED_PAGE_KEYS = new Set(['home', 'wishlist', 'cart', 'login', 'register', 'checkout', 'orders']);

const ogTypeOptions = ['website', 'product', 'article'];
const twitterCardOptions = ['summary', 'summary_large_image'];

const normalizeMeta = (value = {}) => ({
  ...DEFAULT_SEO_META,
  ...value
});

const createSeoFields = ({ title, value, onChange }) => (
  <Stack spacing={1}>
    <Typography variant="subtitle2">{title}</Typography>
    <Box
      sx={{
        display: 'grid',
        gap: 1,
        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }
      }}
    >
      <TextField
        label="Meta Title (Google)"
        size="small"
        value={value.title}
        onChange={(event) => onChange('title', event.target.value)}
        helperText={`${value.title.length}/120`}
      />
      <TextField
        label="Keywords"
        size="small"
        value={value.keywords}
        onChange={(event) => onChange('keywords', event.target.value)}
        helperText="Comma separated keywords"
      />
      <TextField
        label="Meta Description"
        size="small"
        multiline
        minRows={2}
        value={value.description}
        onChange={(event) => onChange('description', event.target.value)}
        helperText={`${value.description.length}/320`}
      />
      <TextField
        label="Canonical URL"
        size="small"
        value={value.canonicalUrl}
        onChange={(event) => onChange('canonicalUrl', event.target.value)}
        helperText="Absolute or relative URL"
      />
      <TextField
        label="Robots Directive"
        size="small"
        value={value.robots}
        onChange={(event) => onChange('robots', event.target.value)}
        helperText="index,follow,max-image-preview:large..."
      />
    </Box>

    <Divider />

    <Typography variant="subtitle2">Open Graph (Facebook / Instagram / WhatsApp / LinkedIn)</Typography>
    <Box
      sx={{
        display: 'grid',
        gap: 1,
        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }
      }}
    >
      <TextField
        label="OG Title"
        size="small"
        value={value.ogTitle}
        onChange={(event) => onChange('ogTitle', event.target.value)}
      />
      <TextField
        select
        label="OG Type"
        size="small"
        value={value.ogType}
        onChange={(event) => onChange('ogType', event.target.value)}
      >
        {ogTypeOptions.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="OG Description"
        size="small"
        multiline
        minRows={2}
        value={value.ogDescription}
        onChange={(event) => onChange('ogDescription', event.target.value)}
      />
      <TextField
        label="OG Image URL"
        size="small"
        value={value.ogImage}
        onChange={(event) => onChange('ogImage', event.target.value)}
      />
      <TextField
        label="OG Image Alt"
        size="small"
        value={value.ogImageAlt}
        onChange={(event) => onChange('ogImageAlt', event.target.value)}
      />
    </Box>

    <Divider />

    <Typography variant="subtitle2">Twitter / X Card</Typography>
    <Box
      sx={{
        display: 'grid',
        gap: 1,
        gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }
      }}
    >
      <TextField
        label="Twitter Title"
        size="small"
        value={value.twitterTitle}
        onChange={(event) => onChange('twitterTitle', event.target.value)}
      />
      <TextField
        select
        label="Twitter Card"
        size="small"
        value={value.twitterCard}
        onChange={(event) => onChange('twitterCard', event.target.value)}
      >
        {twitterCardOptions.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="Twitter Description"
        size="small"
        multiline
        minRows={2}
        value={value.twitterDescription}
        onChange={(event) => onChange('twitterDescription', event.target.value)}
      />
      <TextField
        label="Twitter Image URL"
        size="small"
        value={value.twitterImage}
        onChange={(event) => onChange('twitterImage', event.target.value)}
      />
      <TextField
        label="Twitter Image Alt"
        size="small"
        value={value.twitterImageAlt}
        onChange={(event) => onChange('twitterImageAlt', event.target.value)}
      />
      <TextField
        label="Twitter Site (@handle)"
        size="small"
        value={value.twitterSite}
        onChange={(event) => onChange('twitterSite', event.target.value)}
      />
      <TextField
        label="Twitter Creator (@handle)"
        size="small"
        value={value.twitterCreator}
        onChange={(event) => onChange('twitterCreator', event.target.value)}
      />
    </Box>
  </Stack>
);

const AdminSeoPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [defaultsDraft, setDefaultsDraft] = useState(DEFAULT_SEO_META);
  const [publicPages, setPublicPages] = useState([]);
  const [selectedPageKey, setSelectedPageKey] = useState('');
  const [pageDraft, setPageDraft] = useState({
    key: '',
    label: '',
    path: '/',
    meta: DEFAULT_SEO_META
  });

  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedProductInfo, setSelectedProductInfo] = useState(null);
  const [productSeoDraft, setProductSeoDraft] = useState(DEFAULT_SEO_META);
  const [loadingProductSeo, setLoadingProductSeo] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const [seoResponse, productsResponse] = await Promise.all([
        api.get('/seo/admin'),
        api.get('/seo/products')
      ]);

      const nextDefaults = normalizeMeta(seoResponse.data?.defaults || {});
      const nextPages = Array.isArray(seoResponse.data?.publicPages)
        ? seoResponse.data.publicPages
        : [];
      const nextProducts = Array.isArray(productsResponse.data) ? productsResponse.data : [];

      setDefaultsDraft(nextDefaults);
      setPublicPages(nextPages);
      setProducts(nextProducts);

      if (nextPages.length > 0) {
        const firstPage = nextPages[0];
        setSelectedPageKey(firstPage.key);
        setPageDraft({
          key: firstPage.key,
          label: firstPage.label,
          path: firstPage.path,
          meta: normalizeMeta(firstPage.meta || {})
        });
      } else {
        setSelectedPageKey('');
        setPageDraft({ key: '', label: '', path: '/', meta: normalizeMeta({}) });
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load SEO settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedPage = useMemo(
    () => publicPages.find((page) => page.key === selectedPageKey) || null,
    [publicPages, selectedPageKey]
  );

  useEffect(() => {
    if (!selectedPage) return;
    setPageDraft({
      key: selectedPage.key,
      label: selectedPage.label,
      path: selectedPage.path,
      meta: normalizeMeta(selectedPage.meta || {})
    });
  }, [selectedPage]);

  const onChangeDefaults = (field, value) => {
    setDefaultsDraft((current) => ({
      ...current,
      [field]: value
    }));
  };

  const onChangePageMeta = (field, value) => {
    setPageDraft((current) => ({
      ...current,
      meta: {
        ...current.meta,
        [field]: value
      }
    }));
  };

  const onChangeProductMeta = (field, value) => {
    setProductSeoDraft((current) => ({
      ...current,
      [field]: value
    }));
  };

  const onSaveDefaults = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { data } = await api.put('/seo/defaults', {
        meta: defaultsDraft
      });
      setDefaultsDraft(normalizeMeta(data.defaults || {}));
      setPublicPages(Array.isArray(data.publicPages) ? data.publicPages : []);
      setSuccess('Default SEO settings updated.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to save default SEO');
    } finally {
      setSaving(false);
    }
  };

  const onSavePublicPage = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { data } = await api.put('/seo/public-page', {
        key: pageDraft.key,
        label: pageDraft.label,
        path: pageDraft.path,
        meta: pageDraft.meta
      });

      const nextPages = Array.isArray(data.publicPages) ? data.publicPages : [];
      setPublicPages(nextPages);
      setSelectedPageKey(pageDraft.key);
      setSuccess('Public page SEO updated.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to save page SEO');
    } finally {
      setSaving(false);
    }
  };

  const onDeletePublicPage = async () => {
    if (!pageDraft.key) return;
    const confirmDelete = window.confirm(`Delete SEO config for "${pageDraft.label}"?`);
    if (!confirmDelete) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { data } = await api.delete(`/seo/public-page/${pageDraft.key}`);
      const nextPages = Array.isArray(data.publicPages) ? data.publicPages : [];
      setPublicPages(nextPages);
      if (nextPages.length > 0) {
        setSelectedPageKey(nextPages[0].key);
      } else {
        setSelectedPageKey('');
      }
      setSuccess('Public page SEO deleted.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to delete page SEO');
    } finally {
      setSaving(false);
    }
  };

  const onAddCustomPage = () => {
    const customKey = `custom-${Date.now().toString(36)}`;
    setSelectedPageKey(customKey);
    setPageDraft({
      key: customKey,
      label: 'Custom Page',
      path: '/new-page',
      meta: normalizeMeta(defaultsDraft)
    });
  };

  const onLoadProductSeo = async (productId) => {
    setSelectedProductId(productId);
    setSelectedProductInfo(null);
    setProductSeoDraft(normalizeMeta(defaultsDraft));
    setError('');
    setSuccess('');

    if (!productId) {
      return;
    }

    setLoadingProductSeo(true);
    try {
      const { data } = await api.get(`/seo/products/${productId}`);
      setSelectedProductInfo(data);
      setProductSeoDraft(normalizeMeta(data.seo || {}));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load product SEO');
    } finally {
      setLoadingProductSeo(false);
    }
  };

  const onSaveProductSeo = async () => {
    if (!selectedProductId) {
      setError('Select a product first');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.put(`/seo/products/${selectedProductId}`, {
        seo: productSeoDraft
      });
      setSuccess('Product SEO updated.');
      await onLoadProductSeo(selectedProductId);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to save product SEO');
    } finally {
      setSaving(false);
    }
  };

  const canDeleteSelectedPage = pageDraft.key && !PROTECTED_PAGE_KEYS.has(pageDraft.key);

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 6 }}>
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <Box>
      <PageHeader
        eyebrow="Admin"
        title="SEO Manager"
        subtitle="Manually control SEO, Open Graph and Twitter tags for public pages and product detail pages."
      />

      {(error || success) && (
        <Stack spacing={0.8} sx={{ mb: 1.1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {success ? <Alert severity="success">{success}</Alert> : null}
        </Stack>
      )}

      <Stack spacing={1.2}>
        <Card>
          <CardContent sx={{ p: 1 }}>
            <Stack spacing={1}>
              <Typography variant="h6">Default SEO Fallback</Typography>
              <Typography variant="caption" color="text.secondary">
                Applied when page/product specific fields are left empty.
              </Typography>
              {createSeoFields({
                title: 'Default Meta & Social Tags',
                value: defaultsDraft,
                onChange: onChangeDefaults
              })}
              <Stack direction="row" spacing={0.8}>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveOutlinedIcon />}
                  disabled={saving}
                  onClick={onSaveDefaults}
                >
                  Save Default SEO
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: 1 }}>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="h6">Public Page SEO</Typography>
                <Button variant="outlined" size="small" startIcon={<AddOutlinedIcon />} onClick={onAddCustomPage}>
                  Add Custom Page
                </Button>
              </Stack>

              <Box
                sx={{
                  display: 'grid',
                  gap: 1,
                  gridTemplateColumns: { xs: '1fr', lg: '300px minmax(0, 1fr)' }
                }}
              >
                <Stack spacing={0.8}>
                  <TextField
                    select
                    size="small"
                    label="Select Page"
                    value={selectedPageKey}
                    onChange={(event) => setSelectedPageKey(event.target.value)}
                  >
                    {publicPages.map((page) => (
                      <MenuItem key={page.key} value={page.key}>
                        {page.label} ({page.path})
                      </MenuItem>
                    ))}
                    {!publicPages.some((page) => page.key === selectedPageKey) && selectedPageKey ? (
                      <MenuItem value={selectedPageKey}>{pageDraft.label || pageDraft.key}</MenuItem>
                    ) : null}
                  </TextField>
                  <TextField
                    size="small"
                    label="Page Key"
                    value={pageDraft.key}
                    onChange={(event) => setPageDraft((current) => ({ ...current, key: event.target.value }))}
                    helperText="Unique ID for this page config"
                  />
                  <TextField
                    size="small"
                    label="Page Label"
                    value={pageDraft.label}
                    onChange={(event) => setPageDraft((current) => ({ ...current, label: event.target.value }))}
                    helperText="Shown in admin SEO selector"
                  />
                  <TextField
                    size="small"
                    label="Public Path"
                    value={pageDraft.path}
                    onChange={(event) => setPageDraft((current) => ({ ...current, path: event.target.value }))}
                    helperText='Example: "/", "/about", "/collections/new"'
                  />
                </Stack>

                <Box>{createSeoFields({ title: 'Page Meta & Social Tags', value: pageDraft.meta, onChange: onChangePageMeta })}</Box>
              </Box>

              <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveOutlinedIcon />}
                  disabled={saving}
                  onClick={onSavePublicPage}
                >
                  Save Page SEO
                </Button>
                {canDeleteSelectedPage ? (
                  <Button
                    color="error"
                    variant="outlined"
                    startIcon={<DeleteOutlineOutlinedIcon />}
                    disabled={saving}
                    onClick={onDeletePublicPage}
                  >
                    Delete Page SEO
                  </Button>
                ) : null}
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: 1 }}>
            <Stack spacing={1}>
              <Typography variant="h6">Product Page SEO</Typography>
              <Typography variant="caption" color="text.secondary">
                Configure SEO for each `/products/:id` page.
              </Typography>

              <TextField
                select
                size="small"
                label="Select Product"
                value={selectedProductId}
                onChange={(event) => onLoadProductSeo(event.target.value)}
              >
                <MenuItem value="">Choose a product</MenuItem>
                {products.map((product) => (
                  <MenuItem key={product._id} value={product._id}>
                    {product.name} ({product.category})
                  </MenuItem>
                ))}
              </TextField>

              {loadingProductSeo ? (
                <Stack alignItems="center" sx={{ py: 2 }}>
                  <CircularProgress size={24} />
                </Stack>
              ) : null}

              {!loadingProductSeo && selectedProductInfo ? (
                <>
                  <Alert severity="info">
                    Editing SEO for <strong>{selectedProductInfo.name}</strong>
                  </Alert>
                  {createSeoFields({
                    title: 'Product Meta & Social Tags',
                    value: productSeoDraft,
                    onChange: onChangeProductMeta
                  })}
                  <Stack direction="row" spacing={0.8}>
                    <Button
                      variant="contained"
                      startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveOutlinedIcon />}
                      disabled={saving || !selectedProductId}
                      onClick={onSaveProductSeo}
                    >
                      Save Product SEO
                    </Button>
                  </Stack>
                </>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default AdminSeoPage;
