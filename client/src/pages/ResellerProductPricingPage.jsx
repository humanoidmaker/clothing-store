import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import AppPagination from '../components/AppPagination';
import PageHeader from '../components/PageHeader';
import api from '../api';
import usePaginationState from '../hooks/usePaginationState';
import { formatINR } from '../utils/currency';

const normalizeMarginNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Number(Math.max(0, parsed).toFixed(2));
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

const ResellerProductPricingPage = () => {
  const [reseller, setReseller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingReseller, setLoadingReseller] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [savingAllMargin, setSavingAllMargin] = useState(false);
  const [savingProductMarginId, setSavingProductMarginId] = useState('');
  const [globalMarginDraft, setGlobalMarginDraft] = useState('0');
  const [productMarginDrafts, setProductMarginDrafts] = useState({});
  const [productSearch, setProductSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const {
    page,
    rowsPerPage,
    totalItems,
    totalPages,
    paginatedItems,
    setPage,
    setRowsPerPage
  } = usePaginationState(filteredProducts, 10);

  const refreshReseller = async () => {
    setLoadingReseller(true);
    try {
      const { data } = await api.get('/resellers/me', { showSuccessToast: false });
      setReseller(data?.reseller || null);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Failed to load reseller pricing profile');
      setReseller(null);
    } finally {
      setLoadingReseller(false);
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
    void refreshReseller();
    void refreshProducts();
  }, []);

  useEffect(() => {
    if (!reseller) {
      setGlobalMarginDraft('0');
      setProductMarginDrafts({});
      return;
    }

    setGlobalMarginDraft(String(reseller.defaultMarginPercent ?? 0));
    const nextDrafts = {};
    const overrides =
      reseller.productMargins && typeof reseller.productMargins === 'object' && !Array.isArray(reseller.productMargins)
        ? reseller.productMargins
        : {};
    for (const [productId, margin] of Object.entries(overrides)) {
      nextDrafts[productId] = String(margin);
    }
    setProductMarginDrafts(nextDrafts);
    setPage(1);
  }, [reseller, setPage]);

  const refreshResellerAndKeepState = async () => {
    const { data } = await api.get('/resellers/me', { showSuccessToast: false });
    setReseller(data?.reseller || null);
  };

  const onApplyMarginToAllProducts = async () => {
    if (!reseller?.id) {
      return;
    }

    setSavingAllMargin(true);
    setError('');
    setSuccess('');

    try {
      const marginPercent = normalizeMarginNumber(globalMarginDraft, reseller.defaultMarginPercent || 0);
      await api.put('/resellers/me/margins/default', {
        marginPercent,
        clearProductOverrides: true
      });
      await refreshResellerAndKeepState();
      setSuccess('Default margin applied to your full catalog');
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Failed to apply default margin');
    } finally {
      setSavingAllMargin(false);
    }
  };

  const onSaveProductMargin = async (productId) => {
    if (!reseller?.id || !productId) {
      return;
    }

    setSavingProductMarginId(productId);
    setError('');
    setSuccess('');
    try {
      const fallback = reseller.defaultMarginPercent || 0;
      const marginPercent = normalizeMarginNumber(productMarginDrafts[productId], fallback);
      await api.put('/resellers/me/margins/products', {
        updates: [
          {
            productId,
            marginPercent
          }
        ]
      });
      await refreshResellerAndKeepState();
      setSuccess('Product margin saved');
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Failed to save product margin');
    } finally {
      setSavingProductMarginId('');
    }
  };

  const onClearProductOverride = async (productId) => {
    if (!reseller?.id || !productId) {
      return;
    }

    setSavingProductMarginId(productId);
    setError('');
    setSuccess('');
    try {
      await api.put('/resellers/me/margins/products', {
        updates: [
          {
            productId,
            remove: true
          }
        ]
      });
      await refreshResellerAndKeepState();
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
        eyebrow="Reseller"
        title="Product Pricing"
        subtitle="Apply a global margin or set product-wise overrides for your website."
      />

      {(error || success) ? (
        <Stack spacing={0.8} sx={{ mb: 1.1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {success ? <Alert severity="success">{success}</Alert> : null}
        </Stack>
      ) : null}

      <Card>
        <CardContent sx={{ p: 1.2 }}>
          {loadingReseller ? (
            <Stack alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={22} />
            </Stack>
          ) : !reseller ? (
            <Alert severity="error">Reseller profile not found. Contact main admin.</Alert>
          ) : (
            <Stack spacing={1}>
              <Alert severity="info">
                Managing pricing for <strong>{reseller.websiteName || reseller.name}</strong> ({reseller.primaryDomain || 'No domain'})
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
                <Button variant="contained" disabled={savingAllMargin} onClick={onApplyMarginToAllProducts}>
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
                    setPage(1);
                  }}
                  sx={{ width: { xs: '100%', md: 320 } }}
                />
                {loadingProducts ? <CircularProgress size={18} /> : null}
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
                        <TableCell align="right">Your Price</TableCell>
                        <TableCell align="right">Override Margin (%)</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedItems.map((product) => {
                        const productId = String(product?._id || '');
                        const overrides = reseller.productMargins || {};
                        const hasOverride = Object.prototype.hasOwnProperty.call(overrides, productId);
                        const effectiveMargin = hasOverride
                          ? normalizeMarginNumber(overrides[productId], reseller.defaultMarginPercent || 0)
                          : normalizeMarginNumber(reseller.defaultMarginPercent || 0, 0);
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
                                  }))
                                }
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
                    totalItems={totalItems}
                    page={page}
                    totalPages={totalPages}
                    rowsPerPage={rowsPerPage}
                    onPageChange={setPage}
                    onRowsPerPageChange={(nextRowsPerPage) => {
                      setRowsPerPage(nextRowsPerPage);
                      setPage(1);
                    }}
                    pageSizeOptions={[5, 10, 20, 30]}
                  />
                </>
              )}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ResellerProductPricingPage;
