import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import PageHeader from '../components/PageHeader';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatINR } from '../utils/currency';

const CartPage = () => {
  const { items, subtotal, removeFromCart, updateQuantity } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const proceedToCheckout = () => {
    if (items.length === 0) return;
    navigate(isAuthenticated ? '/checkout' : '/login');
  };

  return (
    <Box>
      <PageHeader
        eyebrow="Cart"
        title="Your Shopping Bag"
        subtitle="Review selected products, variants and quantities before checkout."
      />

      {items.length === 0 && (
        <Alert severity="info">
          Bag is empty. <RouterLink to="/">Continue shopping</RouterLink>
        </Alert>
      )}

      {items.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gap: 1.2,
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 300px' },
            alignItems: 'start'
          }}
        >
          <Stack spacing={1} sx={{ width: '100%', minWidth: 0 }}>
            {items.map((item) => (
              <Card key={item.cartKey}>
                <CardContent sx={{ p: 1.1 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ sm: 'center' }}>
                    <Box
                      component="img"
                      src={item.image}
                      alt={item.name}
                      sx={{ width: 70, height: 84, objectFit: 'cover' }}
                    />

                    <Box sx={{ flex: 1 }}>
                      <Typography component={RouterLink} to={`/products/${item.productId}`} sx={{ textDecoration: 'none' }} variant="h6">
                        {item.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                        {formatINR(item.price)} each
                      </Typography>

                      <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap sx={{ mt: 0.6 }}>
                        {item.selectedSize && <Chip size="small" label={`Size: ${item.selectedSize}`} />}
                        {item.selectedColor && <Chip size="small" label={`Color: ${item.selectedColor}`} variant="outlined" />}
                      </Stack>
                    </Box>

                    <TextField
                      select
                      size="small"
                      label="Qty"
                      value={item.quantity}
                      onChange={(event) => updateQuantity(item.cartKey, Number(event.target.value))}
                      sx={{ minWidth: 82 }}
                    >
                      {Array.from({ length: Math.max(1, item.countInStock || 1) }, (_, index) => (
                        <MenuItem key={index + 1} value={index + 1}>
                          {index + 1}
                        </MenuItem>
                      ))}
                    </TextField>

                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteOutlineOutlinedIcon />}
                      onClick={() => removeFromCart(item.cartKey)}
                    >
                      Remove
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>

          <Card sx={{ width: '100%', position: { md: 'sticky' }, top: { md: 68 } }}>
            <CardContent sx={{ p: 1.2 }}>
              <Typography variant="h6">Order Summary</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {items.length} unique items
              </Typography>
              <Divider sx={{ my: 1.2 }} />
              <Typography variant="h5" color="primary" sx={{ mb: 1.2 }}>
                {formatINR(subtotal)}
              </Typography>
              <Button variant="contained" fullWidth startIcon={<ShoppingBagOutlinedIcon />} onClick={proceedToCheckout}>
                Proceed to Checkout
              </Button>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default CartPage;

