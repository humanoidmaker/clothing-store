import { useEffect, useMemo, useState } from 'react';
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
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import AppPagination from '../components/AppPagination';
import PageHeader from '../components/PageHeader';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import usePaginationState from '../hooks/usePaginationState';
import { formatINR } from '../utils/currency';

const PENDING_PAYMENT_STORAGE_KEY = 'checkout_pending_payment_v1';

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

const savePendingPayment = (pending) => {
  try {
    sessionStorage.setItem(PENDING_PAYMENT_STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // Ignore storage failures; verification will ask user to retry.
  }
};

const loadPendingPayment = () => {
  try {
    const raw = sessionStorage.getItem(PENDING_PAYMENT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const clearPendingPayment = () => {
  try {
    sessionStorage.removeItem(PENDING_PAYMENT_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
};

const submitPostForm = (actionUrl, fields = {}) => {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = actionUrl;
  form.style.display = 'none';

  Object.entries(fields).forEach(([key, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = String(value ?? '');
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
};

const CheckoutPage = () => {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const { storeName } = useStoreSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const [loadingMethods, setLoadingMethods] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verifyingRedirect, setVerifyingRedirect] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedGateway, setSelectedGateway] = useState('');
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
  const selectedMethod = useMemo(
    () => paymentMethods.find((entry) => entry.id === selectedGateway) || null,
    [paymentMethods, selectedGateway]
  );

  const buildCheckoutPayload = () => ({
    items: items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      selectedSize: item.selectedSize,
      selectedColor: item.selectedColor
    })),
    shippingAddress: form
  });

  const onChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  useEffect(() => {
    let cancelled = false;

    const loadGatewayOptions = async () => {
      setLoadingMethods(true);
      setError('');
      try {
        const { data } = await api.get('/orders/payment/options');
        const methods = Array.isArray(data?.methods) ? data.methods : [];
        if (!cancelled) {
          setPaymentMethods(methods);
          setSelectedGateway((current) => {
            if (current && methods.some((entry) => entry.id === current)) {
              return current;
            }
            const firstConfigured = methods.find((entry) => entry.configured !== false);
            return firstConfigured?.id || methods[0]?.id || '';
          });
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.response?.data?.message || requestError.message || 'Failed to load payment methods');
        }
      } finally {
        if (!cancelled) {
          setLoadingMethods(false);
        }
      }
    };

    void loadGatewayOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(location.search);
    const gatewayFromQuery = String(params.get('gateway') || '').trim().toLowerCase();
    if (!gatewayFromQuery) {
      return undefined;
    }

    const cancelledPayment = params.get('cancelled') === '1';
    const status = String(params.get('status') || '').trim().toLowerCase();
    if (cancelledPayment || status === 'failure') {
      setError('Payment was cancelled or failed. Please try again.');
      clearPendingPayment();
      navigate('/checkout', { replace: true });
      return undefined;
    }

    if (!['stripe', 'paypal', 'payu', 'cashfree', 'phonepe'].includes(gatewayFromQuery)) {
      navigate('/checkout', { replace: true });
      return undefined;
    }

    const pending = loadPendingPayment();
    const pendingGateway = String(pending?.gateway || '').trim().toLowerCase();
    if (!pending || !pending.payload || pendingGateway !== gatewayFromQuery) {
      setError('Unable to verify payment because pending checkout details were not found. Please retry checkout.');
      navigate('/checkout', { replace: true });
      return undefined;
    }

    const verifyBody = {
      gateway: gatewayFromQuery,
      ...pending.payload
    };

    if (gatewayFromQuery === 'stripe') {
      verifyBody.stripeSessionId = String(params.get('session_id') || '').trim();
    } else if (gatewayFromQuery === 'paypal') {
      verifyBody.paypalOrderId = String(params.get('token') || '').trim();
    } else if (gatewayFromQuery === 'payu') {
      verifyBody.payuTxnId = String(params.get('txnid') || '').trim();
      verifyBody.payuPaymentId = String(params.get('mihpayid') || '').trim();
    } else if (gatewayFromQuery === 'cashfree') {
      verifyBody.cashfreeOrderId = String(params.get('order_id') || '').trim();
    } else if (gatewayFromQuery === 'phonepe') {
      verifyBody.phonepeTransactionId = String(params.get('transaction_id') || '').trim();
    }

    const verifyRedirectPayment = async () => {
      setVerifyingRedirect(true);
      setError('');
      try {
        await api.post('/orders/payment/verify', verifyBody);
        clearPendingPayment();
        clearCart();
        navigate('/orders', { replace: true });
      } catch (requestError) {
        clearPendingPayment();
        if (!cancelled) {
          setError(requestError.response?.data?.message || requestError.message || 'Could not verify payment');
          navigate('/checkout', { replace: true });
        }
      } finally {
        if (!cancelled) {
          setVerifyingRedirect(false);
        }
      }
    };

    void verifyRedirectPayment();

    return () => {
      cancelled = true;
    };
  }, [location.search, navigate, clearCart]);

  const onSubmit = async (event) => {
    event.preventDefault();

    if (!canCheckout) {
      setError('Your cart is empty');
      return;
    }
    if (!selectedGateway) {
      setError('Please select a payment method');
      return;
    }
    if (selectedMethod && selectedMethod.configured === false) {
      setError('Selected gateway is enabled but not fully configured in admin settings.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const payload = buildCheckoutPayload();
      const { data } = await api.post('/orders/payment/initiate', {
        gateway: selectedGateway,
        ...payload
      });

      if (data?.flow === 'direct') {
        clearCart();
        navigate('/orders');
        return;
      }

      if (data?.flow === 'razorpay_popup') {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error('Razorpay SDK failed to load. Check internet connection.');
        }

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

        await api.post('/orders/payment/verify', {
          gateway: 'razorpay',
          ...payload,
          razorpayOrderId: paymentResult.razorpay_order_id,
          razorpayPaymentId: paymentResult.razorpay_payment_id,
          razorpaySignature: paymentResult.razorpay_signature
        });

        clearCart();
        navigate('/orders');
        return;
      }

      if (data?.flow === 'redirect' || data?.flow === 'form_post') {
        savePendingPayment({
          gateway: selectedGateway,
          payload,
          createdAt: Date.now()
        });

        if (data.flow === 'redirect') {
          if (!data.redirectUrl) {
            throw new Error('Payment redirection URL was not provided by gateway');
          }
          window.location.assign(data.redirectUrl);
          return;
        }

        if (!data.actionUrl || !data.fields) {
          throw new Error('Payment form details were not provided by gateway');
        }
        submitPostForm(data.actionUrl, data.fields);
        return;
      }

      throw new Error('Unsupported payment flow from server');
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
        subtitle="Securely complete your order using any enabled payment gateway."
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
                    value={selectedGateway}
                    label="Payment Method"
                    onChange={(event) => setSelectedGateway(event.target.value)}
                    disabled={loadingMethods || verifyingRedirect || paymentMethods.length === 0}
                  >
                    {paymentMethods.map((method) => (
                      <MenuItem key={method.id} value={method.id} disabled={method.configured === false}>
                        {method.configured === false ? `${method.label} (Not configured)` : method.label}
                      </MenuItem>
                    ))}
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
            {!loadingMethods && paymentMethods.length === 0 && (
              <Alert severity="warning" sx={{ mt: 1.2 }}>
                No payment gateway is available right now. Please contact support.
              </Alert>
            )}
            {verifyingRedirect && (
              <Alert severity="info" sx={{ mt: 1.2 }}>
                Verifying payment with gateway...
              </Alert>
            )}
            {selectedMethod && selectedMethod.configured === false && (
              <Alert severity="warning" sx={{ mt: 1.2 }}>
                Selected gateway is enabled but not configured yet. Add API keys in admin settings to use it.
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              sx={{ mt: 1.2 }}
              startIcon={
                submitting || verifyingRedirect
                  ? <CircularProgress size={14} color="inherit" />
                  : selectedMethod?.id !== 'cash_on_delivery'
                    ? <CreditCardOutlinedIcon />
                    : <LocalShippingOutlinedIcon />
              }
              disabled={
                submitting ||
                loadingMethods ||
                verifyingRedirect ||
                !selectedGateway ||
                paymentMethods.length === 0 ||
                selectedMethod?.configured === false
              }
            >
              {submitting || verifyingRedirect
                ? 'Processing...'
                : selectedMethod?.id === 'cash_on_delivery'
                  ? 'Place Order'
                  : selectedMethod?.label
                    ? `Pay with ${selectedMethod.label}`
                    : 'Continue'}
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
