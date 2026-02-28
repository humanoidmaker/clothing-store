import { Card, CardActions, CardContent, CardMedia, Chip, Stack, Typography, Button } from '@mui/material';
import AddShoppingCartOutlinedIcon from '@mui/icons-material/AddShoppingCartOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatINR } from '../utils/currency';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();

  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const lowestVariantPrice = hasVariants
    ? product.variants.reduce(
        (lowest, variant) => (Number(variant.price) < lowest ? Number(variant.price) : lowest),
        Number(product.variants[0].price)
      )
    : Number(product.price);

  const defaultVariant = hasVariants ? product.variants[0] : null;
  const defaultSize = defaultVariant?.size || product.sizes?.[0] || '';
  const defaultColor = defaultVariant?.color || product.colors?.[0] || '';
  const defaultPrice = defaultVariant?.price ?? product.price;
  const defaultStock = defaultVariant?.stock ?? product.countInStock;

  return (
    <Card
      sx={{
        borderRadius: 0,
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'none',
        borderTop: '3px solid',
        borderTopColor: 'primary.main',
        '&:hover': {
          borderTopColor: 'secondary.main'
        }
      }}
    >
      <CardMedia component="img" height="190" image={product.image} alt={product.name} />

      <CardContent sx={{ flexGrow: 1, p: 1.2 }}>
        <Stack direction="row" spacing={0.6} sx={{ mb: 0.8, flexWrap: 'wrap' }}>
          <Chip size="small" label={product.category} />
          <Chip size="small" label={product.gender} color="secondary" variant="outlined" />
        </Stack>

        <Typography variant="subtitle1" sx={{ mb: 0.35, lineHeight: 1.25, fontWeight: 700 }}>
          {product.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ minHeight: 32 }}>
          {product.description}
        </Typography>

        <Stack direction="row" spacing={0.6} sx={{ mt: 0.8, mb: 0.8, flexWrap: 'wrap' }}>
          {(product.colors || []).slice(0, 3).map((color) => (
            <Chip key={color} size="small" label={color} variant="outlined" />
          ))}
        </Stack>

        <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 700 }}>
          {hasVariants ? `From ${formatINR(lowestVariantPrice)}` : formatINR(product.price)}
        </Typography>
      </CardContent>

      <CardActions sx={{ px: 1.2, pb: 1.2, pt: 0, gap: 0.8, mt: 'auto' }}>
        <Button
          component={RouterLink}
          to={`/products/${product._id}`}
          variant="outlined"
          fullWidth
          startIcon={<VisibilityOutlinedIcon />}
        >
          View
        </Button>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          startIcon={<AddShoppingCartOutlinedIcon />}
          disabled={defaultStock < 1}
          onClick={() => addToCart(product, 1, defaultSize, defaultColor, defaultPrice, defaultStock)}
        >
          {defaultStock > 0 ? 'Add' : 'Sold Out'}
        </Button>
      </CardActions>
    </Card>
  );
};

export default ProductCard;

