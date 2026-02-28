import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
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
      <Typography variant="h4" sx={{ mb: 2 }}>
        Your Shopping Bag
      </Typography>

      {items.length === 0 && (
        <Alert severity="info" sx={{ borderRadius: 3 }}>
          Bag is empty. <RouterLink to="/">Continue shopping</RouterLink>
        </Alert>
      )}

      {items.length > 0 && (
        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2.2} alignItems="flex-start">
          <Stack spacing={1.4} sx={{ width: '100%', flex: 1 }}>
            {items.map((item) => (
              <Card key={item.cartKey} sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                    <Box
                      component="img"
                      src={item.image}
                      alt={item.name}
                      sx={{ width: 96, height: 116, borderRadius: 2, objectFit: 'cover' }}
                    />

                    <Box sx={{ flex: 1 }}>
                      <Typography component={RouterLink} to={`/products/${item.productId}`} sx={{ textDecoration: 'none' }} variant="h6">
                        {item.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
                        {formatINR(item.price)} each
                      </Typography>

                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        {item.selectedSize && (
                          <Typography variant="caption" sx={{ bgcolor: 'grey.100', px: 1, py: 0.5, borderRadius: 2 }}>
                            Size: {item.selectedSize}
                          </Typography>
                        )}
                        {item.selectedColor && (
                          <Typography variant="caption" sx={{ bgcolor: 'grey.100', px: 1, py: 0.5, borderRadius: 2 }}>
                            Color: {item.selectedColor}
                          </Typography>
                        )}
                      </Stack>
                    </Box>

                    <TextField
                      select
                      size="small"
                      label="Qty"
                      value={item.quantity}
                      onChange={(event) => updateQuantity(item.cartKey, Number(event.target.value))}
                      sx={{ minWidth: 92 }}
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

          <Card sx={{ width: { xs: '100%', lg: 360 }, borderRadius: 3, position: { lg: 'sticky' }, top: { lg: 96 } }}>
            <CardContent>
              <Typography variant="h6">Order Summary</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {items.length} unique items
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h4" color="primary" sx={{ mb: 2 }}>
                {formatINR(subtotal)}
              </Typography>
              <Button variant="contained" fullWidth startIcon={<ShoppingBagOutlinedIcon />} onClick={proceedToCheckout}>
                Checkout
              </Button>
            </CardContent>
          </Card>
        </Stack>
      )}
    </Box>
  );
};

export default CartPage;
