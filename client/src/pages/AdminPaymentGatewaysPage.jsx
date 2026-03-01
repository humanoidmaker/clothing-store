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
  razorpay: { enabled: true, mode: 'test', testKeyId: '', liveKeyId: '', testKeySecret: '', liveKeySecret: '' },
  stripe: {
    enabled: false,
    mode: 'test',
    testPublishableKey: '',
    livePublishableKey: '',
    testSecretKey: '',
    liveSecretKey: '',
    testWebhookSecret: '',
    liveWebhookSecret: ''
  },
  paypal: { enabled: false, clientId: '', clientSecret: '', environment: 'sandbox' },
  payu: { enabled: false, merchantKey: '', merchantSalt: '', environment: 'test' },
  cashfree: { enabled: false, appId: '', secretKey: '', environment: 'sandbox' },
  phonepe: { enabled: false, merchantId: '', saltKey: '', saltIndex: '1', environment: 'sandbox' }
};

const defaultConfiguredState = {
  razorpay: { testKeySecretConfigured: false, liveKeySecretConfigured: false },
  stripe: {
    testSecretKeyConfigured: false,
    liveSecretKeyConfigured: false,
    testWebhookSecretConfigured: false,
    liveWebhookSecretConfigured: false
  },
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
        mode: String(gateways?.razorpay?.mode || 'test'),
        testKeyId: String(gateways?.razorpay?.testKeyId || ''),
        liveKeyId: String(gateways?.razorpay?.liveKeyId || ''),
        testKeySecret: '',
        liveKeySecret: ''
      },
      stripe: {
        enabled: Boolean(gateways?.stripe?.enabled),
        mode: String(gateways?.stripe?.mode || 'test'),
        testPublishableKey: String(gateways?.stripe?.testPublishableKey || ''),
        livePublishableKey: String(gateways?.stripe?.livePublishableKey || ''),
        testSecretKey: '',
        liveSecretKey: '',
        testWebhookSecret: '',
        liveWebhookSecret: ''
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
        testKeySecretConfigured: Boolean(gateways?.razorpay?.testKeySecretConfigured),
        liveKeySecretConfigured: Boolean(gateways?.razorpay?.liveKeySecretConfigured)
      },
      stripe: {
        testSecretKeyConfigured: Boolean(gateways?.stripe?.testSecretKeyConfigured),
        liveSecretKeyConfigured: Boolean(gateways?.stripe?.liveSecretKeyConfigured),
        testWebhookSecretConfigured: Boolean(gateways?.stripe?.testWebhookSecretConfigured),
        liveWebhookSecretConfigured: Boolean(gateways?.stripe?.liveWebhookSecretConfigured)
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
            mode: String(form.razorpay.mode || 'test'),
            testKeyId: String(form.razorpay.testKeyId || '').trim(),
            liveKeyId: String(form.razorpay.liveKeyId || '').trim()
          },
          stripe: {
            enabled: Boolean(form.stripe.enabled),
            mode: String(form.stripe.mode || 'test'),
            testPublishableKey: String(form.stripe.testPublishableKey || '').trim(),
            livePublishableKey: String(form.stripe.livePublishableKey || '').trim()
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

      const razorpayTestSecret = String(form.razorpay.testKeySecret || '').trim();
      if (razorpayTestSecret) {
        payload.paymentGateways.razorpay.testKeySecret = razorpayTestSecret;
      }
      const razorpayLiveSecret = String(form.razorpay.liveKeySecret || '').trim();
      if (razorpayLiveSecret) {
        payload.paymentGateways.razorpay.liveKeySecret = razorpayLiveSecret;
      }

      const stripeTestSecret = String(form.stripe.testSecretKey || '').trim();
      if (stripeTestSecret) {
        payload.paymentGateways.stripe.testSecretKey = stripeTestSecret;
      }
      const stripeLiveSecret = String(form.stripe.liveSecretKey || '').trim();
      if (stripeLiveSecret) {
        payload.paymentGateways.stripe.liveSecretKey = stripeLiveSecret;
      }
      const stripeTestWebhook = String(form.stripe.testWebhookSecret || '').trim();
      if (stripeTestWebhook) {
        payload.paymentGateways.stripe.testWebhookSecret = stripeTestWebhook;
      }
      const stripeLiveWebhook = String(form.stripe.liveWebhookSecret || '').trim();
      if (stripeLiveWebhook) {
        payload.paymentGateways.stripe.liveWebhookSecret = stripeLiveWebhook;
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

  const razorpayEnvironment = form.razorpay.mode === 'live' ? 'live' : 'test';
  const stripeEnvironment = form.stripe.mode === 'live' ? 'live' : 'test';
  const razorpaySecretConfigured =
    razorpayEnvironment === 'live'
      ? configured.razorpay.liveKeySecretConfigured
      : configured.razorpay.testKeySecretConfigured;
  const stripeSecretConfigured =
    stripeEnvironment === 'live'
      ? configured.stripe.liveSecretKeyConfigured
      : configured.stripe.testSecretKeyConfigured;
  const stripeWebhookConfigured =
    stripeEnvironment === 'live'
      ? configured.stripe.liveWebhookSecretConfigured
      : configured.stripe.testWebhookSecretConfigured;

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
              <TextField
                select
                label="Environment"
                value={form.razorpay.mode}
                onChange={(event) => updateGateway('razorpay', 'mode', event.target.value)}
                sx={{ maxWidth: 220 }}
              >
                <MenuItem value="test">Test</MenuItem>
                <MenuItem value="live">Live</MenuItem>
              </TextField>
              <Typography variant="body2" color="text.secondary">
                Checkout uses {razorpayEnvironment} Razorpay credentials.
              </Typography>
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
                <TextField
                  label={`${razorpayEnvironment === 'live' ? 'Live' : 'Test'} Key ID`}
                  value={razorpayEnvironment === 'live' ? form.razorpay.liveKeyId : form.razorpay.testKeyId}
                  onChange={(event) =>
                    updateGateway(
                      'razorpay',
                      razorpayEnvironment === 'live' ? 'liveKeyId' : 'testKeyId',
                      event.target.value
                    )
                  }
                />
                <TextField
                  label={`${razorpayEnvironment === 'live' ? 'Live' : 'Test'} Key Secret`}
                  type="password"
                  value={razorpayEnvironment === 'live' ? form.razorpay.liveKeySecret : form.razorpay.testKeySecret}
                  onChange={(event) =>
                    updateGateway(
                      'razorpay',
                      razorpayEnvironment === 'live' ? 'liveKeySecret' : 'testKeySecret',
                      event.target.value
                    )
                  }
                  autoComplete="new-password"
                  helperText={razorpaySecretConfigured ? 'Secret configured.' : 'No secret saved.'}
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
              <TextField
                select
                label="Environment"
                value={form.stripe.mode}
                onChange={(event) => updateGateway('stripe', 'mode', event.target.value)}
                sx={{ maxWidth: 220 }}
              >
                <MenuItem value="test">Test</MenuItem>
                <MenuItem value="live">Live</MenuItem>
              </TextField>
              <Typography variant="body2" color="text.secondary">
                Checkout uses {stripeEnvironment} Stripe credentials.
              </Typography>
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' } }}>
                <TextField
                  label={`${stripeEnvironment === 'live' ? 'Live' : 'Test'} Publishable Key`}
                  value={stripeEnvironment === 'live' ? form.stripe.livePublishableKey : form.stripe.testPublishableKey}
                  onChange={(event) =>
                    updateGateway(
                      'stripe',
                      stripeEnvironment === 'live' ? 'livePublishableKey' : 'testPublishableKey',
                      event.target.value
                    )
                  }
                />
                <TextField
                  label={`${stripeEnvironment === 'live' ? 'Live' : 'Test'} Secret Key`}
                  type="password"
                  value={stripeEnvironment === 'live' ? form.stripe.liveSecretKey : form.stripe.testSecretKey}
                  onChange={(event) =>
                    updateGateway(
                      'stripe',
                      stripeEnvironment === 'live' ? 'liveSecretKey' : 'testSecretKey',
                      event.target.value
                    )
                  }
                  autoComplete="new-password"
                  helperText={stripeSecretConfigured ? 'Secret configured.' : 'No secret saved.'}
                />
                <TextField
                  label={`${stripeEnvironment === 'live' ? 'Live' : 'Test'} Webhook Secret`}
                  type="password"
                  value={stripeEnvironment === 'live' ? form.stripe.liveWebhookSecret : form.stripe.testWebhookSecret}
                  onChange={(event) =>
                    updateGateway(
                      'stripe',
                      stripeEnvironment === 'live' ? 'liveWebhookSecret' : 'testWebhookSecret',
                      event.target.value
                    )
                  }
                  autoComplete="new-password"
                  helperText={
                    stripeWebhookConfigured ? 'Webhook secret configured.' : 'Optional unless webhook is used.'
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
