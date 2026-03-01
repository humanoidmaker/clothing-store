import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import AppPagination from '../components/AppPagination';
import PageHeader from '../components/PageHeader';
import api from '../api';
import { formatINR } from '../utils/currency';

const createInitialForm = () => ({
  name: '',
  websiteName: '',
  primaryDomain: '',
  additionalDomains: '',
  defaultMarginPercent: '0',
  isActive: true,
  adminUserName: '',
  adminUserEmail: '',
  adminUserPassword: ''
});

const normalizeDomainText = (value) => String(value || '').trim().toLowerCase();
const isDevelopment = process.env.NODE_ENV !== 'production';

const createDevPrimaryDomain = (name) => {
  const base = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'reseller'}.localhost`;
};

const normalizeMarginNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Number(Math.max(0, parsed).toFixed(2));
};

const generateStrongPassword = () => {
  const random = Math.random().toString(36).slice(2, 12);
  return `Rslr@${random}`;
};

const buildDomainArray = (form) => {
  const primary = normalizeDomainText(form.primaryDomain);
  const additional = String(form.additionalDomains || '')
    .split(',')
    .map((entry) => normalizeDomainText(entry))
    .filter(Boolean);
  return [...new Set([primary, ...additional].filter(Boolean))];
};

const resolveAllProducts = async () => {
  const allProducts = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const { data } = await api.get('/products', {
      params: {
        includeOutOfStock: true,
        sort: 'newest',
        page,
        limit: 100
      }
    });

    const pageItems = Array.isArray(data?.products) ? data.products : [];
    allProducts.push(...pageItems);

    totalPages = Number(data?.totalPages || 1);
    page += 1;
    if (page > 100) {
      break;
    }
  }

  return allProducts;
};

const AdminResellersPage = () => {
  const [resellers, setResellers] = useState([]);
  const [loadingResellers, setLoadingResellers] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(createInitialForm);
  const [editingResellerId, setEditingResellerId] = useState('');
  const [selectedResellerId, setSelectedResellerId] = useState('');
  const [savingReseller, setSavingReseller] = useState(false);
  const [busyResellerId, setBusyResellerId] = useState('');
  const [savingAllMargin, setSavingAllMargin] = useState(false);
  const [savingProductMarginId, setSavingProductMarginId] = useState('');
  const [globalMarginDraft, setGlobalMarginDraft] = useState('0');
  const [productMarginDrafts, setProductMarginDrafts] = useState({});
  const [productSearch, setProductSearch] = useState('');
  const [productPage, setProductPage] = useState(1);
  const [productRowsPerPage, setProductRowsPerPage] = useState(10);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState(null);

  const selectedReseller = useMemo(
    () => resellers.find((reseller) => reseller.id === selectedResellerId) || null,
    [resellers, selectedResellerId]
  );

  const filteredProducts = useMemo(() => {
    const query = String(productSearch || '').trim().toLowerCase();
    if (!query) {
      return products;
    }

    return products.filter((product) => {
      const name = String(product?.name || '').toLowerCase();
      const category = String(product?.category || '').toLowerCase();
      const brand = String(product?.brand || '').toLowerCase();
      return name.includes(query) || category.includes(query) || brand.includes(query);
    });
  }, [products, productSearch]);

  const paginatedProducts = useMemo(() => {
    const start = (productPage - 1) * productRowsPerPage;
    return filteredProducts.slice(start, start + productRowsPerPage);
  }, [filteredProducts, productPage, productRowsPerPage]);

  const productTotalItems = filteredProducts.length;
  const productTotalPages = Math.max(1, Math.ceil(productTotalItems / productRowsPerPage));

  const refreshResellers = async (preferredId = '') => {
    setLoadingResellers(true);
    try {
      const { data } = await api.get('/resellers/admin', {
        showSuccessToast: false
      });
      const nextResellers = Array.isArray(data?.resellers) ? data.resellers : [];
      setResellers(nextResellers);

      if (preferredId && nextResellers.some((entry) => entry.id === preferredId)) {
        setSelectedResellerId(preferredId);
      } else if (selectedResellerId && nextResellers.some((entry) => entry.id === selectedResellerId)) {
        setSelectedResellerId(selectedResellerId);
      } else {
        setSelectedResellerId(nextResellers[0]?.id || '');
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Failed to load resellers');
    } finally {
      setLoadingResellers(false);
    }
  };

  const refreshProducts = async () => {
    setLoadingProducts(true);
    try {
      const nextProducts = await resolveAllProducts();
      setProducts(nextProducts);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Failed to load products');
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    void refreshResellers();
    void refreshProducts();
  }, []);

  useEffect(() => {
    if (!selectedReseller) {
      setGlobalMarginDraft('0');
      setProductMarginDrafts({});
      return;
    }

    setGlobalMarginDraft(String(selectedReseller.defaultMarginPercent ?? 0));
    const nextDrafts = {};
    const overrides = selectedReseller.productMargins && typeof selectedReseller.productMargins === 'object'
      ? selectedReseller.productMargins
      : {};
    for (const [productId, margin] of Object.entries(overrides)) {
      nextDrafts[productId] = String(margin);
    }
    setProductMarginDrafts(nextDrafts);
    setProductPage(1);
  }, [selectedReseller]);

  useEffect(() => {
    if (productPage > productTotalPages) {
      setProductPage(productTotalPages);
    }
  }, [productPage, productTotalPages]);

  const resetForm = () => {
    setForm(createInitialForm());
    setEditingResellerId('');
    setCreatedCredentials(null);
  };

  const onFormChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const onSubmitReseller = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setCreatedCredentials(null);
    setSavingReseller(true);

    try {
      const domains = buildDomainArray(form);
      if (domains.length === 0) {
        throw new Error('At least one domain is required');
      }

      const payload = {
        name: String(form.name || '').trim(),
        websiteName: String(form.websiteName || '').trim(),
        primaryDomain: normalizeDomainText(form.primaryDomain),
        domains,
        defaultMarginPercent: normalizeMarginNumber(form.defaultMarginPercent, 0),
        isActive: Boolean(form.isActive)
      };

      if (!payload.name) {
        throw new Error('Reseller name is required');
      }
      if (!payload.primaryDomain) {
        throw new Error('Primary domain is required');
      }

      if (editingResellerId) {
        const { data } = await api.put(`/resellers/admin/${editingResellerId}`, payload);
        const updatedId = data?.reseller?.id || editingResellerId;
        await refreshResellers(updatedId);
        setSuccess('Reseller website updated');
      } else {
        const adminUserName = String(form.adminUserName || '').trim() || `${payload.name} Admin`;
        const adminUserEmail = String(form.adminUserEmail || '').trim().toLowerCase();
        const adminUserPassword = String(form.adminUserPassword || '').trim();

        if (!adminUserEmail) {
          throw new Error('Reseller login email is required');
        }

        const createPayload = {
          ...payload,
          adminUserName,
          adminUserEmail,
          adminUserPassword
        };
        const { data } = await api.post('/resellers/admin', createPayload);
        const createdId = data?.reseller?.id || '';
        await refreshResellers(createdId);
        setSuccess('Reseller website created');
        if (data?.credentials?.email) {
          setCreatedCredentials({
            name: data.credentials.name || adminUserName,
            email: data.credentials.email,
            password: data.credentials.password || adminUserPassword,
            generatedPassword: Boolean(data.credentials.generatedPassword)
          });
        }
      }

      if (editingResellerId) {
        resetForm();
      } else {
        setForm(createInitialForm());
        setEditingResellerId('');
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Failed to save reseller website');
    } finally {
      setSavingReseller(false);
    }
  };

  const onEditReseller = (reseller) => {
    const domains = Array.isArray(reseller?.domains) ? reseller.domains : [];
    setCreatedCredentials(null);
    setEditingResellerId(reseller.id);
    setForm({
      name: String(reseller?.name || ''),
      websiteName: String(reseller?.websiteName || ''),
      primaryDomain: String(reseller?.primaryDomain || domains[0] || ''),
      additionalDomains: domains
        .filter((domain) => domain !== String(reseller?.primaryDomain || '').trim())
        .join(', '),
      defaultMarginPercent: String(reseller?.defaultMarginPercent ?? 0),
      isActive: reseller?.isActive !== false,
      adminUserName: '',
      adminUserEmail: String(reseller?.adminUserEmail || ''),
      adminUserPassword: ''
    });
  };

  const onDeleteReseller = async (resellerId) => {
    const confirmed = window.confirm('Delete this reseller website? This will remove all margin overrides.');
    if (!confirmed) {
      return;
    }

    setBusyResellerId(resellerId);
    setError('');
    setSuccess('');
    try {
      await api.delete(`/resellers/admin/${resellerId}`);
      await refreshResellers();
      setSuccess('Reseller website deleted');
      if (editingResellerId === resellerId) {
        resetForm();
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Failed to delete reseller website');
    } finally {
      setBusyResellerId('');
    }
  };

  const onApplyMarginToAllProducts = async () => {
    if (!selectedReseller) {
      return;
    }

    setSavingAllMargin(true);
    setError('');
    setSuccess('');
    try {
      const marginPercent = normalizeMarginNumber(globalMarginDraft, selectedReseller.defaultMarginPercent || 0);
      await api.put(`/resellers/admin/${selectedReseller.id}/margins/default`, {
        marginPercent,
        clearProductOverrides: true
      });
      await refreshResellers(selectedReseller.id);
      setSuccess('Default margin applied to reseller catalog');
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Failed to apply default margin');
    } finally {
      setSavingAllMargin(false);
    }
  };

  const onSaveProductMargin = async (productId) => {
    if (!selectedReseller || !productId) {
      return;
    }

    setSavingProductMarginId(productId);
    setError('');
    setSuccess('');
    try {
      const fallback = selectedReseller.defaultMarginPercent || 0;
      const marginPercent = normalizeMarginNumber(productMarginDrafts[productId], fallback);
      await api.put(`/resellers/admin/${selectedReseller.id}/margins/products`, {
        updates: [
          {
            productId,
            marginPercent
          }
        ]
      });
      await refreshResellers(selectedReseller.id);
      setSuccess('Product margin saved');
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Failed to save product margin');
    } finally {
      setSavingProductMarginId('');
    }
  };

  const onClearProductOverride = async (productId) => {
    if (!selectedReseller || !productId) {
      return;
    }

    setSavingProductMarginId(productId);
    setError('');
    setSuccess('');
    try {
      await api.put(`/resellers/admin/${selectedReseller.id}/margins/products`, {
        updates: [
          {
            productId,
            remove: true
          }
        ]
      });
      await refreshResellers(selectedReseller.id);
      setSuccess('Product override removed');
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Failed to clear product override');
    } finally {
      setSavingProductMarginId('');
    }
  };

  return (
    <Box>
      <PageHeader
        eyebrow="Admin"
        title="Reseller Websites"
        subtitle="Create unlimited reseller domains with shared catalog and independent margin control."
      />

      {isDevelopment && (
        <Alert severity="info" sx={{ mb: 1 }}>
          Development testing: each reseller gets an auto-opened localhost port. Create reseller, then click
          <strong> Open Dev URL</strong> to open its dedicated website instantly.
        </Alert>
      )}

      {(error || success) && (
        <Stack spacing={0.8} sx={{ mb: 1.1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
        </Stack>
      )}

      {createdCredentials ? (
        <Alert severity="success" sx={{ mb: 1.1 }}>
          Reseller login created: <strong>{createdCredentials.email}</strong>
          {' | '}
          Password: <strong>{createdCredentials.password}</strong>
          {createdCredentials.generatedPassword ? ' (auto-generated)' : ''}
        </Alert>
      ) : null}

      <Stack spacing={1.2}>
        <Card>
          <CardContent component="form" onSubmit={onSubmitReseller} sx={{ p: 1.2 }}>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {editingResellerId ? 'Edit Reseller Website' : 'Create Reseller Website'}
                </Typography>
                {editingResellerId && (
                  <Button variant="outlined" onClick={resetForm}>
                    Cancel Edit
                  </Button>
                )}
              </Stack>

              <Box
                sx={{
                  display: 'grid',
                  gap: 1,
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }
                }}
              >
                <TextField
                  label="Reseller Name"
                  required
                  value={form.name}
                  onChange={(event) => onFormChange('name', event.target.value)}
                />
                <TextField
                  label="Website Name (Optional)"
                  value={form.websiteName}
                  onChange={(event) => onFormChange('websiteName', event.target.value)}
                  helperText="Shown in navbar on that reseller domain."
                />
                <TextField
                  label="Primary Domain"
                  required
                  value={form.primaryDomain}
                  onChange={(event) => onFormChange('primaryDomain', event.target.value)}
                  helperText={isDevelopment ? 'Example (dev): partner.localhost' : 'Example: shop.partner1.com'}
                />
                <TextField
                  label="Additional Domains"
                  value={form.additionalDomains}
                  onChange={(event) => onFormChange('additionalDomains', event.target.value)}
                  helperText="Comma-separated. Example: partner1.com, www.partner1.com"
                />
                {isDevelopment && (
                  <Box sx={{ minWidth: 0 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => onFormChange('primaryDomain', createDevPrimaryDomain(form.name))}
                    >
                      Auto Dev Primary Domain
                    </Button>
                  </Box>
                )}
                <TextField
                  type="number"
                  inputProps={{ min: 0, step: 0.01 }}
                  label="Default Margin (%)"
                  value={form.defaultMarginPercent}
                  onChange={(event) => onFormChange('defaultMarginPercent', event.target.value)}
                />
                <FormControlLabel
                  control={(
                    <Switch
                      checked={Boolean(form.isActive)}
                      onChange={(event) => onFormChange('isActive', event.target.checked)}
                    />
                  )}
                  label="Reseller Active"
                />
                {!editingResellerId ? (
                  <TextField
                    label="Reseller Login Name"
                    value={form.adminUserName}
                    onChange={(event) => onFormChange('adminUserName', event.target.value)}
                    helperText="Default: Reseller name + Admin"
                  />
                ) : null}
                {!editingResellerId ? (
                  <TextField
                    label="Reseller Login Email"
                    required
                    value={form.adminUserEmail}
                    onChange={(event) => onFormChange('adminUserEmail', event.target.value)}
                    helperText="Credentials will be created with this email."
                  />
                ) : null}
                {!editingResellerId ? (
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.8}>
                    <TextField
                      label="Reseller Login Password"
                      value={form.adminUserPassword}
                      onChange={(event) => onFormChange('adminUserPassword', event.target.value)}
                      helperText="Leave empty to auto-generate strong password."
                      sx={{ flex: 1 }}
                    />
                    <Button
                      variant="outlined"
                      onClick={() => onFormChange('adminUserPassword', generateStrongPassword())}
                    >
                      Generate Password
                    </Button>
                  </Stack>
                ) : null}
              </Box>

              <Box>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={savingReseller ? <CircularProgress size={14} color="inherit" /> : <SaveOutlinedIcon />}
                  disabled={savingReseller}
                >
                  {savingReseller ? 'Saving...' : editingResellerId ? 'Update Reseller' : 'Create Reseller'}
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: 1.2 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Reseller List
              </Typography>
              {loadingResellers ? (
                <Stack alignItems="center" sx={{ py: 2 }}>
                  <CircularProgress size={22} />
                </Stack>
              ) : resellers.length === 0 ? (
                <Alert severity="info">No reseller websites configured yet.</Alert>
              ) : (
                <Stack spacing={0.8}>
                  {resellers.map((reseller) => (
                    <Card
                      key={reseller.id}
                      variant={selectedResellerId === reseller.id ? 'elevation' : 'outlined'}
                      sx={{ borderColor: selectedResellerId === reseller.id ? 'primary.main' : undefined }}
                    >
                      <CardContent sx={{ p: 1 }}>
                        <Stack spacing={0.8}>
                          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={0.8}>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {reseller.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {reseller.websiteName || reseller.name}
                              </Typography>
                              {reseller.adminUserEmail ? (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Login: {reseller.adminUserEmail}
                                </Typography>
                              ) : null}
                            </Box>

                            <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
                              {reseller.primaryDomain && (
                                <Chip size="small" color="primary" variant="outlined" label={`Primary: ${reseller.primaryDomain}`} />
                              )}
                              {isDevelopment && reseller.devPort ? (
                                <Chip size="small" variant="outlined" label={`Port: ${reseller.devPort}`} />
                              ) : null}
                              <Chip
                                size="small"
                                color={reseller.isActive ? 'success' : 'default'}
                                label={reseller.isActive ? 'Active' : 'Inactive'}
                              />
                              <Chip size="small" label={`Default Margin: ${reseller.defaultMarginPercent}%`} />
                              <Chip size="small" label={`Overrides: ${reseller.productMarginOverrides || 0}`} />
                            </Stack>
                          </Stack>

                          <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
                            {(Array.isArray(reseller.domains) ? reseller.domains : []).map((domain) => (
                              <Chip key={`${reseller.id}-${domain}`} size="small" label={domain} variant="outlined" />
                            ))}
                          </Stack>

                          <Stack direction="row" spacing={0.7}>
                            {isDevelopment && reseller.devLocalUrl && (
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => window.open(reseller.devLocalUrl, '_blank', 'noopener,noreferrer')}
                              >
                                Open Dev URL
                              </Button>
                            )}
                            <Button
                              variant={selectedResellerId === reseller.id ? 'contained' : 'outlined'}
                              size="small"
                              onClick={() => setSelectedResellerId(reseller.id)}
                            >
                              Manage Margins
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<EditOutlinedIcon />}
                              onClick={() => onEditReseller(reseller)}
                            >
                              Edit
                            </Button>
                            <IconButton
                              color="error"
                              size="small"
                              disabled={busyResellerId === reseller.id}
                              onClick={() => onDeleteReseller(reseller.id)}
                            >
                              {busyResellerId === reseller.id
                                ? <CircularProgress size={16} color="inherit" />
                                : <DeleteOutlineOutlinedIcon fontSize="small" />}
                            </IconButton>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: 1.2 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Margin Management
              </Typography>

              {!selectedReseller ? (
                <Alert severity="info">Select a reseller to manage pricing margins.</Alert>
              ) : (
                <>
                  <Alert severity="info">
                    Managing margins for <strong>{selectedReseller.name}</strong> ({selectedReseller.domains?.[0] || 'No domain'})
                  </Alert>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.8} alignItems={{ sm: 'center' }}>
                    <TextField
                      type="number"
                      inputProps={{ min: 0, step: 0.01 }}
                      label="Margin for all products (%)"
                      value={globalMarginDraft}
                      onChange={(event) => setGlobalMarginDraft(event.target.value)}
                      sx={{ maxWidth: 260 }}
                    />
                    <Button
                      variant="contained"
                      disabled={savingAllMargin}
                      onClick={onApplyMarginToAllProducts}
                    >
                      {savingAllMargin ? 'Applying...' : 'Apply to All Products'}
                    </Button>
                  </Stack>

                  <Divider />

                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={0.8} justifyContent="space-between">
                    <TextField
                      size="small"
                      label="Search Products"
                      value={productSearch}
                      onChange={(event) => {
                        setProductSearch(event.target.value);
                        setProductPage(1);
                      }}
                      sx={{ width: { xs: '100%', md: 320 } }}
                    />
                    {loadingProducts && <CircularProgress size={18} />}
                  </Stack>

                  {loadingProducts ? (
                    <Stack alignItems="center" sx={{ py: 2 }}>
                      <CircularProgress size={22} />
                    </Stack>
                  ) : filteredProducts.length === 0 ? (
                    <Alert severity="info">No products found for margin configuration.</Alert>
                  ) : (
                    <>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Product</TableCell>
                            <TableCell align="right">Base Price</TableCell>
                            <TableCell align="right">Effective Margin</TableCell>
                            <TableCell align="right">Reseller Price</TableCell>
                            <TableCell align="right">Override Margin (%)</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {paginatedProducts.map((product) => {
                            const productId = String(product?._id || '');
                            const overrides = selectedReseller.productMargins || {};
                            const hasOverride = Object.prototype.hasOwnProperty.call(overrides, productId);
                            const effectiveMargin = hasOverride
                              ? normalizeMarginNumber(overrides[productId], selectedReseller.defaultMarginPercent || 0)
                              : normalizeMarginNumber(selectedReseller.defaultMarginPercent || 0, 0);
                            const basePrice = Number(product?.price || 0);
                            const resellerPrice = Number((basePrice * (1 + effectiveMargin / 100)).toFixed(2));
                            const draftValue = Object.prototype.hasOwnProperty.call(productMarginDrafts, productId)
                              ? productMarginDrafts[productId]
                              : String(effectiveMargin);

                            return (
                              <TableRow key={productId} hover>
                                <TableCell>
                                  <Stack spacing={0.2}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      {product.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {product.brand || '-'} | {product.category || '-'}
                                    </Typography>
                                  </Stack>
                                </TableCell>
                                <TableCell align="right">{formatINR(basePrice)}</TableCell>
                                <TableCell align="right">{effectiveMargin}%</TableCell>
                                <TableCell align="right">{formatINR(resellerPrice)}</TableCell>
                                <TableCell align="right">
                                  <TextField
                                    size="small"
                                    type="number"
                                    value={draftValue}
                                    inputProps={{ min: 0, step: 0.01 }}
                                    onChange={(event) =>
                                      setProductMarginDrafts((current) => ({
                                        ...current,
                                        [productId]: event.target.value
                                      }))}
                                    sx={{ width: 120 }}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Stack direction="row" spacing={0.6} justifyContent="flex-end">
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      disabled={savingProductMarginId === productId}
                                      onClick={() => onSaveProductMargin(productId)}
                                    >
                                      {savingProductMarginId === productId ? 'Saving...' : 'Save'}
                                    </Button>
                                    <Button
                                      size="small"
                                      color="warning"
                                      variant="outlined"
                                      disabled={savingProductMarginId === productId || !hasOverride}
                                      onClick={() => onClearProductOverride(productId)}
                                    >
                                      Clear
                                    </Button>
                                  </Stack>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>

                      <AppPagination
                        totalItems={productTotalItems}
                        page={productPage}
                        totalPages={productTotalPages}
                        rowsPerPage={productRowsPerPage}
                        onPageChange={setProductPage}
                        onRowsPerPageChange={(nextRowsPerPage) => {
                          setProductRowsPerPage(nextRowsPerPage);
                          setProductPage(1);
                        }}
                        pageSizeOptions={[5, 10, 20, 30]}
                      />
                    </>
                  )}
                </>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default AdminResellersPage;
