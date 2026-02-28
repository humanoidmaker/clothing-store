import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
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
  Grid,
  IconButton,
  Stack,
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
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import RemoveCircleOutlineOutlinedIcon from '@mui/icons-material/RemoveCircleOutlineOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import PageHeader from '../components/PageHeader';
import HtmlEditorField from '../components/HtmlEditorField';
import ProductImageViewport from '../components/ProductImageViewport';
import api from '../api';
import { formatINR } from '../utils/currency';

const defaultCategoryOptions = ['T-Shirts', 'Shirts', 'Jeans', 'Trousers', 'Dresses', 'Jackets', 'Tops', 'Activewear', 'Polos', 'Skirts', 'Shoes'];
const defaultGenderOptions = ['Men', 'Women', 'Unisex'];
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxImageFileSizeBytes = 2 * 1024 * 1024;
const minImageDimension = 500;

const initialForm = {
  name: '',
  description: '',
  brand: 'Astra Attire',
  category: 'T-Shirts',
  gender: 'Unisex',
  material: '',
  fit: 'Regular',
  price: '',
  countInStock: ''
};

const createEmptyVariant = () => ({
  size: '',
  color: '',
  price: '',
  stock: '',
  images: []
});

const stripHtml = (html) => String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const mapProductToForm = (product) => ({
  name: product.name || '',
  description: product.description || '',
  brand: product.brand || '',
  category: product.category || '',
  gender: product.gender || '',
  material: product.material || '',
  fit: product.fit || '',
  price: product.price ?? '',
  countInStock: product.countInStock ?? ''
});

const parseProductImages = (product) => {
  if (Array.isArray(product.images) && product.images.length > 0) {
    return product.images.filter(Boolean);
  }

  if (product.image) {
    return [product.image];
  }

  return [];
};

const parseProductVariants = (product) => {
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    return product.variants.map((variant) => ({
      size: String(variant.size || ''),
      color: String(variant.color || ''),
      price: variant.price ?? '',
      stock: variant.stock ?? '',
      images: Array.isArray(variant.images) ? variant.images.filter(Boolean) : []
    }));
  }

  return [createEmptyVariant()];
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read selected image'));
    reader.readAsDataURL(file);
  });

const readImageDimensions = (dataUrl) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.width, height: image.height });
    image.onerror = () => reject(new Error('Invalid image file'));
    image.src = dataUrl;
  });

const validateAndReadImage = async (file) => {
  if (!allowedImageTypes.includes(file.type)) {
    throw new Error('Only JPG, PNG, and WEBP images are allowed');
  }

  if (file.size > maxImageFileSizeBytes) {
    throw new Error('Each image size must be 2MB or less');
  }

  const dataUrl = await readFileAsDataUrl(file);
  const dimensions = await readImageDimensions(dataUrl);

  if (dimensions.width < minImageDimension || dimensions.height < minImageDimension) {
    throw new Error(`Each image must be at least ${minImageDimension}x${minImageDimension}`);
  }

  return dataUrl;
};

const readValidatedImages = async (files) => {
  const validated = [];
  for (const file of files) {
    const dataUrl = await validateAndReadImage(file);
    validated.push(dataUrl);
  }
  return validated;
};

