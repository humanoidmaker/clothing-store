import { Card, CardActions, CardContent, CardMedia, Chip, Stack, Typography, Button } from '@mui/material';
import AddShoppingCartOutlinedIcon from '@mui/icons-material/AddShoppingCartOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatINR } from '../utils/currency';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();

  const defaultSize = product.sizes?.[0] || '';
  const defaultColor = product.colors?.[0] || '';

  return (
    <Card sx={{ borderRadius: 4, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardMedia component="img" height="280" image={product.image} alt={product.name} />

      <CardContent sx={{ flexGrow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
          <Chip size="small" label={product.category} />
          <Chip size="small" label={product.gender} color="secondary" variant="outlined" />
        </Stack>

        <Typography variant="h6" sx={{ mb: 0.5 }}>
          {product.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ minHeight: 42 }}>
          {product.description}
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 1, flexWrap: 'wrap' }}>
          {(product.colors || []).slice(0, 3).map((color) => (
            <Chip key={color} size="small" label={color} variant="outlined" />
          ))}
        </Stack>

        <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
          {formatINR(product.price)}
        </Typography>
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2, pt: 0, gap: 1 }}>
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
          disabled={product.countInStock < 1}
          onClick={() => addToCart(product, 1, defaultSize, defaultColor)}
        >
          {product.countInStock > 0 ? 'Add' : 'Sold Out'}
        </Button>
      </CardActions>
    </Card>
  );
};

export default ProductCard;
