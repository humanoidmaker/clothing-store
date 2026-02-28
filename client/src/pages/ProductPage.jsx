import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import AddShoppingCartOutlinedIcon from '@mui/icons-material/AddShoppingCartOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
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
        setSelectedSize(data.sizes?.[0] || '');
        setSelectedColor(data.colors?.[0] || '');
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const maxQty = useMemo(() => Math.max(1, product?.countInStock || 1), [product]);

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!product) {
    return <Alert severity="info">Product not found.</Alert>;
  }

  const canAddToCart =
    product.countInStock > 0 &&
    (product.sizes?.length ? Boolean(selectedSize) : true) &&
    (product.colors?.length ? Boolean(selectedColor) : true);

  return (
    <Card sx={{ borderRadius: 4, p: { xs: 2, md: 3 } }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Box
            component="img"
            src={product.image}
            alt={product.name}
            sx={{ width: '100%', borderRadius: 3, height: { xs: 360, md: 560 }, objectFit: 'cover' }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1}>
              <Chip label={product.category} />
              <Chip label={product.gender} variant="outlined" color="secondary" />
            </Stack>

            <Typography variant="h3">{product.name}</Typography>
            <Typography variant="body1" color="text.secondary">
              {product.description}
            </Typography>

            <Stack direction="row" spacing={3}>
              <Typography variant="body2" color="text.secondary">
                Brand: <strong>{product.brand}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Material: <strong>{product.material || 'N/A'}</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Fit: <strong>{product.fit || 'Regular'}</strong>
              </Typography>
            </Stack>

            {product.sizes?.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Select Size
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {product.sizes.map((size) => (
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

            {product.colors?.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Select Color
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {product.colors.map((color) => (
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

            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
                {formatINR(product.price)}
              </Typography>
              <Typography color="text.secondary">Stock: {product.countInStock}</Typography>
            </Stack>

            <TextField
              select
              label="Quantity"
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              size="small"
              sx={{ width: 120 }}
            >
              {Array.from({ length: maxQty }, (_, index) => (
                <MenuItem key={index + 1} value={index + 1}>
                  {index + 1}
                </MenuItem>
              ))}
            </TextField>

            <Stack direction="row" spacing={1.5}>
              <Button
                variant="contained"
                size="large"
                startIcon={<AddShoppingCartOutlinedIcon />}
                disabled={!canAddToCart}
                onClick={() => addToCart(product, quantity, selectedSize, selectedColor)}
              >
                Add to Bag
              </Button>
              <Button component={RouterLink} to="/cart" variant="outlined" size="large" startIcon={<ShoppingBagOutlinedIcon />}>
                View Bag
              </Button>
            </Stack>
          </Stack>
        </Grid>
      </Grid>
    </Card>
  );
};

export default ProductPage;