const AdminProductsPage = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [productImages, setProductImages] = useState([]);
  const [variantRows, setVariantRows] = useState([createEmptyVariant()]);
  const [editingProductId, setEditingProductId] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState('');

  const categoryOptions = useMemo(() => {
    return [...new Set([...defaultCategoryOptions, ...products.map((product) => String(product.category || '').trim()).filter(Boolean)])];
  }, [products]);

  const genderOptions = useMemo(() => {
    return [...new Set([...defaultGenderOptions, ...products.map((product) => String(product.gender || '').trim()).filter(Boolean)])];
  }, [products]);

  const brandOptions = useMemo(() => {
    return [...new Set(products.map((product) => String(product.brand || '').trim()).filter(Boolean))];
  }, [products]);

  const resetForm = () => {
    setForm(initialForm);
    setProductImages([]);
    setVariantRows([createEmptyVariant()]);
    setEditingProductId('');
  };

  const openCreateDialog = () => {
    setError('');
    setSuccess('');
    resetForm();
    setFormDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setFormDialogOpen(false);
    resetForm();
  };

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

  const onFieldChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const setAutocompleteField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const addVariantRow = () => {
    setVariantRows((current) => [...current, createEmptyVariant()]);
  };

  const removeVariantRow = (rowIndex) => {
    setVariantRows((current) => {
      if (current.length <= 1) return current;
      return current.filter((_, index) => index !== rowIndex);
    });
  };

  const onVariantChange = (rowIndex, field, value) => {
    setVariantRows((current) =>
      current.map((row, index) =>
        index === rowIndex ? { ...row, [field]: value } : row
      )
    );
  };

  const onAddProductImages = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;

    setError('');
    try {
      const images = await readValidatedImages(files);
      setProductImages((current) => [...current, ...images]);
    } catch (validationError) {
      setError(validationError.message || 'Invalid image');
    }
  };

  const removeProductImage = (imageIndex) => {
    setProductImages((current) => current.filter((_, index) => index !== imageIndex));
  };

  const onAddVariantImages = async (rowIndex, event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;

    setError('');
    try {
      const images = await readValidatedImages(files);
      setVariantRows((current) =>
        current.map((row, index) =>
          index === rowIndex ? { ...row, images: [...(row.images || []), ...images] } : row
        )
      );
    } catch (validationError) {
      setError(validationError.message || 'Invalid image');
    }
  };

  const removeVariantImage = (rowIndex, imageIndex) => {
    setVariantRows((current) =>
      current.map((row, index) =>
        index === rowIndex
          ? { ...row, images: (row.images || []).filter((_, currentImageIndex) => currentImageIndex !== imageIndex) }
          : row
      )
    );
  };

  const onSaveProduct = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      if (!form.name.trim()) throw new Error('Product name is required');
      if (!form.category.trim()) throw new Error('Category is required');
      if (!form.gender.trim()) throw new Error('Gender is required');
      if (!form.brand.trim()) throw new Error('Brand is required');
      if (!stripHtml(form.description)) throw new Error('Description is required');

      const normalizedVariants = variantRows
        .map((row) => ({
          size: String(row.size || '').trim(),
          color: String(row.color || '').trim(),
          price: row.price === '' ? '' : Number(row.price),
          stock: row.stock === '' ? '' : Number(row.stock),
          images: Array.isArray(row.images) ? row.images.filter(Boolean) : []
        }))
        .filter((row) => row.size || row.color || row.price !== '' || row.stock !== '' || row.images.length > 0);

      for (const variant of normalizedVariants) {
        if (!variant.size) throw new Error('Each variant must include size');
        if (variant.price === '' || Number.isNaN(variant.price) || variant.price < 0) {
          throw new Error('Each variant must include a valid price');
        }
        if (variant.stock === '' || Number.isNaN(variant.stock) || variant.stock < 0) {
          throw new Error('Each variant must include a valid stock');
        }
      }

      const payload = {
        name: form.name.trim(),
        description: form.description,
        brand: form.brand.trim(),
        category: form.category.trim(),
        gender: form.gender.trim(),
        material: String(form.material || '').trim(),
        fit: String(form.fit || '').trim(),
        images: productImages
      };

      if (normalizedVariants.length > 0) {
        payload.variants = normalizedVariants;
      } else {
        if (form.price === '' || Number.isNaN(Number(form.price)) || Number(form.price) < 0) {
          throw new Error('Base price is required when no variants are added');
        }
        if (form.countInStock === '' || Number.isNaN(Number(form.countInStock)) || Number(form.countInStock) < 0) {
          throw new Error('Base stock is required when no variants are added');
        }
      }

      if (form.price !== '') payload.price = Number(form.price);
      if (form.countInStock !== '') payload.countInStock = Number(form.countInStock);

      if (editingProductId) {
        await api.put(`/products/${editingProductId}`, payload);
        setSuccess('Product updated successfully');
      } else {
        await api.post('/products', payload);
        setSuccess('Product created successfully');
      }

      setFormDialogOpen(false);
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
    setProductImages(parseProductImages(product));
    setVariantRows(parseProductVariants(product));
    setFormDialogOpen(true);
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
        setFormDialogOpen(false);
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
        subtitle="Upload multiple product images and variant image galleries."
        actions={
          <Stack direction="row" spacing={0.7}>
            <Chip size="small" label={`Total Products: ${products.length}`} />
            <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreateDialog}>
              Create Product
            </Button>
          </Stack>
        }
      />

      {(error || success) && (
        <Stack spacing={0.8} sx={{ mb: 1.1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
        </Stack>
      )}

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

      <Dialog
        open={formDialogOpen}
        onClose={closeDialog}
        fullScreen={isSmallScreen}
        fullWidth
        maxWidth="lg"
      >
        <Box component="form" onSubmit={onSaveProduct}>
          <DialogTitle>{editingProductId ? 'Edit Product' : 'Create Product'}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={1.2}>
              <Grid container spacing={1}>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Name" name="name" value={form.name} onChange={onFieldChange} required />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    freeSolo
                    options={categoryOptions}
                    value={form.category}
                    onInputChange={(_, value) => setAutocompleteField('category', value)}
                    onChange={(_, value) => setAutocompleteField('category', String(value || ''))}
                    renderInput={(params) => <TextField {...params} label="Category" required />}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    freeSolo
                    options={genderOptions}
                    value={form.gender}
                    onInputChange={(_, value) => setAutocompleteField('gender', value)}
                    onChange={(_, value) => setAutocompleteField('gender', String(value || ''))}
                    renderInput={(params) => <TextField {...params} label="Gender" required />}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Autocomplete
                    freeSolo
                    options={brandOptions}
                    value={form.brand}
                    onInputChange={(_, value) => setAutocompleteField('brand', value)}
                    onChange={(_, value) => setAutocompleteField('brand', String(value || ''))}
                    renderInput={(params) => <TextField {...params} label="Brand" required />}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Material" name="material" value={form.material} onChange={onFieldChange} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Fit" name="fit" value={form.fit} onChange={onFieldChange} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Base Price (used if no variants)"
                    name="price"
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={onFieldChange}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Base Stock (used if no variants)"
                    name="countInStock"
                    type="number"
                    min="0"
                    value={form.countInStock}
                    onChange={onFieldChange}
                  />
                </Grid>
              </Grid>

              <Stack spacing={0.7}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Product Images
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.8} alignItems={{ sm: 'center' }}>
                  <Button component="label" variant="outlined" startIcon={<CloudUploadOutlinedIcon />}>
                    Upload Images
                    <input hidden multiple type="file" accept="image/png,image/jpeg,image/webp" onChange={onAddProductImages} />
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    Allowed: JPG/PNG/WEBP, each {'<='} 2MB, min {minImageDimension}x{minImageDimension}
                  </Typography>
                </Stack>
                {productImages.length > 0 && (
                  <Box
                    sx={{
                      display: 'grid',
                      gap: 0.8,
                      gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 72px))',
                      justifyContent: 'start'
                    }}
                  >
                    {productImages.map((image, imageIndex) => (
                      <Box key={`product-image-${imageIndex}`} sx={{ position: 'relative', minWidth: 0 }}>
                        <ProductImageViewport
                          src={image}
                          alt={`Product ${imageIndex + 1}`}
                          aspectRatio="1 / 1"
                          fit="cover"
                        />
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeProductImage(imageIndex)}
                          sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'background.paper' }}
                        >
                          <CloseOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}
              </Stack>

              <Stack spacing={0.8}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Variants
                  </Typography>
                  <Button variant="outlined" size="small" onClick={addVariantRow}>
                    Add Variant
                  </Button>
                </Stack>
                {variantRows.map((variant, index) => (
                  <Card key={`variant-${index}`} variant="outlined">
                    <CardContent sx={{ p: 1 }}>
                      <Stack spacing={0.8}>
                        <Grid container spacing={0.8} alignItems="center">
                          <Grid item xs={12} sm={3}>
                            <TextField
                              fullWidth
                              label="Size"
                              value={variant.size}
                              onChange={(event) => onVariantChange(index, 'size', event.target.value)}
                            />
                          </Grid>
                          <Grid item xs={12} sm={3}>
                            <TextField
                              fullWidth
                              label="Color"
                              value={variant.color}
                              onChange={(event) => onVariantChange(index, 'color', event.target.value)}
                            />
                          </Grid>
                          <Grid item xs={12} sm={2}>
                            <TextField
                              fullWidth
                              type="number"
                              min="0"
                              label="Price"
                              value={variant.price}
                              onChange={(event) => onVariantChange(index, 'price', event.target.value)}
                            />
                          </Grid>
                          <Grid item xs={12} sm={2}>
                            <TextField
                              fullWidth
                              type="number"
                              min="0"
                              label="Stock"
                              value={variant.stock}
                              onChange={(event) => onVariantChange(index, 'stock', event.target.value)}
                            />
                          </Grid>
                          <Grid item xs={12} sm={2}>
                            <IconButton
                              onClick={() => removeVariantRow(index)}
                              color="error"
                              disabled={variantRows.length === 1}
                            >
                              <RemoveCircleOutlineOutlinedIcon />
                            </IconButton>
                          </Grid>
                        </Grid>

                        <Stack spacing={0.7}>
                          <Button component="label" variant="outlined" size="small" startIcon={<CloudUploadOutlinedIcon />}>
                            Upload Variant Images
                            <input
                              hidden
                              multiple
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={(event) => onAddVariantImages(index, event)}
                            />
                          </Button>
                          {variant.images.length > 0 && (
                            <Box
                              sx={{
                                display: 'grid',
                                gap: 0.8,
                                gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 72px))',
                                justifyContent: 'start'
                              }}
                            >
                              {variant.images.map((image, imageIndex) => (
                                <Box key={`variant-${index}-image-${imageIndex}`} sx={{ position: 'relative', minWidth: 0 }}>
                                  <ProductImageViewport
                                    src={image}
                                    alt={`Variant ${index + 1} ${imageIndex + 1}`}
                                    aspectRatio="1 / 1"
                                    fit="cover"
                                  />
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => removeVariantImage(index, imageIndex)}
                                    sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'background.paper' }}
                                  >
                                    <CloseOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              ))}
                            </Box>
                          )}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>

              <HtmlEditorField
                label="Description"
                value={form.description}
                onChange={(value) => setForm((current) => ({ ...current, description: value }))}
                helperText="Use toolbar buttons to format product description."
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 1 }}>
            <Button onClick={closeDialog} disabled={saving} variant="outlined">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveOutlinedIcon />}
            >
              {saving ? 'Saving...' : editingProductId ? 'Update Product' : 'Create Product'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default AdminProductsPage;
