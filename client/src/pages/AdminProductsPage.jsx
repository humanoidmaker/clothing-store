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
import AppPagination from '../components/AppPagination';
import PageHeader from '../components/PageHeader';
import HtmlEditorField from '../components/HtmlEditorField';
import ProductImageViewport from '../components/ProductImageViewport';
import api from '../api';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { formatINR } from '../utils/currency';

const defaultCategoryOptions = ['T-Shirts', 'Shirts', 'Jeans', 'Trousers', 'Dresses', 'Jackets', 'Tops', 'Activewear', 'Polos', 'Skirts', 'Shoes'];
const defaultGenderOptions = ['Men', 'Women', 'Unisex'];
const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const maxImageFileSizeBytes = 10 * 1024 * 1024;
const minImageDimension = 200;
const imageOptimizationProfiles = {
  // Covers product details main viewport + card usage.
  product: {
    maxDimension: 1400,
    targetMaxBytes: 450 * 1024,
    initialQuality: 0.84,
    minimumQuality: 0.68,
    minimumDimensionAfterCompression: 1000
  },
  // Covers gallery thumbnails + variant image usage.
  variant: {
    maxDimension: 1200,
    targetMaxBytes: 320 * 1024,
    initialQuality: 0.82,
    minimumQuality: 0.64,
    minimumDimensionAfterCompression: 800
  }
};
const createVariantId = () =>
  (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const createInitialForm = (storeName = 'Astra Attire') => ({
  name: '',
  description: '',
  brand: String(storeName || '').trim() || 'Astra Attire',
  category: 'T-Shirts',
  gender: 'Unisex',
  material: '',
  fit: 'Regular',
  price: '',
  purchasePrice: '',
  countInStock: ''
});

const createEmptyVariant = () => ({
  id: createVariantId(),
  size: '',
  color: '',
  price: '',
  purchasePrice: '',
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
  purchasePrice: product.purchasePrice ?? '',
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
      id: createVariantId(),
      size: String(variant.size || ''),
      color: String(variant.color || ''),
      price: variant.price ?? '',
      purchasePrice: variant.purchasePrice ?? '',
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

const loadImageElement = (dataUrl) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Invalid image file'));
    image.src = dataUrl;
  });

const getDataUrlSizeBytes = (dataUrl) => {
  const base64Body = String(dataUrl || '').split(',')[1] || '';
  return Math.ceil((base64Body.length * 3) / 4);
};

const canvasToOptimizedDataUrl = (canvas, quality) => {
  const webpResult = canvas.toDataURL('image/webp', quality);
  if (webpResult.startsWith('data:image/webp')) {
    return webpResult;
  }

  return canvas.toDataURL('image/jpeg', quality);
};

const optimizeImageDataUrl = async (dataUrl, profileKey = 'product') => {
  const profile = imageOptimizationProfiles[profileKey] || imageOptimizationProfiles.product;
  const sourceImage = await loadImageElement(dataUrl);
  const largestSide = Math.max(sourceImage.width, sourceImage.height);
  const resizeRatio = Math.min(1, profile.maxDimension / largestSide);
  const resizedWidth = Math.max(1, Math.round(sourceImage.width * resizeRatio));
  const resizedHeight = Math.max(1, Math.round(sourceImage.height * resizeRatio));

  const canvas = document.createElement('canvas');
  canvas.width = resizedWidth;
  canvas.height = resizedHeight;

  const context = canvas.getContext('2d');
  if (!context) {
    return dataUrl;
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(sourceImage, 0, 0, resizedWidth, resizedHeight);

  const attemptedQualities = [
    profile.initialQuality,
    Math.max(profile.minimumQuality, profile.initialQuality - 0.1),
    profile.minimumQuality
  ];

  let bestResult = canvasToOptimizedDataUrl(canvas, attemptedQualities[0]);

  for (const quality of attemptedQualities) {
    const candidate = canvasToOptimizedDataUrl(canvas, quality);
    if (getDataUrlSizeBytes(candidate) < getDataUrlSizeBytes(bestResult)) {
      bestResult = candidate;
    }
    if (getDataUrlSizeBytes(candidate) <= profile.targetMaxBytes) {
      return candidate;
    }
  }

  const resizedLargestSide = Math.max(resizedWidth, resizedHeight);
  if (resizedLargestSide > profile.minimumDimensionAfterCompression) {
    const downscaleRatio = profile.minimumDimensionAfterCompression / resizedLargestSide;
    const compactWidth = Math.max(1, Math.round(resizedWidth * downscaleRatio));
    const compactHeight = Math.max(1, Math.round(resizedHeight * downscaleRatio));

    const compactCanvas = document.createElement('canvas');
    compactCanvas.width = compactWidth;
    compactCanvas.height = compactHeight;
    const compactContext = compactCanvas.getContext('2d');

    if (compactContext) {
      compactContext.imageSmoothingEnabled = true;
      compactContext.imageSmoothingQuality = 'high';
      compactContext.drawImage(sourceImage, 0, 0, compactWidth, compactHeight);

      const compactResult = canvasToOptimizedDataUrl(compactCanvas, profile.minimumQuality);
      if (getDataUrlSizeBytes(compactResult) < getDataUrlSizeBytes(bestResult)) {
        bestResult = compactResult;
      }
    }
  }

  return bestResult;
};

const validateAndReadImage = async (file, profileKey = 'product') => {
  if (!allowedImageTypes.includes(file.type)) {
    throw new Error('Only JPG, PNG, and WEBP images are allowed');
  }

  if (file.size > maxImageFileSizeBytes) {
    throw new Error('Each image size must be 10MB or less');
  }

  const dataUrl = await readFileAsDataUrl(file);
  const dimensions = await readImageDimensions(dataUrl);

  if (dimensions.width < minImageDimension || dimensions.height < minImageDimension) {
    throw new Error(`Each image must be at least ${minImageDimension}x${minImageDimension}`);
  }

  return optimizeImageDataUrl(dataUrl, profileKey);
};

const readValidatedImages = async (files, profileKey = 'product') => {
  const validated = [];
  for (const file of files) {
    const dataUrl = await validateAndReadImage(file, profileKey);
    validated.push(dataUrl);
  }
  return validated;
};

const AdminProductsPage = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const isMobileTable = useMediaQuery(theme.breakpoints.down('sm'));
  const { storeName } = useStoreSettings();

  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(() => createInitialForm(storeName));
  const [productImages, setProductImages] = useState([]);
  const [variantRows, setVariantRows] = useState([createEmptyVariant()]);
  const [editingProductId, setEditingProductId] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [catalogOptions, setCatalogOptions] = useState({
    categories: defaultCategoryOptions,
    genders: defaultGenderOptions,
    brands: []
  });

  const categoryOptions = useMemo(() => {
    return [
      ...new Set([
        ...defaultCategoryOptions,
        ...(Array.isArray(catalogOptions.categories) ? catalogOptions.categories : []),
        ...products.map((product) => String(product.category || '').trim()).filter(Boolean)
      ])
    ];
  }, [catalogOptions.categories, products]);

  const genderOptions = useMemo(() => {
    return [
      ...new Set([
        ...defaultGenderOptions,
        ...(Array.isArray(catalogOptions.genders) ? catalogOptions.genders : []),
        ...products.map((product) => String(product.gender || '').trim()).filter(Boolean)
      ])
    ];
  }, [catalogOptions.genders, products]);

  const brandOptions = useMemo(() => {
    return [
      ...new Set([
        ...(Array.isArray(catalogOptions.brands) ? catalogOptions.brands : []),
        ...products.map((product) => String(product.brand || '').trim()).filter(Boolean)
      ])
    ];
  }, [catalogOptions.brands, products]);

  const resetForm = () => {
    setForm(createInitialForm(storeName));
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

  const fetchCatalogOptions = async () => {
    try {
      const { data } = await api.get('/products/filters');
      setCatalogOptions({
        categories: Array.isArray(data?.categories) && data.categories.length > 0 ? data.categories : defaultCategoryOptions,
        genders: Array.isArray(data?.genders) && data.genders.length > 0 ? data.genders : defaultGenderOptions,
        brands: Array.isArray(data?.brands) ? data.brands : []
      });
    } catch {
      setCatalogOptions({
        categories: defaultCategoryOptions,
        genders: defaultGenderOptions,
        brands: []
      });
    }
  };

  const fetchProducts = async (targetPage = page, targetRowsPerPage = rowsPerPage) => {
    setLoadingProducts(true);
    setError('');

    try {
      const { data } = await api.get('/products', {
        params: {
          sort: 'newest',
          page: targetPage,
          limit: targetRowsPerPage
        }
      });

      const nextProducts = Array.isArray(data?.products) ? data.products : [];
      const nextTotalItems = Number(data?.totalItems);
      const nextTotalPages = Number(data?.totalPages);
      const nextPage = Number(data?.page);

      setProducts(nextProducts);
      setTotalItems(Number.isFinite(nextTotalItems) && nextTotalItems >= 0 ? nextTotalItems : nextProducts.length);
      setTotalPages(Number.isFinite(nextTotalPages) && nextTotalPages > 0 ? nextTotalPages : 1);
      if (Number.isFinite(nextPage) && nextPage > 0 && nextPage !== targetPage) {
        setPage(nextPage);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load products');
      setProducts([]);
      setTotalItems(0);
      setTotalPages(1);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchCatalogOptions();
  }, []);

  useEffect(() => {
    fetchProducts(page, rowsPerPage);
  }, [page, rowsPerPage]);

  const onRowsPerPageChange = (nextRowsPerPage) => {
    setRowsPerPage(nextRowsPerPage);
    setPage(1);
  };

  const onFieldChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const setAutocompleteField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const addVariantRow = () => {
    setVariantRows((current) => [...current, createEmptyVariant()]);
  };

  const removeVariantRow = (rowId) => {
    setVariantRows((current) => {
      if (current.length <= 1) return current;
      return current.filter((row) => row.id !== rowId);
    });
  };

  const onVariantChange = (rowId, field, value) => {
    setVariantRows((current) =>
      current.map((row) =>
        row.id === rowId ? { ...row, [field]: value } : row
      )
    );
  };

  const onAddProductImages = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;

    setError('');
    try {
      const images = await readValidatedImages(files, 'product');
      setProductImages((current) => [...current, ...images]);
    } catch (validationError) {
      setError(validationError.message || 'Invalid image');
    }
  };

  const removeProductImage = (imageIndex) => {
    setProductImages((current) => current.filter((_, index) => index !== imageIndex));
  };

  const onAddVariantImages = async (rowId, event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length === 0) return;

    setError('');
    try {
      const images = await readValidatedImages(files, 'variant');
      setVariantRows((current) =>
        current.map((row) =>
          row.id === rowId
            ? { ...row, images: [...new Set([...(row.images || []), ...images])] }
            : row
        )
      );
    } catch (validationError) {
      setError(validationError.message || 'Invalid image');
    }
  };

  const removeVariantImage = (rowId, imageIndex) => {
    setVariantRows((current) =>
      current.map((row) =>
        row.id === rowId
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
          purchasePrice: row.purchasePrice === '' ? '' : Number(row.purchasePrice),
          stock: row.stock === '' ? '' : Number(row.stock),
          images: Array.isArray(row.images) ? row.images.filter(Boolean) : []
        }))
        .filter(
          (row) =>
            row.size ||
            row.color ||
            row.price !== '' ||
            row.purchasePrice !== '' ||
            row.stock !== '' ||
            row.images.length > 0
        );

      for (const variant of normalizedVariants) {
        if (!variant.size) throw new Error('Each variant must include size');
        if (variant.price === '' || Number.isNaN(variant.price) || variant.price < 0) {
          throw new Error('Each variant must include a valid price');
        }
        if (variant.purchasePrice === '' || Number.isNaN(variant.purchasePrice) || variant.purchasePrice < 0) {
          throw new Error('Each variant must include a valid purchase price');
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
        if (
          form.purchasePrice === '' ||
          Number.isNaN(Number(form.purchasePrice)) ||
          Number(form.purchasePrice) < 0
        ) {
          throw new Error('Base purchase price is required when no variants are added');
        }
        if (form.countInStock === '' || Number.isNaN(Number(form.countInStock)) || Number(form.countInStock) < 0) {
          throw new Error('Base stock is required when no variants are added');
        }
      }

      if (form.price !== '') payload.price = Number(form.price);
      if (form.purchasePrice !== '') payload.purchasePrice = Number(form.purchasePrice);
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
      await fetchCatalogOptions();
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
      if (editingProductId === id) {
        setFormDialogOpen(false);
        resetForm();
      }
      await fetchCatalogOptions();
      await fetchProducts();
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
            <Chip size="small" label={`Total Products: ${totalItems}`} />
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
            <>
              {isMobileTable ? (
                <Stack spacing={0.8}>
                  {products.map((product) => (
                    <Card key={product._id} variant="outlined">
                      <CardContent sx={{ p: 1 }}>
                        <Stack spacing={0.7}>
                          <Stack direction="row" justifyContent="space-between" spacing={0.8} alignItems="flex-start">
                            <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                              {product.name}
                            </Typography>
                            <Chip size="small" label={product.gender || '-'} variant="outlined" color="secondary" />
                          </Stack>

                          <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
                            <Chip size="small" label={product.category || '-'} />
                          </Stack>

                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption" color="text.secondary">Price</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatINR(product.price)}</Typography>
                          </Stack>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption" color="text.secondary">Purchase</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatINR(product.purchasePrice)}</Typography>
                          </Stack>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption" color="text.secondary">Stock</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{product.countInStock}</Typography>
                          </Stack>

                          <Stack direction="row" spacing={0.6}>
                            <Button
                              variant="outlined"
                              size="small"
                              fullWidth
                              startIcon={<EditOutlinedIcon />}
                              onClick={() => onEdit(product)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              fullWidth
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
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Gender</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Purchase Price</TableCell>
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
                        <TableCell align="right">{formatINR(product.purchasePrice)}</TableCell>
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
            </>
          )}

          {!loadingProducts && products.length > 0 && (
            <AppPagination
              totalItems={totalItems}
              page={page}
              totalPages={totalPages}
              rowsPerPage={rowsPerPage}
              onPageChange={setPage}
              onRowsPerPageChange={onRowsPerPageChange}
              pageSizeOptions={[5, 10, 20, 30]}
            />
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
              <Box
                sx={{
                  display: 'grid',
                  gap: 1,
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(12, minmax(0, 1fr))' }
                }}
              >
                <Box sx={{ minWidth: 0, gridColumn: { xs: 'span 1', sm: 'span 2', lg: 'span 4' } }}>
                  <TextField fullWidth label="Name" name="name" value={form.name} onChange={onFieldChange} required />
                </Box>
                <Box sx={{ minWidth: 0, gridColumn: { xs: 'span 1', sm: 'span 1', lg: 'span 2' } }}>
                  <Autocomplete
                    freeSolo
                    options={categoryOptions}
                    value={form.category}
                    onInputChange={(_, value) => setAutocompleteField('category', value)}
                    onChange={(_, value) => setAutocompleteField('category', String(value || ''))}
                    renderInput={(params) => <TextField {...params} label="Category" required />}
                  />
                </Box>
                <Box sx={{ minWidth: 0, gridColumn: { xs: 'span 1', sm: 'span 1', lg: 'span 2' } }}>
                  <Autocomplete
                    freeSolo
                    options={genderOptions}
                    value={form.gender}
                    onInputChange={(_, value) => setAutocompleteField('gender', value)}
                    onChange={(_, value) => setAutocompleteField('gender', String(value || ''))}
                    renderInput={(params) => <TextField {...params} label="Gender" required />}
                  />
                </Box>
                <Box sx={{ minWidth: 0, gridColumn: { xs: 'span 1', sm: 'span 1', lg: 'span 2' } }}>
                  <Autocomplete
                    freeSolo
                    options={brandOptions}
                    value={form.brand}
                    onInputChange={(_, value) => setAutocompleteField('brand', value)}
                    onChange={(_, value) => setAutocompleteField('brand', String(value || ''))}
                    renderInput={(params) => <TextField {...params} label="Brand" required />}
                  />
                </Box>
                <Box sx={{ minWidth: 0, gridColumn: { xs: 'span 1', sm: 'span 1', lg: 'span 2' } }}>
                  <TextField fullWidth label="Material" name="material" value={form.material} onChange={onFieldChange} />
                </Box>
                <Box sx={{ minWidth: 0, gridColumn: { xs: 'span 1', sm: 'span 1', lg: 'span 4' } }}>
                  <TextField fullWidth label="Fit" name="fit" value={form.fit} onChange={onFieldChange} />
                </Box>
                <Box sx={{ minWidth: 0, gridColumn: { xs: 'span 1', sm: 'span 1', lg: 'span 4' } }}>
                  <TextField
                    fullWidth
                    label="Base Price (used if no variants)"
                    name="price"
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={onFieldChange}
                  />
                </Box>
                <Box sx={{ minWidth: 0, gridColumn: { xs: 'span 1', sm: 'span 1', lg: 'span 4' } }}>
                  <TextField
                    fullWidth
                    label="Base Purchase Price (used if no variants)"
                    name="purchasePrice"
                    type="number"
                    min="0"
                    value={form.purchasePrice}
                    onChange={onFieldChange}
                  />
                </Box>
                <Box sx={{ minWidth: 0, gridColumn: { xs: 'span 1', sm: 'span 1', lg: 'span 4' } }}>
                  <TextField
                    fullWidth
                    label="Base Stock (used if no variants)"
                    name="countInStock"
                    type="number"
                    min="0"
                    value={form.countInStock}
                    onChange={onFieldChange}
                  />
                </Box>
              </Box>

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
                    Allowed: JPG/PNG/WEBP, each {'<='} 10MB, min {minImageDimension}x{minImageDimension}. Auto-optimized for product card and details viewports.
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
                  <Card key={variant.id} variant="outlined">
                    <CardContent sx={{ p: 1 }}>
                      <Stack spacing={0.8}>
                        <Box
                          sx={{
                            display: 'grid',
                            gap: 0.8,
                            alignItems: 'center',
                            gridTemplateColumns: { xs: '1fr', sm: 'repeat(12, minmax(0, 1fr))' }
                          }}
                        >
                          <Box sx={{ minWidth: 0, gridColumn: { xs: 'span 1', sm: 'span 3' } }}>
                            <TextField
                              fullWidth
                              label="Size"
                              value={variant.size}
                              onChange={(event) => onVariantChange(variant.id, 'size', event.target.value)}
                            />
                          </Box>
                          <Box sx={{ minWidth: 0, gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
                            <TextField
                              fullWidth
                              label="Color"
                              value={variant.color}
                              onChange={(event) => onVariantChange(variant.id, 'color', event.target.value)}
                            />
                          </Box>
                          <Box sx={{ minWidth: 0, gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
                            <TextField
                              fullWidth
                              type="number"
                              min="0"
                              label="Price"
                              value={variant.price}
                              onChange={(event) => onVariantChange(variant.id, 'price', event.target.value)}
                            />
                          </Box>
                          <Box sx={{ minWidth: 0, gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
                            <TextField
                              fullWidth
                              type="number"
                              min="0"
                              label="Purchase Price"
                              value={variant.purchasePrice}
                              onChange={(event) => onVariantChange(variant.id, 'purchasePrice', event.target.value)}
                            />
                          </Box>
                          <Box sx={{ minWidth: 0, gridColumn: { xs: 'span 1', sm: 'span 2' } }}>
                            <TextField
                              fullWidth
                              type="number"
                              min="0"
                              label="Stock"
                              value={variant.stock}
                              onChange={(event) => onVariantChange(variant.id, 'stock', event.target.value)}
                            />
                          </Box>
                          <Box sx={{ minWidth: 0, gridColumn: { xs: 'span 1', sm: 'span 1' } }}>
                            <IconButton
                              onClick={() => removeVariantRow(variant.id)}
                              color="error"
                              disabled={variantRows.length === 1}
                            >
                              <RemoveCircleOutlineOutlinedIcon />
                            </IconButton>
                          </Box>
                        </Box>

                        <Stack spacing={0.7}>
                          <Button component="label" variant="outlined" size="small" startIcon={<CloudUploadOutlinedIcon />}>
                            Upload Variant Images
                            <input
                              hidden
                              multiple
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={(event) => onAddVariantImages(variant.id, event)}
                            />
                          </Button>
                          <Typography variant="caption" color="text.secondary">
                            Auto-optimized for gallery and variant viewport sizes before saving.
                          </Typography>
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
                                <Box key={`variant-${variant.id}-image-${imageIndex}`} sx={{ position: 'relative', minWidth: 0 }}>
                                  <ProductImageViewport
                                    src={image}
                                    alt={`Variant ${variant.size || index + 1} ${imageIndex + 1}`}
                                    aspectRatio="1 / 1"
                                    fit="cover"
                                  />
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => removeVariantImage(variant.id, imageIndex)}
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
