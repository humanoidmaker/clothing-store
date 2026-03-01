import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import api from '../api';
import AdminSettingsSubnav from '../components/AdminSettingsSubnav';
import PageHeader from '../components/PageHeader';

const defaultGatewayState = {
  cashOnDelivery: { enabled: true },
  razorpay: { enabled: true, keyId: '', keySecret: '' },
  stripe: { enabled: false, publishableKey: '', secretKey: '', webhookSecret: '' },
  paypal: { enabled: false, clientId: '', clientSecret: '', environment: 'sandbox' },
  payu: { enabled: false, merchantKey: '', merchantSalt: '', environment: 'test' },
  cashfree: { enabled: false, appId: '', secretKey: '', environment: 'sandbox' },
  phonepe: { enabled: false, merchantId: '', saltKey: '', saltIndex: '1', environment: 'sandbox' }
};

const defaultConfiguredState = {
  razorpay: { keySecretConfigured: false },
  stripe: { secretKeyConfigured: false, webhookSecretConfigured: false },
  paypal: { clientSecretConfigured: false },
  payu: { merchantSaltConfigured: false },
  cashfree: { secretKeyConfigured: false },
  phonepe: { saltKeyConfigured: false }
};

const AdminPaymentGatewaysPage = () => {
  const [form, setForm] = useState(defaultGatewayState);
  const [configured, setConfigured] = useState(defaultConfiguredState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const applyResponse = (data) => {
    const gateways = data?.paymentGateways || {};

    setForm({
      cashOnDelivery: {
        enabled: Boolean(gateways?.cashOnDelivery?.enabled)
      },
      razorpay: {
        enabled: Boolean(gateways?.razorpay?.enabled),
        keyId: String(gateways?.razorpay?.keyId || ''),
        keySecret: ''
      },
      stripe: {
        enabled: Boolean(gateways?.stripe?.enabled),
        publishableKey: String(gateways?.stripe?.publishableKey || ''),
        secretKey: '',
        webhookSecret: ''
      },
      paypal: {
        enabled: Boolean(gateways?.paypal?.enabled),
        clientId: String(gateways?.paypal?.clientId || ''),
        clientSecret: '',
        environment: String(gateways?.paypal?.environment || 'sandbox')
      },
      payu: {
        enabled: Boolean(gateways?.payu?.enabled),
        merchantKey: String(gateways?.payu?.merchantKey || ''),
        merchantSalt: '',
        environment: String(gateways?.payu?.environment || 'test')
      },
      cashfree: {
        enabled: Boolean(gateways?.cashfree?.enabled),
        appId: String(gateways?.cashfree?.appId || ''),
        secretKey: '',
        environment: String(gateways?.cashfree?.environment || 'sandbox')
      },
      phonepe: {
        enabled: Boolean(gateways?.phonepe?.enabled),
        merchantId: String(gateways?.phonepe?.merchantId || ''),
        saltKey: '',
        saltIndex: String(gateways?.phonepe?.saltIndex || '1'),
        environment: String(gateways?.phonepe?.environment || 'sandbox')
      }
    });

    setConfigured({
      razorpay: {
        keySecretConfigured: Boolean(gateways?.razorpay?.keySecretConfigured)
      },
      stripe: {
        secretKeyConfigured: Boolean(gateways?.stripe?.secretKeyConfigured),
        webhookSecretConfigured: Boolean(gateways?.stripe?.webhookSecretConfigured)
      },
      paypal: {
        clientSecretConfigured: Boolean(gateways?.paypal?.clientSecretConfigured)
      },
      payu: {
        merchantSaltConfigured: Boolean(gateways?.payu?.merchantSaltConfigured)
      },
      cashfree: {
        secretKeyConfigured: Boolean(gateways?.cashfree?.secretKeyConfigured)
      },
      phonepe: {
        saltKeyConfigured: Boolean(gateways?.phonepe?.saltKeyConfigured)
      }
    });
  };

  const loadGateways = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/settings/admin');
      applyResponse(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Failed to load payment gateways');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGateways();
  }, []);

  const updateGateway = (gateway, field, value) => {
    setForm((current) => ({
      ...current,
      [gateway]: {
        ...current[gateway],
        [field]: value
      }
    }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const payload = {
        paymentGateways: {
          cashOnDelivery: {
            enabled: Boolean(form.cashOnDelivery.enabled)
          },
          razorpay: {
            enabled: Boolean(form.razorpay.enabled),
            keyId: String(form.razorpay.keyId || '').trim()
          },
          stripe: {
            enabled: Boolean(form.stripe.enabled),
            publishableKey: String(form.stripe.publishableKey || '').trim()
          },
          paypal: {
            enabled: Boolean(form.paypal.enabled),
            clientId: String(form.paypal.clientId || '').trim(),
            environment: String(form.paypal.environment || 'sandbox')
          },
          payu: {
            enabled: Boolean(form.payu.enabled),
            merchantKey: String(form.payu.merchantKey || '').trim(),
            environment: String(form.payu.environment || 'test')
          },
          cashfree: {
            enabled: Boolean(form.cashfree.enabled),
            appId: String(form.cashfree.appId || '').trim(),
            environment: String(form.cashfree.environment || 'sandbox')
          },
          phonepe: {
            enabled: Boolean(form.phonepe.enabled),
            merchantId: String(form.phonepe.merchantId || '').trim(),
            saltIndex: String(form.phonepe.saltIndex || '').trim() || '1',
            environment: String(form.phonepe.environment || 'sandbox')
          }
        }
      };

      const razorpaySecret = String(form.razorpay.keySecret || '').trim();
      if (razorpaySecret) {
        payload.paymentGateways.razorpay.keySecret = razorpaySecret;
      }

      const stripeSecret = String(form.stripe.secretKey || '').trim();
      if (stripeSecret) {
        payload.paymentGateways.stripe.secretKey = stripeSecret;
      }
      const stripeWebhook = String(form.stripe.webhookSecret || '').trim();
      if (stripeWebhook) {
        payload.paymentGateways.stripe.webhookSecret = stripeWebhook;
      }

      const paypalSecret = String(form.paypal.clientSecret || '').trim();
      if (paypalSecret) {
        payload.paymentGateways.paypal.clientSecret = paypalSecret;
      }

      const payuSalt = String(form.payu.merchantSalt || '').trim();
      if (payuSalt) {
        payload.paymentGateways.payu.merchantSalt = payuSalt;
      }

      const cashfreeSecret = String(form.cashfree.secretKey || '').trim();
      if (cashfreeSecret) {
        payload.paymentGateways.cashfree.secretKey = cashfreeSecret;
      }

      const phonepeSalt = String(form.phonepe.saltKey || '').trim();
      if (phonepeSalt) {
        payload.paymentGateways.phonepe.saltKey = phonepeSalt;
      }

      const { data } = await api.put('/settings', payload);
      applyResponse(data);
      setSuccess('Payment gateway settings updated successfully.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Failed to update payment gateways');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <PageHeader
        eyebrow="Admin"
        title="Payment Gateways"
        subtitle="Enable gateways and update API keys/secrets for India and international payments."
      />

      <Card sx={{ mb: 1.2 }}>
        <CardContent sx={{ p: 1 }}>
          <AdminSettingsSubnav />
        </CardContent>
      </Card>

      {(error || success) && (
        <Stack spacing={0.8} sx={{ mb: 1.1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
        </Stack>
      )}

      <Card>
        <CardContent component="form" onSubmit={onSubmit} sx={{ p: 1.2 }}>
          {loading ? (
            <Box sx={{ py: 3, display: 'grid', placeItems: 'center' }}>
              <CircularProgress size={22} />
            </Box>
          ) : (
            <Stack spacing={1.2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Available Methods
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={form.cashOnDelivery.enabled}
                    onChange={(event) => updateGateway('cashOnDelivery', 'enabled', event.target.checked)}
                  />
                }
                label="Cash on Delivery"
              />

              <Divider />

              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Razorpay
              </Typography>
              <FormControlLabel
                control={
                  <Switch checked={form.razorpay.enabled} onChange={(event) => updateGateway('razorpay', 'enabled', event.target.checked)} />
                }
                label="Enable Razorpay"
              />
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
                <TextField label="Key ID" value={form.razorpay.keyId} onChange={(event) => updateGateway('razorpay', 'keyId', event.target.value)} />
                <TextField
                  label="Key Secret"
                  type="password"
                  value={form.razorpay.keySecret}
                  onChange={(event) => updateGateway('razorpay', 'keySecret', event.target.value)}
                  autoComplete="new-password"
                  helperText={
                    configured.razorpay.keySecretConfigured
                      ? 'Secret already saved. Enter again only to rotate.'
                      : 'No secret saved.'
                  }
                />
              </Box>

              <Divider />

              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Stripe
              </Typography>
              <FormControlLabel
                control={<Switch checked={form.stripe.enabled} onChange={(event) => updateGateway('stripe', 'enabled', event.target.checked)} />}
                label="Enable Stripe"
              />
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' } }}>
                <TextField
                  label="Publishable Key"
                  value={form.stripe.publishableKey}
                  onChange={(event) => updateGateway('stripe', 'publishableKey', event.target.value)}
                />
                <TextField
                  label="Secret Key"
                  type="password"
                  value={form.stripe.secretKey}
                  onChange={(event) => updateGateway('stripe', 'secretKey', event.target.value)}
                  autoComplete="new-password"
                  helperText={configured.stripe.secretKeyConfigured ? 'Secret configured.' : 'No secret saved.'}
                />
                <TextField
                  label="Webhook Secret"
                  type="password"
                  value={form.stripe.webhookSecret}
                  onChange={(event) => updateGateway('stripe', 'webhookSecret', event.target.value)}
                  autoComplete="new-password"
                  helperText={
                    configured.stripe.webhookSecretConfigured
                      ? 'Webhook secret configured.'
                      : 'Optional unless webhook is used.'
                  }
                />
              </Box>

              <Divider />

              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                PayPal
              </Typography>
              <FormControlLabel
                control={<Switch checked={form.paypal.enabled} onChange={(event) => updateGateway('paypal', 'enabled', event.target.checked)} />}
                label="Enable PayPal"
              />
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' } }}>
                <TextField label="Client ID" value={form.paypal.clientId} onChange={(event) => updateGateway('paypal', 'clientId', event.target.value)} />
                <TextField
                  label="Client Secret"
                  type="password"
                  value={form.paypal.clientSecret}
                  onChange={(event) => updateGateway('paypal', 'clientSecret', event.target.value)}
                  autoComplete="new-password"
                  helperText={configured.paypal.clientSecretConfigured ? 'Secret configured.' : 'No secret saved.'}
                />
                <TextField select label="Environment" value={form.paypal.environment} onChange={(event) => updateGateway('paypal', 'environment', event.target.value)}>
                  <MenuItem value="sandbox">Sandbox</MenuItem>
                  <MenuItem value="live">Live</MenuItem>
                </TextField>
              </Box>

              <Divider />

              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                PayU
              </Typography>
              <FormControlLabel
                control={<Switch checked={form.payu.enabled} onChange={(event) => updateGateway('payu', 'enabled', event.target.checked)} />}
                label="Enable PayU"
              />
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' } }}>
                <TextField label="Merchant Key" value={form.payu.merchantKey} onChange={(event) => updateGateway('payu', 'merchantKey', event.target.value)} />
                <TextField
                  label="Merchant Salt"
                  type="password"
                  value={form.payu.merchantSalt}
                  onChange={(event) => updateGateway('payu', 'merchantSalt', event.target.value)}
                  autoComplete="new-password"
                  helperText={configured.payu.merchantSaltConfigured ? 'Salt configured.' : 'No salt saved.'}
                />
                <TextField select label="Environment" value={form.payu.environment} onChange={(event) => updateGateway('payu', 'environment', event.target.value)}>
                  <MenuItem value="test">Test</MenuItem>
                  <MenuItem value="live">Live</MenuItem>
                </TextField>
              </Box>

              <Divider />

              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Cashfree
              </Typography>
              <FormControlLabel
                control={<Switch checked={form.cashfree.enabled} onChange={(event) => updateGateway('cashfree', 'enabled', event.target.checked)} />}
                label="Enable Cashfree"
              />
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' } }}>
                <TextField label="App ID / Client ID" value={form.cashfree.appId} onChange={(event) => updateGateway('cashfree', 'appId', event.target.value)} />
                <TextField
                  label="Secret Key"
                  type="password"
                  value={form.cashfree.secretKey}
                  onChange={(event) => updateGateway('cashfree', 'secretKey', event.target.value)}
                  autoComplete="new-password"
                  helperText={configured.cashfree.secretKeyConfigured ? 'Secret configured.' : 'No secret saved.'}
                />
                <TextField
                  select
                  label="Environment"
                  value={form.cashfree.environment}
                  onChange={(event) => updateGateway('cashfree', 'environment', event.target.value)}
                >
                  <MenuItem value="sandbox">Sandbox</MenuItem>
                  <MenuItem value="production">Production</MenuItem>
                </TextField>
              </Box>

              <Divider />

              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                PhonePe
              </Typography>
              <FormControlLabel
                control={<Switch checked={form.phonepe.enabled} onChange={(event) => updateGateway('phonepe', 'enabled', event.target.checked)} />}
                label="Enable PhonePe"
              />
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' } }}>
                <TextField label="Merchant ID" value={form.phonepe.merchantId} onChange={(event) => updateGateway('phonepe', 'merchantId', event.target.value)} />
                <TextField
                  label="Salt Key"
                  type="password"
                  value={form.phonepe.saltKey}
                  onChange={(event) => updateGateway('phonepe', 'saltKey', event.target.value)}
                  autoComplete="new-password"
                  helperText={configured.phonepe.saltKeyConfigured ? 'Salt key configured.' : 'No salt key saved.'}
                />
                <TextField label="Salt Index" value={form.phonepe.saltIndex} onChange={(event) => updateGateway('phonepe', 'saltIndex', event.target.value)} />
                <TextField
                  select
                  label="Environment"
                  value={form.phonepe.environment}
                  onChange={(event) => updateGateway('phonepe', 'environment', event.target.value)}
                >
                  <MenuItem value="sandbox">Sandbox</MenuItem>
                  <MenuItem value="production">Production</MenuItem>
                </TextField>
              </Box>

              <Stack direction="row" spacing={0.8}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveOutlinedIcon />}
                >
                  {saving ? 'Saving...' : 'Save Payment Gateways'}
                </Button>
              </Stack>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminPaymentGatewaysPage;
