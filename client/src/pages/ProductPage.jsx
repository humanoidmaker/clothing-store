import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import AddShoppingCartOutlinedIcon from '@mui/icons-material/AddShoppingCartOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import PageHeader from '../components/PageHeader';
import { Link as RouterLink, useParams } from 'react-router-dom';
import api from '../api';
import { useCart } from '../context/CartContext';
import { formatINR } from '../utils/currency';

const ProductPage = () => {
  const { id } = useParams();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError('');

      try {
        const { data } = await api.get(`/products/${id}`);
        setProduct(data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const variants = useMemo(() => (Array.isArray(product?.variants) ? product.variants : []), [product]);

  const availableSizes = useMemo(() => {
    if (!product) return [];

    if (variants.length > 0) {
      return [...new Set(variants.map((variant) => variant.size))];
    }

    return Array.isArray(product.sizes) ? product.sizes : [];
  }, [product, variants]);

  const availableColors = useMemo(() => {
    if (!product) return [];

    if (variants.length > 0) {
      const sizeFiltered = selectedSize ? variants.filter((variant) => variant.size === selectedSize) : variants;
      return [...new Set(sizeFiltered.map((variant) => variant.color).filter(Boolean))];
    }

    return Array.isArray(product.colors) ? product.colors : [];
  }, [product, variants, selectedSize]);

  useEffect(() => {
    if (!product) return;

    if (variants.length > 0) {
      const firstVariant = variants[0];
      setSelectedSize((current) => current || firstVariant.size || '');
      setSelectedColor((current) => current || firstVariant.color || '');
      return;
    }

    setSelectedSize((current) => current || product.sizes?.[0] || '');
    setSelectedColor((current) => current || product.colors?.[0] || '');
  }, [product, variants]);

  useEffect(() => {
    if (variants.length === 0) return;

    const colorsForSelectedSize = variants
      .filter((variant) => variant.size === selectedSize)
      .map((variant) => variant.color)
      .filter(Boolean);

    if (!selectedColor && colorsForSelectedSize.length === 1) {
      setSelectedColor(colorsForSelectedSize[0]);
      return;
    }

    if (selectedColor && !colorsForSelectedSize.includes(selectedColor)) {
      setSelectedColor(colorsForSelectedSize[0] || '');
    }
  }, [variants, selectedSize, selectedColor]);

  const selectedVariant = useMemo(() => {
    if (variants.length === 0 || !selectedSize) {
      return null;
    }

    const sizeMatches = variants.filter((variant) => variant.size === selectedSize);
    if (sizeMatches.length === 0) {
      return null;
    }

    if (selectedColor) {
      return sizeMatches.find((variant) => (variant.color || '') === selectedColor) || null;
    }

    return sizeMatches[0];
  }, [variants, selectedSize, selectedColor]);

  const selectedPrice = Number(selectedVariant?.price ?? product?.price ?? 0);
  const availableStock = Number(selectedVariant?.stock ?? product?.countInStock ?? 0);
  const maxQty = Math.max(1, availableStock || 1);

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!product) return <Alert severity="info">Product not found.</Alert>;

  const variantRequiresColor = variants.length > 0 && availableColors.length > 0;
  const canAddToCart =
    availableStock > 0 &&
    (availableSizes.length ? Boolean(selectedSize) : true) &&
    (variantRequiresColor ? Boolean(selectedColor) : true);

  return (
    <Box>
      <PageHeader
        eyebrow="Product"
        title={product.name}
        subtitle={`${product.brand} · ${product.category} · ${product.gender}`}
      />

      <Card sx={{ p: { xs: 1.2, md: 1.6 } }}>
        <Grid container spacing={1.5}>
          <Grid item xs={12} lg={6}>
            <Box
              component="img"
              src={product.image}
              alt={product.name}
              sx={{ width: '100%', height: { xs: 280, md: 420 }, objectFit: 'cover' }}
            />
          </Grid>

          <Grid item xs={12} lg={6}>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={product.category} />
                <Chip label={product.gender} variant="outlined" color="secondary" />
                {product.fit ? <Chip label={`${product.fit} Fit`} variant="outlined" /> : null}
              </Stack>

              <Typography variant="h4">{product.name}</Typography>
              <Typography variant="body1" color="text.secondary">
                {product.description}
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Typography variant="body2" color="text.secondary">
                  Brand: <strong>{product.brand}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Material: <strong>{product.material || 'N/A'}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Stock: <strong>{availableStock}</strong>
                </Typography>
              </Stack>

              <Divider />

              {availableSizes.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.6 }}>
                    Select Size
                  </Typography>
                  <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                    {availableSizes.map((size) => (
                      <Chip
                        key={size}
                        label={size}
                        clickable
                        color={selectedSize === size ? 'primary' : 'default'}
                        onClick={() => setSelectedSize(size)}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {availableColors.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.6 }}>
                    Select Color
                  </Typography>
                  <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                    {availableColors.map((color) => (
                      <Chip
                        key={color}
                        label={color}
                        clickable
                        color={selectedColor === color ? 'secondary' : 'default'}
                        onClick={() => setSelectedColor(color)}
                      />
                    ))}
                  </Stack>
                </Box>
              )}

              {variants.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.6 }}>
                    Size Pricing
                  </Typography>
                  <Stack spacing={0.5}>
                    {variants.map((variant, index) => (
                      <Stack
                        key={`${variant.size}-${variant.color}-${index}`}
                        direction="row"
                        justifyContent="space-between"
                        sx={{
                          px: 0.8,
                          py: 0.5,
                          border: '1px solid',
                          borderColor:
                            selectedVariant &&
                            selectedVariant.size === variant.size &&
                            (selectedVariant.color || '') === (variant.color || '')
                              ? 'primary.main'
                              : 'divider'
                        }}
                      >
                        <Typography variant="caption">
                          {variant.size}
                          {variant.color ? ` / ${variant.color}` : ''}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          {formatINR(variant.price)} · {variant.stock} in stock
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                <Typography variant="h5" color="primary" sx={{ fontWeight: 700 }}>
                  {formatINR(selectedPrice)}
                </Typography>
                <TextField
                  select
                  label="Quantity"
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                  sx={{ width: 110 }}
                >
                  {Array.from({ length: maxQty }, (_, index) => (
                    <MenuItem key={index + 1} value={index + 1}>
                      {index + 1}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
                <Button
                  variant="contained"
                  startIcon={<AddShoppingCartOutlinedIcon />}
                  disabled={!canAddToCart}
                  onClick={() =>
                    addToCart(
                      product,
                      quantity,
                      selectedSize,
                      selectedColor,
                      selectedPrice,
                      availableStock
                    )
                  }
                >
                  Add to Bag
                </Button>
                <Button component={RouterLink} to="/cart" variant="outlined" startIcon={<ShoppingBagOutlinedIcon />}>
                  View Bag
                </Button>
              </Stack>
            </Stack>
          </Grid>
        </Grid>
      </Card>
    </Box>
  );
};

export default ProductPage;
