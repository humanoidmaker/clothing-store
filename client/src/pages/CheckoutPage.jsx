import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
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
const DEFAULT_COD_CHARGE_PER_PRODUCT = 25;

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

const normalizeText = (value) => String(value || '').trim();
const normalizeAddressForForm = (value = {}, fallback = {}) => ({
  fullName: normalizeText(value.fullName ?? fallback.fullName ?? ''),
  phone: normalizeText(value.phone ?? fallback.phone ?? ''),
  email: normalizeText(value.email ?? fallback.email ?? ''),
  street: normalizeText(value.street ?? fallback.street ?? ''),
  addressLine2: normalizeText(value.addressLine2 ?? fallback.addressLine2 ?? ''),
  city: normalizeText(value.city ?? fallback.city ?? ''),
  state: normalizeText(value.state ?? fallback.state ?? ''),
  postalCode: normalizeText(value.postalCode ?? fallback.postalCode ?? ''),
  country: normalizeText(value.country ?? fallback.country ?? 'India') || 'India'
});

const createCheckoutFormFromUser = (user) => {
  const shippingDefaults = normalizeAddressForForm(user?.defaultShippingAddress || {}, {
    fullName: normalizeText(user?.name || ''),
    email: normalizeText(user?.email || ''),
    country: 'India'
  });
  const billingSameAsShipping = user?.defaultBillingDetails?.sameAsShipping !== false;
  const billingDefaults = billingSameAsShipping
    ? normalizeAddressForForm(shippingDefaults, shippingDefaults)
    : normalizeAddressForForm(user?.defaultBillingDetails || {}, {
        email: shippingDefaults.email,
        country: shippingDefaults.country || 'India'
      });

  return {
    shipping: shippingDefaults,
    billing: {
      sameAsShipping: billingSameAsShipping,
      ...billingDefaults
    },
    tax: {
      businessPurchase: Boolean(user?.defaultTaxDetails?.businessPurchase),
      businessName: normalizeText(user?.defaultTaxDetails?.businessName || ''),
      gstin: normalizeText(user?.defaultTaxDetails?.gstin || ''),
      pan: normalizeText(user?.defaultTaxDetails?.pan || ''),
      purchaseOrderNumber: normalizeText(user?.defaultTaxDetails?.purchaseOrderNumber || ''),
      notes: normalizeText(user?.defaultTaxDetails?.notes || '')
    },
    codChargesAccepted: false
  };
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
  const [codChargePerProduct, setCodChargePerProduct] = useState(DEFAULT_COD_CHARGE_PER_PRODUCT);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [form, setForm] = useState(() => createCheckoutFormFromUser(user));

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
  const codProductCount = useMemo(
    () => items.reduce((sum, item) => sum + Math.max(0, Number(item?.quantity || 0)), 0),
    [items]
  );
  const codChargeEstimate = useMemo(
    () =>
      selectedMethod?.id === 'cash_on_delivery'
        ? Math.max(0, Number(codChargePerProduct || 0)) * codProductCount
        : 0,
    [selectedMethod, codChargePerProduct, codProductCount]
  );
  const couponDiscount = useMemo(
    () => Math.max(0, Number(appliedCoupon?.discountAmount || 0)),
    [appliedCoupon]
  );
  const discountedSubtotal = useMemo(
    () => Math.max(0, Number(subtotal || 0) - couponDiscount),
    [subtotal, couponDiscount]
  );
  const totalPayable = useMemo(
    () => Number(discountedSubtotal || 0) + Number(codChargeEstimate || 0),
    [discountedSubtotal, codChargeEstimate]
  );

  const mapCheckoutItems = () =>
    items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      selectedSize: item.selectedSize,
      selectedColor: item.selectedColor
    }));

  const buildCheckoutPayload = () => {
    const shippingAddress = {
      ...form.shipping
    };
    const billingDetails = form.billing.sameAsShipping
      ? {
          sameAsShipping: true,
          ...form.shipping
        }
      : {
          sameAsShipping: false,
          ...form.billing
        };

    return {
      items: mapCheckoutItems(),
      shippingAddress,
      billingDetails,
      taxDetails: {
        ...form.tax
      },
      codChargesAccepted: Boolean(form.codChargesAccepted),
      couponCode: String(appliedCoupon?.code || '').trim()
    };
  };

  const updateShipping = (field, value) => {
    setForm((current) => ({
      ...current,
      shipping: {
        ...current.shipping,
        [field]: value
      }
    }));
  };

  const updateBilling = (field, value) => {
    setForm((current) => ({
      ...current,
      billing: {
        ...current.billing,
        [field]: value
      }
    }));
  };

  const updateTax = (field, value) => {
    setForm((current) => ({
      ...current,
      tax: {
        ...current.tax,
        [field]: value
      }
    }));
  };

  useEffect(() => {
    const defaultForm = createCheckoutFormFromUser(user);
    setForm((current) => {
      const hasTypedData =
        Boolean(normalizeText(current?.shipping?.street)) ||
        Boolean(normalizeText(current?.shipping?.city)) ||
        Boolean(normalizeText(current?.shipping?.postalCode)) ||
        Boolean(normalizeText(current?.billing?.street)) ||
        Boolean(normalizeText(current?.tax?.gstin));

      return hasTypedData ? current : defaultForm;
    });
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    const loadGatewayOptions = async () => {
      setLoadingMethods(true);
      setError('');
      try {
        const { data } = await api.get('/orders/payment/options');
        const methods = Array.isArray(data?.methods) ? data.methods : [];
        const codPerProduct = Number(data?.codCharges?.perProduct);
        if (!cancelled) {
          setPaymentMethods(methods);
          if (Number.isFinite(codPerProduct) && codPerProduct >= 0) {
            setCodChargePerProduct(codPerProduct);
          }
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

  const onApplyCoupon = async () => {
    const normalizedCode = normalizeText(couponCodeInput).toUpperCase();
    if (!normalizedCode) {
      setError('Please enter a coupon code');
      return;
    }
    if (!canCheckout) {
      setError('Your cart is empty');
      return;
    }

    setError('');
    setValidatingCoupon(true);

    try {
      const { data } = await api.post(
        '/orders/coupon/validate',
        {
          items: mapCheckoutItems(),
          couponCode: normalizedCode
        },
        {
          showSuccessToast: false
        }
      );
      const coupon = data?.coupon;
      if (!coupon?.code) {
        throw new Error('Invalid coupon response from server');
      }
      setAppliedCoupon(coupon);
      setCouponCodeInput(String(coupon.code || normalizedCode));
    } catch (requestError) {
      setAppliedCoupon(null);
      setError(requestError.response?.data?.message || requestError.message || 'Could not apply coupon');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const onRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCodeInput('');
  };

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

    if (selectedMethod?.id === 'cash_on_delivery' && codChargeEstimate > 0) {
      if (!form.codChargesAccepted) {
        setError('Please accept Cash on Delivery convenience charges before placing order.');
        return;
      }
      const confirmed = window.confirm(
        `Cash on Delivery convenience charge of ${formatINR(codChargeEstimate)} will be added to your order. Continue?`
      );
      if (!confirmed) {
        return;
      }
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
        subtitle="Review order items, then submit shipping, billing, and payment details."
      />

      <Box
        sx={{
          display: 'grid',
          gap: 1.2,
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 70%) minmax(300px, 30%)' },
          alignItems: 'start'
        }}
      >
        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ p: 1.2 }}>
            <Typography variant="h6">Ordered Items</Typography>
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
            <Stack spacing={0.6}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Items Subtotal
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatINR(subtotal)}
                </Typography>
              </Box>
              {couponDiscount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    Coupon ({appliedCoupon?.code})
                  </Typography>
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 700 }}>
                    -{formatINR(couponDiscount)}
                  </Typography>
                </Box>
              )}
              {selectedMethod?.id === 'cash_on_delivery' && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    COD Charge ({codProductCount} units x {formatINR(codChargePerProduct)})
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatINR(codChargeEstimate)}
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6">Total Payable</Typography>
                <Typography variant="h6" color="primary">
                  {formatINR(totalPayable)}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ width: '100%', position: { md: 'sticky' }, top: { md: 68 } }}>
          <CardContent component="form" onSubmit={onSubmit} sx={{ p: 1.1 }}>
            <Stack spacing={1}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Mandatory Details
              </Typography>

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

              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                Coupon Code (Optional)
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.8}>
                <TextField
                  fullWidth
                  size="small"
                  label="Coupon Code"
                  value={couponCodeInput}
                  onChange={(event) => {
                    const nextCode = event.target.value;
                    setCouponCodeInput(nextCode);
                    if (appliedCoupon && normalizeText(nextCode).toUpperCase() !== appliedCoupon.code) {
                      setAppliedCoupon(null);
                    }
                  }}
                  placeholder="e.g. WELCOME10"
                />
                <Button
                  type="button"
                  variant="outlined"
                  onClick={onApplyCoupon}
                  disabled={validatingCoupon || submitting || verifyingRedirect}
                >
                  {validatingCoupon ? 'Applying...' : 'Apply'}
                </Button>
                {appliedCoupon && (
                  <Button type="button" variant="text" color="inherit" onClick={onRemoveCoupon}>
                    Remove
                  </Button>
                )}
              </Stack>
              {appliedCoupon && (
                <Alert severity="success">
                  Coupon {appliedCoupon.code} applied. You save {formatINR(appliedCoupon.discountAmount)}.
                </Alert>
              )}

              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                Shipping Details
              </Typography>
              <TextField
                fullWidth
                required
                label="Full Name"
                value={form.shipping.fullName}
                onChange={(event) => updateShipping('fullName', event.target.value)}
              />
              <TextField
                fullWidth
                required
                label="Phone Number"
                value={form.shipping.phone}
                onChange={(event) => updateShipping('phone', event.target.value)}
              />
              <TextField
                fullWidth
                required
                label="Street Address"
                value={form.shipping.street}
                onChange={(event) => updateShipping('street', event.target.value)}
              />
              <TextField
                fullWidth
                label="Address Line 2 (Optional)"
                value={form.shipping.addressLine2}
                onChange={(event) => updateShipping('addressLine2', event.target.value)}
              />
              <TextField
                fullWidth
                required
                label="City"
                value={form.shipping.city}
                onChange={(event) => updateShipping('city', event.target.value)}
              />
              <TextField
                fullWidth
                required
                label="State"
                value={form.shipping.state}
                onChange={(event) => updateShipping('state', event.target.value)}
              />
              <TextField
                fullWidth
                required
                label="Postal Code"
                value={form.shipping.postalCode}
                onChange={(event) => updateShipping('postalCode', event.target.value)}
              />
              <TextField
                fullWidth
                required
                label="Country"
                value={form.shipping.country}
                onChange={(event) => updateShipping('country', event.target.value)}
              />

              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
                Billing Details (Tax Invoice)
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.billing.sameAsShipping}
                    onChange={(event) => updateBilling('sameAsShipping', event.target.checked)}
                  />
                }
                label="Billing address same as shipping"
              />
              {!form.billing.sameAsShipping && (
                <Stack spacing={1}>
                  <TextField
                    fullWidth
                    required
                    label="Billing Full Name"
                    value={form.billing.fullName}
                    onChange={(event) => updateBilling('fullName', event.target.value)}
                  />
                  <TextField
                    fullWidth
                    required
                    label="Billing Phone Number"
                    value={form.billing.phone}
                    onChange={(event) => updateBilling('phone', event.target.value)}
                  />
                  <TextField
                    fullWidth
                    required
                    label="Billing Street Address"
                    value={form.billing.street}
                    onChange={(event) => updateBilling('street', event.target.value)}
                  />
                  <TextField
                    fullWidth
                    label="Billing Address Line 2 (Optional)"
                    value={form.billing.addressLine2}
                    onChange={(event) => updateBilling('addressLine2', event.target.value)}
                  />
                  <TextField
                    fullWidth
                    required
                    label="Billing City"
                    value={form.billing.city}
                    onChange={(event) => updateBilling('city', event.target.value)}
                  />
                  <TextField
                    fullWidth
                    required
                    label="Billing State"
                    value={form.billing.state}
                    onChange={(event) => updateBilling('state', event.target.value)}
                  />
                  <TextField
                    fullWidth
                    required
                    label="Billing Postal Code"
                    value={form.billing.postalCode}
                    onChange={(event) => updateBilling('postalCode', event.target.value)}
                  />
                  <TextField
                    fullWidth
                    required
                    label="Billing Country"
                    value={form.billing.country}
                    onChange={(event) => updateBilling('country', event.target.value)}
                  />
                </Stack>
              )}

              <Divider />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Optional Business / GST Details
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.tax.businessPurchase}
                    onChange={(event) => updateTax('businessPurchase', event.target.checked)}
                  />
                }
                label="This is a business purchase (GST invoice)"
              />
              {form.tax.businessPurchase && (
                <Stack spacing={1}>
                  <TextField
                    fullWidth
                    label="Business Name"
                    value={form.tax.businessName}
                    onChange={(event) => updateTax('businessName', event.target.value)}
                  />
                  <TextField
                    fullWidth
                    required
                    label="GSTIN"
                    value={form.tax.gstin}
                    onChange={(event) => updateTax('gstin', event.target.value)}
                  />
                  <TextField
                    fullWidth
                    label="PAN (Optional)"
                    value={form.tax.pan}
                    onChange={(event) => updateTax('pan', event.target.value)}
                  />
                  <TextField
                    fullWidth
                    label="PO Number (Optional)"
                    value={form.tax.purchaseOrderNumber}
                    onChange={(event) => updateTax('purchaseOrderNumber', event.target.value)}
                  />
                </Stack>
              )}
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Order Notes (Optional)"
                value={form.tax.notes}
                onChange={(event) => updateTax('notes', event.target.value)}
              />

              {selectedMethod?.id === 'cash_on_delivery' && codChargeEstimate > 0 && (
                <Stack spacing={0.5}>
                  <Alert severity="warning">
                    Cash on Delivery convenience charges apply: {formatINR(codChargeEstimate)} ({codProductCount} units).
                  </Alert>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={form.codChargesAccepted}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            codChargesAccepted: event.target.checked
                          }))
                        }
                      />
                    }
                    label="I accept the additional Cash on Delivery charges."
                  />
                </Stack>
              )}

              {error && <Alert severity="error">{error}</Alert>}
              {!loadingMethods && paymentMethods.length === 0 && (
                <Alert severity="warning">No payment gateway is available right now. Please contact support.</Alert>
              )}
              {verifyingRedirect && <Alert severity="info">Verifying payment with gateway...</Alert>}
              {selectedMethod && selectedMethod.configured === false && (
                <Alert severity="warning">
                  Selected gateway is enabled but not configured yet. Add API keys in admin settings to use it.
                </Alert>
              )}

              <Button
                type="submit"
                variant="contained"
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
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default CheckoutPage;
