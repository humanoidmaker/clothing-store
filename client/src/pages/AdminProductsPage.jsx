import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
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
  const [form, setForm] = useState(initialForm);
  const [editingProductId, setEditingProductId] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState('');

  const fetchProducts = async () => {
    setLoadingProducts(true);
    setError('');

    try {
      const { data } = await api.get('/products');
      setProducts(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load products');
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
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

  return (
    <Box>
      <PageHeader
        eyebrow="Admin"
        title="Products Management"
        subtitle="Add, edit and delete catalog items with size-wise variant pricing."
        actions={<Chip size="small" label={`Total Products: ${products.length}`} />}
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
      </Stack>
    </Box>
  );
};

export default AdminProductsPage;
