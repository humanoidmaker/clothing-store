import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import AppPagination from '../components/AppPagination';
import PageHeader from '../components/PageHeader';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import usePaginationState from '../hooks/usePaginationState';
import { formatINR } from '../utils/currency';

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const CheckoutPage = () => {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const { storeName } = useStoreSettings();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Razorpay');
  const [form, setForm] = useState({
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India'
  });
  const {
    page,
    rowsPerPage,
    totalItems,
    totalPages,
    paginatedItems,
    setPage,
    setRowsPerPage
  } = usePaginationState(items, 5);

  const canCheckout = useMemo(() => items.length > 0, [items.length]);

  const onChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!canCheckout) {
      setError('Your cart is empty');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const payload = {
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          selectedSize: item.selectedSize,
          selectedColor: item.selectedColor
        })),
        shippingAddress: form
      };

      if (paymentMethod === 'Cash on Delivery') {
        await api.post('/orders', {
          ...payload,
          paymentMethod: 'Cash on Delivery'
        });

        clearCart();
        navigate('/orders');
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK failed to load. Check internet connection.');
      }

      const { data } = await api.post('/orders/razorpay/order', payload);
      const paymentResult = await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          name: storeName,
          description: 'Fashion order payment',
          order_id: data.orderId,
          handler: (response) => resolve(response),
          prefill: {
            name: user?.name || '',
            email: user?.email || ''
          },
          theme: {
            color: '#172b4d'
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled'))
          }
        });

        rzp.open();
      });

      await api.post('/orders/razorpay/verify', {
        ...payload,
        razorpayOrderId: paymentResult.razorpay_order_id,
        razorpayPaymentId: paymentResult.razorpay_payment_id,
        razorpaySignature: paymentResult.razorpay_signature
      });

      clearCart();
      navigate('/orders');
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Could not place order');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canCheckout) {
    return (
      <Alert severity="info">
        Cart is empty. <RouterLink to="/">Shop styles</RouterLink>
      </Alert>
    );
  }

  return (
    <Box>
      <PageHeader
        eyebrow="Checkout"
        title="Shipping and Payment"
        subtitle="Securely complete your order with Razorpay or Cash on Delivery."
      />

      <Box
        sx={{
          display: 'grid',
          gap: 1.2,
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 320px' },
          alignItems: 'start'
        }}
      >
        <Card sx={{ width: '100%' }}>
          <CardContent component="form" onSubmit={onSubmit} sx={{ p: 1.2 }}>
            <Grid container spacing={1.2}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="payment-method-label">Payment Method</InputLabel>
                  <Select
                    labelId="payment-method-label"
                    value={paymentMethod}
                    label="Payment Method"
                    onChange={(event) => setPaymentMethod(event.target.value)}
                  >
                    <MenuItem value="Razorpay">Razorpay (Test)</MenuItem>
                    <MenuItem value="Cash on Delivery">Cash on Delivery</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField fullWidth name="street" label="Street" value={form.street} onChange={onChange} required />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth name="city" label="City" value={form.city} onChange={onChange} required />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth name="state" label="State" value={form.state} onChange={onChange} required />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  name="postalCode"
                  label="Postal Code"
                  value={form.postalCode}
                  onChange={onChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth name="country" label="Country" value={form.country} onChange={onChange} required />
              </Grid>
            </Grid>

            {error && (
              <Alert severity="error" sx={{ mt: 1.2 }}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              sx={{ mt: 1.2 }}
              startIcon={
                submitting
                  ? <CircularProgress size={14} color="inherit" />
                  : paymentMethod === 'Razorpay'
                    ? <CreditCardOutlinedIcon />
                    : <LocalShippingOutlinedIcon />
              }
              disabled={submitting}
            >
              {submitting ? 'Processing...' : paymentMethod === 'Razorpay' ? 'Pay with Razorpay' : 'Place Order'}
            </Button>
          </CardContent>
        </Card>

        <Card sx={{ width: '100%', position: { md: 'sticky' }, top: { md: 68 } }}>
          <CardContent sx={{ p: 1.2 }}>
            <Typography variant="h6">Order Review</Typography>
            <Divider sx={{ my: 1.1 }} />

            <Stack spacing={0.8}>
              {paginatedItems.map((item) => (
                <Box key={item.cartKey}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {item.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.quantity} x {formatINR(item.price)}
                    {item.selectedSize ? ` | Size ${item.selectedSize}` : ''}
                    {item.selectedColor ? ` | ${item.selectedColor}` : ''}
                  </Typography>
                </Box>
              ))}
            </Stack>

            <AppPagination
              totalItems={totalItems}
              page={page}
              totalPages={totalPages}
              rowsPerPage={rowsPerPage}
              onPageChange={setPage}
              onRowsPerPageChange={setRowsPerPage}
              pageSizeOptions={[3, 5, 8, 10]}
            />

            <Divider sx={{ my: 1.2 }} />
            <Typography variant="h5" color="primary">
              {formatINR(subtotal)}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default CheckoutPage;

