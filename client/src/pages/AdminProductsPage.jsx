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
  Grid,
  MenuItem,
  Stack,
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
import PageHeader from '../components/PageHeader';
import api from '../api';
import { formatINR } from '../utils/currency';

const initialForm = {
  name: '',
  description: '',
  image: '',
  brand: 'Astra Attire',
  category: 'T-Shirts',
  gender: 'Unisex',
  sizes: 'S,M,L,XL',
  colors: 'Black,White',
  material: '',
  fit: 'Regular',
  variants: '',
  price: '',
  countInStock: ''
};

const categories = ['T-Shirts', 'Shirts', 'Jeans', 'Trousers', 'Dresses', 'Jackets', 'Tops', 'Activewear', 'Polos', 'Skirts', 'Shoes'];
const genders = ['Men', 'Women', 'Unisex'];
const orderStatuses = ['pending', 'processing', 'paid', 'shipped', 'delivered', 'cancelled'];

const statusColorMap = {
  pending: 'warning',
  processing: 'info',
  paid: 'success',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'error'
};

const mapProductToForm = (product) => ({
  name: product.name || '',
  description: product.description || '',
  image: product.image || '',
  brand: product.brand || '',
  category: product.category || 'T-Shirts',
  gender: product.gender || 'Unisex',
  sizes: Array.isArray(product.sizes) ? product.sizes.join(',') : '',
  colors: Array.isArray(product.colors) ? product.colors.join(',') : '',
  material: product.material || '',
  fit: product.fit || '',
  variants: Array.isArray(product.variants) && product.variants.length > 0 ? JSON.stringify(product.variants, null, 2) : '',
  price: product.price ?? '',
  countInStock: product.countInStock ?? ''
});

const AdminProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingProductId, setEditingProductId] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState('');
  const [statusUpdatingId, setStatusUpdatingId] = useState('');
  const [orderStatusDrafts, setOrderStatusDrafts] = useState({});

  const pendingOrdersCount = useMemo(
    () => orders.filter((order) => ['pending', 'processing'].includes(order.status)).length,
    [orders]
  );

  const fetchProducts = async () => {
    setLoadingProducts(true);

    try {
      const { data } = await api.get('/products');
      setProducts(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);

    try {
      const { data } = await api.get('/orders');
      setOrders(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load admin orders');
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    setError('');
    fetchProducts();
    fetchOrders();
  }, []);

  const onChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingProductId('');
  };

  const onSaveProduct = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const payload = {
        ...form
      };

      if (form.variants && form.variants.trim()) {
        let parsedVariants;
        try {
          parsedVariants = JSON.parse(form.variants);
        } catch {
          throw new Error('Variants must be valid JSON');
        }

        if (!Array.isArray(parsedVariants)) {
          throw new Error('Variants must be a JSON array');
        }

        payload.variants = parsedVariants;
      } else {
        delete payload.variants;
      }

      if (form.price !== '') {
        payload.price = Number(form.price);
      } else {
        delete payload.price;
      }

      if (form.countInStock !== '') {
        payload.countInStock = Number(form.countInStock);
      } else {
        delete payload.countInStock;
      }

      if (payload.price !== undefined && (Number.isNaN(payload.price) || payload.price < 0)) {
        throw new Error('Price must be a valid positive number');
      }

      if (payload.countInStock !== undefined && (Number.isNaN(payload.countInStock) || payload.countInStock < 0)) {
        throw new Error('Stock must be a valid positive number');
      }

      if (!payload.variants && payload.price === undefined) {
        throw new Error('Price is required unless variants are provided');
      }

      if (editingProductId) {
        await api.put(`/products/${editingProductId}`, payload);
        setSuccess('Product updated successfully');
      } else {
        await api.post('/products', payload);
        setSuccess('Product created successfully');
      }

      resetForm();
      await fetchProducts();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (product) => {
    setError('');
    setSuccess('');
    setEditingProductId(product._id);
    setForm(mapProductToForm(product));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onDelete = async (id) => {
    const shouldDelete = window.confirm('Delete this product?');
    if (!shouldDelete) return;

    setError('');
    setSuccess('');
    setDeletingProductId(id);

    try {
      await api.delete(`/products/${id}`);
      setProducts((current) => current.filter((item) => item._id !== id));
      if (editingProductId === id) {
        resetForm();
      }
      setSuccess('Product deleted');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to delete product');
    } finally {
      setDeletingProductId('');
    }
  };

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

  return (
    <Box>
      <PageHeader
        eyebrow="Admin"
        title="Dashboard"
        subtitle="Manage products, track incoming orders and update delivery status."
        actions={
          <Stack direction="row" spacing={0.7}>
            <Chip size="small" label={`Products: ${products.length}`} />
            <Chip size="small" color="warning" label={`Pending: ${pendingOrdersCount}`} />
            <Chip size="small" color="info" label={`Orders: ${orders.length}`} />
          </Stack>
        }
      />

      {(error || success) && (
        <Stack spacing={0.8} sx={{ mb: 1.1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
        </Stack>
      )}

      <Stack spacing={1.2}>
        <Card>
          <CardContent component="form" onSubmit={onSaveProduct}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ sm: 'center' }}
              spacing={0.8}
              sx={{ mb: 1.2 }}
            >
              <Typography variant="h6">{editingProductId ? 'Edit Product' : 'Add Product'}</Typography>
              {editingProductId && (
                <Button variant="outlined" onClick={resetForm}>
                  Cancel Edit
                </Button>
              )}
            </Stack>

            <Grid container spacing={1}>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Name" name="name" value={form.name} onChange={onChange} required />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField select fullWidth label="Category" name="category" value={form.category} onChange={onChange}>
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField select fullWidth label="Gender" name="gender" value={form.gender} onChange={onChange}>
                  {genders.map((gender) => (
                    <MenuItem key={gender} value={gender}>
                      {gender}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Brand" name="brand" value={form.brand} onChange={onChange} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Sizes (comma separated)" name="sizes" value={form.sizes} onChange={onChange} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Colors (comma separated)" name="colors" value={form.colors} onChange={onChange} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Material" name="material" value={form.material} onChange={onChange} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Fit" name="fit" value={form.fit} onChange={onChange} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth label="Price (INR)" name="price" type="number" min="0" value={form.price} onChange={onChange} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Stock"
                  name="countInStock"
                  type="number"
                  min="0"
                  value={form.countInStock}
                  onChange={onChange}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Image URL" name="image" value={form.image} onChange={onChange} />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Variants JSON (size/color/price/stock)"
                  name="variants"
                  value={form.variants}
                  onChange={onChange}
                  placeholder='[{"size":"8","color":"Black","price":4999,"stock":6},{"size":"9","color":"Black","price":5299,"stock":4}]'
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Description"
                  name="description"
                  value={form.description}
                  onChange={onChange}
                  required
                />
              </Grid>
            </Grid>

            <Button
              type="submit"
              variant="contained"
              sx={{ mt: 1.2 }}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveOutlinedIcon />}
            >
              {saving ? 'Saving...' : editingProductId ? 'Update Product' : 'Create Product'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ overflowX: 'auto' }}>
            <Typography variant="h6" sx={{ mb: 1.2 }}>
              Catalog Items
            </Typography>

            {loadingProducts && (
              <Box sx={{ py: 4, display: 'grid', placeItems: 'center' }}>
                <CircularProgress />
              </Box>
            )}

            {!loadingProducts && products.length === 0 && <Alert severity="info">No products yet.</Alert>}

            {!loadingProducts && products.length > 0 && (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Gender</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Stock</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product._id} hover>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell>{product.gender}</TableCell>
                      <TableCell align="right">{formatINR(product.price)}</TableCell>
                      <TableCell align="right">{product.countInStock}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.6} justifyContent="flex-end">
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<EditOutlinedIcon />}
                            onClick={() => onEdit(product)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            startIcon={
                              deletingProductId === product._id
                                ? <CircularProgress size={14} color="inherit" />
                                : <DeleteOutlineOutlinedIcon />
                            }
                            disabled={deletingProductId === product._id}
                            onClick={() => onDelete(product._id)}
                          >
                            {deletingProductId === product._id ? 'Deleting...' : 'Delete'}
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ overflowX: 'auto' }}>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              Order Status Management
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.2 }}>
              View received orders and update status to processing, shipped, delivered, or cancelled.
            </Typography>
            <Divider sx={{ mb: 1.2 }} />

            {loadingOrders && (
              <Box sx={{ py: 4, display: 'grid', placeItems: 'center' }}>
                <CircularProgress />
              </Box>
            )}

            {!loadingOrders && orders.length === 0 && <Alert severity="info">No orders yet.</Alert>}

            {!loadingOrders && orders.length > 0 && (
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
                  {orders.map((order) => {
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
                              {orderStatuses.map((status) => (
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
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default AdminProductsPage;
