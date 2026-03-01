import { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import PageHeader from '../components/PageHeader';
import AppPagination from '../components/AppPagination';
import api from '../api';
import usePaginationState from '../hooks/usePaginationState';
import { formatINR } from '../utils/currency';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const statusOptions = ['all', 'pending', 'processing', 'paid', 'shipped', 'delivered', 'cancelled'];
const updateStatuses = ['pending', 'processing', 'paid', 'shipped', 'delivered', 'cancelled'];
const invoiceStatuses = ['pending', 'processing', 'paid', 'shipped', 'delivered'];

const statusColorMap = {
  pending: 'warning',
  processing: 'info',
  paid: 'success',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'error'
};

const toLabel = (status) => {
  if (status === 'all') return 'All';
  return `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
};

const createEmptyInvoiceItem = () => ({
  productId: '',
  quantity: 1,
  selectedSize: '',
  selectedColor: ''
});

const createInitialManualInvoice = () => ({
  customerMode: 'existing',
  existingUserId: '',
  manualCustomer: {
    name: '',
    email: '',
    phone: ''
  },
  items: [createEmptyInvoiceItem()],
  shippingAddress: {
    fullName: '',
    phone: '',
    email: '',
    street: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India'
  },
  billingDetails: {
    sameAsShipping: true,
    fullName: '',
    phone: '',
    email: '',
    street: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India'
  },
  taxDetails: {
    businessPurchase: false,
    businessName: '',
    gstin: '',
    pan: '',
    purchaseOrderNumber: '',
    notes: ''
  },
  paymentMethod: 'Manual Invoice',
  status: 'paid'
});

const AdminOrdersPage = () => {
  const { isAdmin } = useAuth();
  const theme = useTheme();
  const isMobileTable = useMediaQuery(theme.breakpoints.down('sm'));
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [statusUpdatingId, setStatusUpdatingId] = useState('');
  const [orderStatusDrafts, setOrderStatusDrafts] = useState({});
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');
  const [invoiceLoadingCatalog, setInvoiceLoadingCatalog] = useState(false);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [manualInvoice, setManualInvoice] = useState(createInitialManualInvoice);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/orders');
      setOrders(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load admin orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return orders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const matchesId = String(order._id || '').toLowerCase().includes(query);
      const matchesName = String(order.user?.name || '').toLowerCase().includes(query);
      const matchesEmail = String(order.user?.email || '').toLowerCase().includes(query);

      return matchesId || matchesName || matchesEmail;
    });
  }, [orders, statusFilter, searchText]);
  const {
    page,
    rowsPerPage,
    totalItems,
    totalPages,
    paginatedItems,
    setPage,
    setRowsPerPage
  } = usePaginationState(filteredOrders, 10);

  const countByStatus = useMemo(() => {
    return orders.reduce(
      (counts, order) => {
        const key = order.status || 'pending';
        counts[key] = (counts[key] || 0) + 1;
        return counts;
      },
      { pending: 0, processing: 0, paid: 0, shipped: 0, delivered: 0, cancelled: 0 }
    );
  }, [orders]);

  const onStatusDraftChange = (orderId, status) => {
    setOrderStatusDrafts((current) => ({
      ...current,
      [orderId]: status
    }));
  };

  const onUpdateOrderStatus = async (orderId) => {
    const order = orders.find((item) => item._id === orderId);
    if (!order) return;

    const nextStatus = orderStatusDrafts[orderId] || order.status;
    if (nextStatus === order.status) return;

    setError('');
    setSuccess('');
    setStatusUpdatingId(orderId);

    try {
      const { data } = await api.put(`/orders/${orderId}/status`, { status: nextStatus });
      setOrders((current) => current.map((item) => (item._id === orderId ? data : item)));
      setOrderStatusDrafts((current) => {
        const next = { ...current };
        delete next[orderId];
        return next;
      });
      setSuccess('Order status updated');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to update order status');
    } finally {
      setStatusUpdatingId('');
    }
  };

  const resetManualInvoice = () => {
    setManualInvoice(createInitialManualInvoice());
    setInvoiceError('');
  };

  const getProductById = (productId) => productOptions.find((product) => product._id === productId) || null;

  const getSizeOptionsForProduct = (product) => {
    if (!product) {
      return [];
    }
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      return [...new Set(product.variants.map((variant) => String(variant.size || '').trim()).filter(Boolean))];
    }
    return Array.isArray(product.sizes) ? product.sizes.map((size) => String(size || '').trim()).filter(Boolean) : [];
  };

  const getColorOptionsForProduct = (product, selectedSize = '') => {
    if (!product) {
      return [];
    }
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      const filtered = selectedSize
        ? product.variants.filter((variant) => String(variant.size || '') === String(selectedSize || ''))
        : product.variants;
      return [...new Set(filtered.map((variant) => String(variant.color || '').trim()).filter(Boolean))];
    }
    return Array.isArray(product.colors) ? product.colors.map((color) => String(color || '').trim()).filter(Boolean) : [];
  };

  const upsertInvoiceItem = (index, updater) => {
    setManualInvoice((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? updater(item) : item))
    }));
  };

  const onInvoiceItemProductChange = (index, productId) => {
    const selectedProduct = getProductById(productId);
    const sizeOptions = getSizeOptionsForProduct(selectedProduct);
    const selectedSize = sizeOptions[0] || '';
    const colorOptions = getColorOptionsForProduct(selectedProduct, selectedSize);
    const selectedColor = colorOptions[0] || '';

    upsertInvoiceItem(index, () => ({
      productId,
      quantity: 1,
      selectedSize,
      selectedColor
    }));
  };

  const onInvoiceItemSizeChange = (index, selectedSize) => {
    const item = manualInvoice.items[index];
    const product = getProductById(item?.productId);
    const colorOptions = getColorOptionsForProduct(product, selectedSize);
    upsertInvoiceItem(index, (current) => ({
      ...current,
      selectedSize,
      selectedColor: colorOptions.includes(current.selectedColor) ? current.selectedColor : colorOptions[0] || ''
    }));
  };

  const onOpenInvoiceDialog = async () => {
    if (!isAdmin) {
      return;
    }
    resetManualInvoice();
    setInvoiceDialogOpen(true);
    setInvoiceLoadingCatalog(true);
    try {
      const [usersResponse, productsResponse] = await Promise.all([
        api.get('/auth/admin/users', {
          params: { limit: 200 }
        }),
        api.get('/products', {
          params: {
            includeOutOfStock: true,
            limit: 200,
            sort: 'newest'
          }
        })
      ]);
      const users = Array.isArray(usersResponse?.data?.users) ? usersResponse.data.users : [];
      const products = Array.isArray(productsResponse?.data?.products) ? productsResponse.data.products : [];
      setCustomerOptions(users);
      setProductOptions(products);
    } catch (requestError) {
      setInvoiceError(requestError.response?.data?.message || requestError.message || 'Failed to load invoice data');
    } finally {
      setInvoiceLoadingCatalog(false);
    }
  };

  const onCloseInvoiceDialog = () => {
    if (invoiceSubmitting) {
      return;
    }
    setInvoiceDialogOpen(false);
    resetManualInvoice();
  };

  const applyExistingCustomerDefaults = (userId) => {
    const selectedUser = customerOptions.find((user) => user._id === userId);
    if (!selectedUser) {
      return;
    }

    setManualInvoice((current) => ({
      ...current,
      existingUserId: selectedUser._id,
      manualCustomer: {
        name: selectedUser.name || '',
        email: selectedUser.email || '',
        phone: selectedUser.phone || ''
      },
      shippingAddress: {
        fullName: selectedUser.defaultShippingAddress?.fullName || selectedUser.name || '',
        phone: selectedUser.defaultShippingAddress?.phone || selectedUser.phone || '',
        email: selectedUser.defaultShippingAddress?.email || selectedUser.email || '',
        street: selectedUser.defaultShippingAddress?.street || '',
        addressLine2: selectedUser.defaultShippingAddress?.addressLine2 || '',
        city: selectedUser.defaultShippingAddress?.city || '',
        state: selectedUser.defaultShippingAddress?.state || '',
        postalCode: selectedUser.defaultShippingAddress?.postalCode || '',
        country: selectedUser.defaultShippingAddress?.country || 'India'
      },
      billingDetails: {
        sameAsShipping: selectedUser.defaultBillingDetails?.sameAsShipping !== false,
        fullName: selectedUser.defaultBillingDetails?.fullName || '',
        phone: selectedUser.defaultBillingDetails?.phone || '',
        email: selectedUser.defaultBillingDetails?.email || '',
        street: selectedUser.defaultBillingDetails?.street || '',
        addressLine2: selectedUser.defaultBillingDetails?.addressLine2 || '',
        city: selectedUser.defaultBillingDetails?.city || '',
        state: selectedUser.defaultBillingDetails?.state || '',
        postalCode: selectedUser.defaultBillingDetails?.postalCode || '',
        country: selectedUser.defaultBillingDetails?.country || 'India'
      },
      taxDetails: {
        businessPurchase: Boolean(selectedUser.defaultTaxDetails?.businessPurchase),
        businessName: selectedUser.defaultTaxDetails?.businessName || '',
        gstin: selectedUser.defaultTaxDetails?.gstin || '',
        pan: selectedUser.defaultTaxDetails?.pan || '',
        purchaseOrderNumber: selectedUser.defaultTaxDetails?.purchaseOrderNumber || '',
        notes: selectedUser.defaultTaxDetails?.notes || ''
      }
    }));
  };

  const onCreateManualInvoice = async (event) => {
    event.preventDefault();
    setInvoiceError('');
    setInvoiceSubmitting(true);

    try {
      const payload = {
        customerMode: manualInvoice.customerMode,
        userId: manualInvoice.customerMode === 'existing' ? manualInvoice.existingUserId : undefined,
        manualCustomer:
          manualInvoice.customerMode === 'manual'
            ? {
                ...manualInvoice.manualCustomer
              }
            : undefined,
        items: manualInvoice.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity || 0),
          selectedSize: item.selectedSize,
          selectedColor: item.selectedColor
        })),
        shippingAddress: {
          ...manualInvoice.shippingAddress
        },
        billingDetails: manualInvoice.billingDetails.sameAsShipping
          ? {
              sameAsShipping: true
            }
          : {
              ...manualInvoice.billingDetails,
              sameAsShipping: false
            },
        taxDetails: {
          ...manualInvoice.taxDetails
        },
        paymentMethod: manualInvoice.paymentMethod,
        status: manualInvoice.status
      };

      const { data } = await api.post('/orders/admin/manual-invoice', payload);
      const createdOrder = data?.order;
      if (createdOrder?._id) {
        setOrders((current) => [createdOrder, ...current]);
        setSuccess(`Invoice ${createdOrder._id.slice(-8).toUpperCase()} created successfully`);
      }
      setInvoiceDialogOpen(false);
      resetManualInvoice();
    } catch (requestError) {
      setInvoiceError(requestError.response?.data?.message || requestError.message || 'Failed to create invoice');
    } finally {
      setInvoiceSubmitting(false);
    }
  };

  return (
    <Box>
      <PageHeader
        eyebrow="Admin"
        title="Orders Management"
        subtitle="Track all received orders, filter by status and update fulfillment stages."
        actions={
          <Stack direction="row" spacing={0.7} flexWrap="wrap" useFlexGap>
            <Chip size="small" color="warning" label={`Pending: ${countByStatus.pending + countByStatus.processing}`} />
            <Chip size="small" color="info" label={`Shipped: ${countByStatus.shipped}`} />
            <Chip size="small" color="success" label={`Delivered: ${countByStatus.delivered}`} />
            {isAdmin ? (
              <Button
                size="small"
                variant="contained"
                startIcon={<ReceiptLongOutlinedIcon />}
                onClick={onOpenInvoiceDialog}
              >
                Create Invoice
              </Button>
            ) : null}
          </Stack>
        }
      />

      {(error || success) && (
        <Stack spacing={0.8} sx={{ mb: 1.1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
        </Stack>
      )}

      <Card sx={{ mb: 1.2 }}>
        <CardContent sx={{ p: 1 }}>
          <Stack spacing={1}>
            <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
              {statusOptions.map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'contained' : 'outlined'}
                  onClick={() => setStatusFilter(status)}
                  size="small"
                  sx={{ textTransform: 'none' }}
                >
                  {toLabel(status)}
                </Button>
              ))}
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.8} alignItems={{ sm: 'center' }}>
              <TextField
                size="small"
                label="Search Order / Customer"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                sx={{ minWidth: { sm: 280 } }}
              />
              <Typography variant="body2" color="text.secondary">
                Showing {filteredOrders.length} of {orders.length} orders
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ overflowX: 'auto' }}>
          {loading && (
            <Box sx={{ py: 4, display: 'grid', placeItems: 'center' }}>
              <CircularProgress />
            </Box>
          )}

          {!loading && filteredOrders.length === 0 && (
            <Alert severity="info">No orders match the selected filters.</Alert>
          )}

          {!loading && filteredOrders.length > 0 && (
            <>
              {isMobileTable ? (
                <Stack spacing={0.8}>
                  {paginatedItems.map((order) => {
                    const selectedStatus = orderStatusDrafts[order._id] || order.status;
                    const itemNames = (order.orderItems || [])
                      .slice(0, 2)
                      .map((item) => `${item.name} x${item.quantity}`)
                      .join(', ');
                    const extraItemCount = Math.max(0, (order.orderItems || []).length - 2);
                    const isSameStatus = selectedStatus === order.status;

                    return (
                      <Card key={order._id} variant="outlined">
                        <CardContent sx={{ p: 1 }}>
                          <Stack spacing={0.7}>
                            <Stack direction="row" justifyContent="space-between" spacing={0.8}>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  {order._id.slice(-8).toUpperCase()}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(order.createdAt).toLocaleDateString('en-IN')} • {order.paymentMethod}
                                </Typography>
                              </Box>
                              <Chip
                                label={order.status}
                                size="small"
                                color={statusColorMap[order.status] || 'default'}
                                sx={{ textTransform: 'capitalize' }}
                              />
                            </Stack>

                            <Box>
                              <Typography variant="body2">{order.user?.name || 'Guest'}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {order.user?.email || '-'}
                              </Typography>
                            </Box>

                            <Typography variant="body2">
                              {itemNames || '-'}
                              {extraItemCount > 0 ? ` (+${extraItemCount} more)` : ''}
                            </Typography>

                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="caption" color="text.secondary">Total</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatINR(order.totalPrice)}</Typography>
                            </Stack>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.6}>
                              <TextField
                                select
                                size="small"
                                value={selectedStatus}
                                onChange={(event) => onStatusDraftChange(order._id, event.target.value)}
                                fullWidth
                              >
                                {updateStatuses.map((status) => (
                                  <MenuItem key={status} value={status} sx={{ textTransform: 'capitalize' }}>
                                    {status}
                                  </MenuItem>
                                ))}
                              </TextField>
                              <Button
                                variant="contained"
                                size="small"
                                disabled={isSameStatus || statusUpdatingId === order._id}
                                startIcon={
                                  statusUpdatingId === order._id
                                    ? <CircularProgress size={14} color="inherit" />
                                    : undefined
                                }
                                onClick={() => onUpdateOrderStatus(order._id)}
                                fullWidth
                              >
                                {statusUpdatingId === order._id ? 'Updating...' : 'Update'}
                              </Button>
                              <Button
                                component={RouterLink}
                                to={`/orders/${order._id}`}
                                variant="outlined"
                                size="small"
                                startIcon={<VisibilityOutlinedIcon />}
                                fullWidth
                              >
                                Invoice
                              </Button>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Order</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Items</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell>Current</TableCell>
                      <TableCell>Change Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedItems.map((order) => {
                      const selectedStatus = orderStatusDrafts[order._id] || order.status;
                      const itemNames = (order.orderItems || [])
                        .slice(0, 2)
                        .map((item) => `${item.name} x${item.quantity}`)
                        .join(', ');
                      const extraItemCount = Math.max(0, (order.orderItems || []).length - 2);
                      const isSameStatus = selectedStatus === order.status;

                      return (
                        <TableRow key={order._id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {order._id.slice(-8).toUpperCase()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {order.paymentMethod}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{order.user?.name || 'Guest'}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {order.user?.email || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>{new Date(order.createdAt).toLocaleDateString('en-IN')}</TableCell>
                          <TableCell sx={{ minWidth: 220 }}>
                            <Typography variant="body2">{itemNames || '-'}</Typography>
                            {extraItemCount > 0 && (
                              <Typography variant="caption" color="text.secondary">
                                +{extraItemCount} more item(s)
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">{formatINR(order.totalPrice)}</TableCell>
                          <TableCell>
                            <Chip
                              label={order.status}
                              size="small"
                              color={statusColorMap[order.status] || 'default'}
                              sx={{ textTransform: 'capitalize' }}
                            />
                          </TableCell>
                          <TableCell sx={{ minWidth: 220 }}>
                            <Stack direction="row" spacing={0.6}>
                              <TextField
                                select
                                size="small"
                                value={selectedStatus}
                                onChange={(event) => onStatusDraftChange(order._id, event.target.value)}
                                sx={{ minWidth: 130 }}
                              >
                                {updateStatuses.map((status) => (
                                  <MenuItem key={status} value={status} sx={{ textTransform: 'capitalize' }}>
                                    {status}
                                  </MenuItem>
                                ))}
                              </TextField>
                              <Button
                                variant="contained"
                                size="small"
                                disabled={isSameStatus || statusUpdatingId === order._id}
                                startIcon={
                                  statusUpdatingId === order._id
                                    ? <CircularProgress size={14} color="inherit" />
                                    : undefined
                                }
                                onClick={() => onUpdateOrderStatus(order._id)}
                              >
                                {statusUpdatingId === order._id ? 'Updating...' : 'Update'}
                              </Button>
                              <Button
                                component={RouterLink}
                                to={`/orders/${order._id}`}
                                variant="outlined"
                                size="small"
                                startIcon={<VisibilityOutlinedIcon />}
                              >
                                Invoice
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </>
          )}

          {!loading && filteredOrders.length > 0 && (
            <AppPagination
              totalItems={totalItems}
              page={page}
              totalPages={totalPages}
              rowsPerPage={rowsPerPage}
              onPageChange={setPage}
              onRowsPerPageChange={setRowsPerPage}
              pageSizeOptions={[5, 10, 20, 30]}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={invoiceDialogOpen && isAdmin} onClose={onCloseInvoiceDialog} maxWidth="md" fullWidth>
        <DialogTitle>Create Manual Invoice</DialogTitle>
        <DialogContent dividers>
          <Stack component="form" id="manual-invoice-form" onSubmit={onCreateManualInvoice} spacing={1.2} sx={{ mt: 0.4 }}>
            {invoiceError && <Alert severity="error">{invoiceError}</Alert>}

            {invoiceLoadingCatalog && (
              <Box sx={{ py: 2, display: 'grid', placeItems: 'center' }}>
                <CircularProgress size={20} />
              </Box>
            )}

            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Customer
            </Typography>
            <TextField
              select
              size="small"
              label="Customer Source"
              value={manualInvoice.customerMode}
              onChange={(event) =>
                setManualInvoice((current) => ({
                  ...current,
                  customerMode: event.target.value
                }))
              }
            >
              <MenuItem value="existing">Select Existing User</MenuItem>
              <MenuItem value="manual">Add Manual User</MenuItem>
            </TextField>

            {manualInvoice.customerMode === 'existing' ? (
              <Autocomplete
                options={customerOptions}
                getOptionLabel={(option) => `${option.name || 'User'} (${option.email || '-'})`}
                value={customerOptions.find((user) => user._id === manualInvoice.existingUserId) || null}
                onChange={(_event, nextUser) => {
                  const nextUserId = nextUser?._id || '';
                  setManualInvoice((current) => ({
                    ...current,
                    existingUserId: nextUserId
                  }));
                  if (nextUserId) {
                    applyExistingCustomerDefaults(nextUserId);
                  }
                }}
                renderInput={(params) => <TextField {...params} required size="small" label="Select Existing User" />}
              />
            ) : (
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' } }}>
                <TextField
                  required
                  size="small"
                  label="Full Name"
                  value={manualInvoice.manualCustomer.name}
                  onChange={(event) =>
                    setManualInvoice((current) => ({
                      ...current,
                      manualCustomer: {
                        ...current.manualCustomer,
                        name: event.target.value
                      },
                      shippingAddress: {
                        ...current.shippingAddress,
                        fullName: event.target.value
                      }
                    }))
                  }
                />
                <TextField
                  required
                  size="small"
                  label="Email"
                  type="email"
                  value={manualInvoice.manualCustomer.email}
                  onChange={(event) =>
                    setManualInvoice((current) => ({
                      ...current,
                      manualCustomer: {
                        ...current.manualCustomer,
                        email: event.target.value
                      },
                      shippingAddress: {
                        ...current.shippingAddress,
                        email: event.target.value
                      }
                    }))
                  }
                />
                <TextField
                  size="small"
                  label="Phone"
                  value={manualInvoice.manualCustomer.phone}
                  onChange={(event) =>
                    setManualInvoice((current) => ({
                      ...current,
                      manualCustomer: {
                        ...current.manualCustomer,
                        phone: event.target.value
                      },
                      shippingAddress: {
                        ...current.shippingAddress,
                        phone: event.target.value
                      }
                    }))
                  }
                />
              </Box>
            )}

            <Divider />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Invoice Items
            </Typography>

            <Stack spacing={0.8}>
              {manualInvoice.items.map((item, index) => {
                const selectedProduct = getProductById(item.productId);
                const sizeOptions = getSizeOptionsForProduct(selectedProduct);
                const colorOptions = getColorOptionsForProduct(selectedProduct, item.selectedSize);

                return (
                  <Card key={`invoice-item-${index}`} variant="outlined">
                    <CardContent sx={{ p: 1 }}>
                      <Stack spacing={0.8}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            Item {index + 1}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() =>
                              setManualInvoice((current) => ({
                                ...current,
                                items:
                                  current.items.length > 1
                                    ? current.items.filter((_currentItem, itemIndex) => itemIndex !== index)
                                    : current.items
                              }))
                            }
                            disabled={manualInvoice.items.length <= 1}
                          >
                            <DeleteOutlineOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Stack>

                        <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 1fr 1fr' } }}>
                          <TextField
                            select
                            required
                            size="small"
                            label="Product"
                            value={item.productId}
                            onChange={(event) => onInvoiceItemProductChange(index, event.target.value)}
                          >
                            {productOptions.map((product) => (
                              <MenuItem key={product._id} value={product._id}>
                                {product.name}
                              </MenuItem>
                            ))}
                          </TextField>

                          <TextField
                            required
                            size="small"
                            type="number"
                            label="Qty"
                            inputProps={{ min: 1 }}
                            value={item.quantity}
                            onChange={(event) =>
                              upsertInvoiceItem(index, (current) => ({
                                ...current,
                                quantity: event.target.value
                              }))
                            }
                          />

                          <TextField
                            select
                            required={sizeOptions.length > 0}
                            size="small"
                            label="Size"
                            value={item.selectedSize}
                            onChange={(event) => onInvoiceItemSizeChange(index, event.target.value)}
                            disabled={!item.productId || sizeOptions.length === 0}
                          >
                            {sizeOptions.map((size) => (
                              <MenuItem key={size} value={size}>
                                {size}
                              </MenuItem>
                            ))}
                          </TextField>

                          <TextField
                            select
                            required={colorOptions.length > 0}
                            size="small"
                            label="Color"
                            value={item.selectedColor}
                            onChange={(event) =>
                              upsertInvoiceItem(index, (current) => ({
                                ...current,
                                selectedColor: event.target.value
                              }))
                            }
                            disabled={!item.productId || colorOptions.length === 0}
                          >
                            {colorOptions.map((color) => (
                              <MenuItem key={color} value={color}>
                                {color}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>

            <Button
              type="button"
              variant="outlined"
              startIcon={<AddCircleOutlineOutlinedIcon />}
              onClick={() =>
                setManualInvoice((current) => ({
                  ...current,
                  items: [...current.items, createEmptyInvoiceItem()]
                }))
              }
            >
              Add Item
            </Button>

            <Divider />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Shipping Address
            </Typography>

            <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
              <TextField
                required
                size="small"
                label="Full Name"
                value={manualInvoice.shippingAddress.fullName}
                onChange={(event) =>
                  setManualInvoice((current) => ({
                    ...current,
                    shippingAddress: {
                      ...current.shippingAddress,
                      fullName: event.target.value
                    }
                  }))
                }
              />
              <TextField
                required
                size="small"
                label="Phone"
                value={manualInvoice.shippingAddress.phone}
                onChange={(event) =>
                  setManualInvoice((current) => ({
                    ...current,
                    shippingAddress: {
                      ...current.shippingAddress,
                      phone: event.target.value
                    }
                  }))
                }
              />
              <TextField
                required
                size="small"
                label="Email"
                type="email"
                value={manualInvoice.shippingAddress.email}
                onChange={(event) =>
                  setManualInvoice((current) => ({
                    ...current,
                    shippingAddress: {
                      ...current.shippingAddress,
                      email: event.target.value
                    }
                  }))
                }
              />
              <TextField
                required
                size="small"
                label="Street"
                value={manualInvoice.shippingAddress.street}
                onChange={(event) =>
                  setManualInvoice((current) => ({
                    ...current,
                    shippingAddress: {
                      ...current.shippingAddress,
                      street: event.target.value
                    }
                  }))
                }
              />
              <TextField
                size="small"
                label="Address Line 2"
                value={manualInvoice.shippingAddress.addressLine2}
                onChange={(event) =>
                  setManualInvoice((current) => ({
                    ...current,
                    shippingAddress: {
                      ...current.shippingAddress,
                      addressLine2: event.target.value
                    }
                  }))
                }
              />
              <TextField
                required
                size="small"
                label="City"
                value={manualInvoice.shippingAddress.city}
                onChange={(event) =>
                  setManualInvoice((current) => ({
                    ...current,
                    shippingAddress: {
                      ...current.shippingAddress,
                      city: event.target.value
                    }
                  }))
                }
              />
              <TextField
                required
                size="small"
                label="State"
                value={manualInvoice.shippingAddress.state}
                onChange={(event) =>
                  setManualInvoice((current) => ({
                    ...current,
                    shippingAddress: {
                      ...current.shippingAddress,
                      state: event.target.value
                    }
                  }))
                }
              />
              <TextField
                required
                size="small"
                label="Postal Code"
                value={manualInvoice.shippingAddress.postalCode}
                onChange={(event) =>
                  setManualInvoice((current) => ({
                    ...current,
                    shippingAddress: {
                      ...current.shippingAddress,
                      postalCode: event.target.value
                    }
                  }))
                }
              />
              <TextField
                required
                size="small"
                label="Country"
                value={manualInvoice.shippingAddress.country}
                onChange={(event) =>
                  setManualInvoice((current) => ({
                    ...current,
                    shippingAddress: {
                      ...current.shippingAddress,
                      country: event.target.value
                    }
                  }))
                }
              />
            </Box>

            <Divider />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Billing and Payment
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={manualInvoice.billingDetails.sameAsShipping}
                  onChange={(event) =>
                    setManualInvoice((current) => ({
                      ...current,
                      billingDetails: {
                        ...current.billingDetails,
                        sameAsShipping: event.target.checked
                      }
                    }))
                  }
                />
              }
              label="Billing same as shipping"
            />

            {!manualInvoice.billingDetails.sameAsShipping && (
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
                <TextField
                  required
                  size="small"
                  label="Billing Full Name"
                  value={manualInvoice.billingDetails.fullName}
                  onChange={(event) =>
                    setManualInvoice((current) => ({
                      ...current,
                      billingDetails: {
                        ...current.billingDetails,
                        fullName: event.target.value
                      }
                    }))
                  }
                />
                <TextField
                  required
                  size="small"
                  label="Billing Phone"
                  value={manualInvoice.billingDetails.phone}
                  onChange={(event) =>
                    setManualInvoice((current) => ({
                      ...current,
                      billingDetails: {
                        ...current.billingDetails,
                        phone: event.target.value
                      }
                    }))
                  }
                />
                <TextField
                  required
                  size="small"
                  label="Billing Street"
                  value={manualInvoice.billingDetails.street}
                  onChange={(event) =>
                    setManualInvoice((current) => ({
                      ...current,
                      billingDetails: {
                        ...current.billingDetails,
                        street: event.target.value
                      }
                    }))
                  }
                />
                <TextField
                  required
                  size="small"
                  label="Billing City"
                  value={manualInvoice.billingDetails.city}
                  onChange={(event) =>
                    setManualInvoice((current) => ({
                      ...current,
                      billingDetails: {
                        ...current.billingDetails,
                        city: event.target.value
                      }
                    }))
                  }
                />
                <TextField
                  required
                  size="small"
                  label="Billing State"
                  value={manualInvoice.billingDetails.state}
                  onChange={(event) =>
                    setManualInvoice((current) => ({
                      ...current,
                      billingDetails: {
                        ...current.billingDetails,
                        state: event.target.value
                      }
                    }))
                  }
                />
                <TextField
                  required
                  size="small"
                  label="Billing Postal Code"
                  value={manualInvoice.billingDetails.postalCode}
                  onChange={(event) =>
                    setManualInvoice((current) => ({
                      ...current,
                      billingDetails: {
                        ...current.billingDetails,
                        postalCode: event.target.value
                      }
                    }))
                  }
                />
              </Box>
            )}

            <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' } }}>
              <TextField
                size="small"
                label="Payment Method"
                value={manualInvoice.paymentMethod}
                onChange={(event) =>
                  setManualInvoice((current) => ({
                    ...current,
                    paymentMethod: event.target.value
                  }))
                }
              />
              <TextField
                select
                size="small"
                label="Order Status"
                value={manualInvoice.status}
                onChange={(event) =>
                  setManualInvoice((current) => ({
                    ...current,
                    status: event.target.value
                  }))
                }
              >
                {invoiceStatuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    {toLabel(status)}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseInvoiceDialog} disabled={invoiceSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="manual-invoice-form"
            variant="contained"
            disabled={invoiceSubmitting || invoiceLoadingCatalog}
            startIcon={invoiceSubmitting ? <CircularProgress size={14} color="inherit" /> : <ReceiptLongOutlinedIcon />}
          >
            {invoiceSubmitting ? 'Creating...' : 'Create Invoice'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminOrdersPage;
