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
import AppPagination from '../components/AppPagination';
import PageHeader from '../components/PageHeader';
import ProductImageViewport from '../components/ProductImageViewport';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import usePaginationState from '../hooks/usePaginationState';
import { formatINR } from '../utils/currency';

const CartPage = () => {
  const { items, subtotal, removeFromCart, updateQuantity } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const {
    page,
    rowsPerPage,
    totalItems,
    totalPages,
    paginatedItems,
    setPage,
    setRowsPerPage
  } = usePaginationState(items, 5);

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
            {paginatedItems.map((item) => (
              <Card key={item.cartKey}>
                <CardContent sx={{ p: 1.1 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ sm: 'center' }}>
                    <ProductImageViewport
                      src={item.image}
                      alt={item.name}
                      aspectRatio="1 / 1"
                      fit="cover"
                      containerSx={{ width: 70, minWidth: 70 }}
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

            <AppPagination
              totalItems={totalItems}
              page={page}
              totalPages={totalPages}
              rowsPerPage={rowsPerPage}
              onPageChange={setPage}
              onRowsPerPageChange={setRowsPerPage}
              pageSizeOptions={[3, 5, 8, 10]}
            />
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

