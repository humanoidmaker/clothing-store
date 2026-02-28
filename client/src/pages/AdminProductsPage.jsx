import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
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

const AdminProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/products');
      setProducts(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const onCreate = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload = {
        ...form,
        price: Number(form.price),
        countInStock: Number(form.countInStock || 0)
      };

      if (!form.variants || !form.variants.trim()) {
        delete payload.variants;
      }

      await api.post('/products', {
        ...payload
      });
      setForm(initialForm);
      await fetchProducts();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    const shouldDelete = window.confirm('Delete this product?');
    if (!shouldDelete) return;

    try {
      await api.delete(`/products/${id}`);
      setProducts((current) => current.filter((item) => item._id !== id));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to delete product');
    }
  };

  return (
    <Box>
      <PageHeader
        eyebrow="Admin"
        title="Catalog Management"
        subtitle="Create and maintain clothing inventory with category and variant metadata."
      />

      <Stack direction={{ xs: 'column', xl: 'row' }} spacing={2.2} alignItems="flex-start">
        <Card sx={{ width: '100%', flex: 1 }}>
          <CardContent component="form" onSubmit={onCreate}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Add Product
            </Typography>

            <Grid container spacing={1.6}>
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
                <TextField fullWidth label="Price (INR)" name="price" type="number" min="0" value={form.price} onChange={onChange} required />
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

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={saving}>
              {saving ? 'Saving...' : 'Create Product'}
            </Button>
          </CardContent>
        </Card>

        <Card sx={{ width: '100%', flex: 1.2 }}>
          <CardContent sx={{ overflowX: 'auto' }}>
            <Typography variant="h6" sx={{ mb: 1.2 }}>
              Current Catalog
            </Typography>

            {loading && (
              <Box sx={{ py: 6, display: 'grid', placeItems: 'center' }}>
                <CircularProgress />
              </Box>
            )}

            {!loading && products.length === 0 && <Alert severity="info">No products yet.</Alert>}

            {!loading && products.length > 0 && (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Gender</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Stock</TableCell>
                    <TableCell align="right">Action</TableCell>
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
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<DeleteOutlineOutlinedIcon />}
                          onClick={() => onDelete(product._id)}
                        >
                          Delete
                        </Button>
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

