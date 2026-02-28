import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  ButtonBase,
  Button,
  Card,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import AddShoppingCartOutlinedIcon from '@mui/icons-material/AddShoppingCartOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import FacebookOutlinedIcon from '@mui/icons-material/FacebookOutlined';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import FavoriteOutlinedIcon from '@mui/icons-material/FavoriteOutlined';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import TelegramIcon from '@mui/icons-material/Telegram';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PageHeader from '../components/PageHeader';
import ProductImageViewport from '../components/ProductImageViewport';
import { Link as RouterLink, useParams } from 'react-router-dom';
import api from '../api';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { formatINR } from '../utils/currency';

const placeholderImage = 'https://placehold.co/900x1200?text=Product';
const stripHtml = (value) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const ProductPage = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [activeImage, setActiveImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shareFeedback, setShareFeedback] = useState('');

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError('');

      try {
        const { data } = await api.get(`/products/${id}`);
        setProduct(data);
        setQuantity(1);
        setActiveImage('');
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

  const productGalleryImages = useMemo(() => {
    if (!product) return [];

    const images = [];
    if (Array.isArray(product.images)) {
      images.push(...product.images.filter(Boolean));
    }
    if (product.image) {
      images.push(product.image);
    }

    return [...new Set(images)];
  }, [product]);

  const selectedVariantImages = useMemo(() => {
    if (!selectedVariant || !Array.isArray(selectedVariant.images)) return [];
    return selectedVariant.images.filter(Boolean);
  }, [selectedVariant]);

  const galleryImages = useMemo(() => {
    if (selectedVariantImages.length > 0) {
      return selectedVariantImages;
    }

    if (productGalleryImages.length > 0) {
      return productGalleryImages;
    }

    const firstVariantWithImages = variants.find(
      (variant) => Array.isArray(variant.images) && variant.images.length > 0
    );

    if (firstVariantWithImages) {
      return firstVariantWithImages.images.filter(Boolean);
    }

    return [placeholderImage];
  }, [selectedVariantImages, productGalleryImages, variants]);

  useEffect(() => {
    if (selectedVariantImages.length > 0) {
      setActiveImage(selectedVariantImages[0]);
    }
  }, [selectedVariantImages]);

  useEffect(() => {
    if (galleryImages.length === 0) {
      setActiveImage('');
      return;
    }

    if (!activeImage || !galleryImages.includes(activeImage)) {
      setActiveImage(galleryImages[0]);
    }
  }, [galleryImages, activeImage]);

  const selectedPrice = Number(selectedVariant?.price ?? product?.price ?? 0);
  const availableStock = Number(selectedVariant?.stock ?? product?.countInStock ?? 0);
  const maxQty = Math.max(1, availableStock || 1);
  const productUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = product?.seo?.title || product?.seo?.ogTitle || product?.name || '';
  const shareDescription = (
    product?.seo?.description ||
    product?.seo?.ogDescription ||
    stripHtml(product?.description || '')
  ).slice(0, 280);
  const encodedUrl = encodeURIComponent(productUrl);
  const encodedText = encodeURIComponent(`${shareTitle}${shareDescription ? ` - ${shareDescription}` : ''}`);

  const setTemporaryFeedback = (message) => {
    setShareFeedback(message);
    window.setTimeout(() => {
      setShareFeedback('');
    }, 2500);
  };

  const onCopyLink = async () => {
    if (!productUrl) return;
    try {
      await navigator.clipboard.writeText(productUrl);
      setTemporaryFeedback('Link copied. Share in Instagram DM/story or any app.');
    } catch {
      setTemporaryFeedback('Unable to copy link.');
    }
  };

  const onNativeShare = async () => {
    if (!navigator.share || !productUrl) {
      onCopyLink();
      return;
    }

    try {
      await navigator.share({
        title: shareTitle,
        text: shareDescription,
        url: productUrl
      });
    } catch {
      // ignore cancellation
    }
  };

  const openShareWindow = (url) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

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
  const wished = isInWishlist(product._id);

  return (
    <Box>
      <PageHeader
        eyebrow="Product"
        title={product.name}
        subtitle={`${product.brand} - ${product.category} - ${product.gender}`}
      />

      <Card sx={{ p: { xs: 1.2, md: 1.6 } }}>
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', lg: '40% 60%' },
            alignItems: 'start'
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Stack spacing={0.8}>
              <ProductImageViewport
                src={activeImage || galleryImages[0] || placeholderImage}
                alt={product.name}
                aspectRatio="1 / 1"
                fit="contain"
                containerSx={{
                  width: '100%',
                  bgcolor: 'grey.50'
                }}
                imageSx={{ p: 0 }}
              />
              <Stack direction="row" spacing={0.6} sx={{ overflowX: 'auto', pb: 0.3 }}>
                {galleryImages.map((image, index) => {
                  const isSelected = image === activeImage;
                  return (
                    <ButtonBase
                      key={`${image}-${index}`}
                      onClick={() => setActiveImage(image)}
                      sx={{
                        border: '1px solid',
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        width: 72,
                        minWidth: 72,
                        flex: '0 0 auto'
                      }}
                    >
                      <ProductImageViewport
                        src={image}
                        alt={`${product.name} ${index + 1}`}
                        aspectRatio="1 / 1"
                        fit="cover"
                        containerSx={{ border: 'none', bgcolor: 'grey.100' }}
                      />
                    </ButtonBase>
                  );
                })}
              </Stack>
            </Stack>
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={product.category} />
                <Chip label={product.gender} variant="outlined" color="secondary" />
                {product.fit ? <Chip label={`${product.fit} Fit`} variant="outlined" /> : null}
              </Stack>

              <Typography variant="h4">{product.name}</Typography>
              <Typography
                component="div"
                variant="body1"
                color="text.secondary"
                sx={{
                  '& p': { mt: 0, mb: 0.8 },
                  '& ul': { mt: 0, mb: 0.8, pl: 2 }
                }}
                dangerouslySetInnerHTML={{ __html: product.description }}
              />

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
                        onClick={() => {
                          setSelectedSize(variant.size);
                          setSelectedColor(variant.color || '');
                        }}
                        sx={{
                          px: 0.8,
                          py: 0.5,
                          cursor: 'pointer',
                          border: '1px solid',
                          borderColor:
                            selectedVariant &&
                            selectedVariant.size === variant.size &&
                            (selectedVariant.color || '') === (variant.color || '')
                              ? 'primary.main'
                              : 'divider',
                          bgcolor:
                            selectedVariant &&
                            selectedVariant.size === variant.size &&
                            (selectedVariant.color || '') === (variant.color || '')
                              ? 'action.selected'
                              : 'transparent'
                        }}
                      >
                        <Typography variant="caption">
                          {variant.size}
                          {variant.color ? ` / ${variant.color}` : ''}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          {formatINR(variant.price)} - {variant.stock} in stock
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
                <Button
                  variant={wished ? 'contained' : 'outlined'}
                  color="secondary"
                  startIcon={wished ? <FavoriteOutlinedIcon /> : <FavoriteBorderOutlinedIcon />}
                  onClick={() => toggleWishlist(product, { selectedSize, selectedColor })}
                >
                  {wished ? 'Wishlisted' : 'Wishlist'}
                </Button>
                <Button component={RouterLink} to="/cart" variant="outlined" startIcon={<ShoppingBagOutlinedIcon />}>
                  View Bag
                </Button>
              </Stack>

              <Divider />

              <Stack spacing={0.8}>
                <Typography variant="subtitle2">Share This Product</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.8} flexWrap="wrap" useFlexGap>
                  <Button variant="outlined" startIcon={<ShareOutlinedIcon />} onClick={onNativeShare}>
                    Share
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<WhatsAppIcon />}
                    onClick={() => openShareWindow(`https://wa.me/?text=${encodedText}%20${encodedUrl}`)}
                  >
                    WhatsApp
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<FacebookOutlinedIcon />}
                    onClick={() => openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)}
                  >
                    Facebook
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => openShareWindow(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`)}
                  >
                    X
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<TelegramIcon />}
                    onClick={() => openShareWindow(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`)}
                  >
                    Telegram
                  </Button>
                  <Button variant="outlined" startIcon={<ContentCopyOutlinedIcon />} onClick={onCopyLink}>
                    Copy Link (Instagram)
                  </Button>
                </Stack>
                {shareFeedback ? <Alert severity="success">{shareFeedback}</Alert> : null}
              </Stack>
            </Stack>
          </Box>
        </Box>
      </Card>
    </Box>
  );
};

export default ProductPage;
