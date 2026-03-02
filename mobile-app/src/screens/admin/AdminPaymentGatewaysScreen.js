import { useEffect, useState } from 'react';
import { Switch, Text, View, StyleSheet } from 'react-native';
import api from '../../api/client';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import AppInput from '../../components/AppInput';
import AppScreen from '../../components/AppScreen';
import LoadingView from '../../components/LoadingView';
import SectionCard from '../../components/SectionCard';
import { useToast } from '../../context/ToastContext';
import { palette } from '../../theme/colors';

const defaultGatewayState = {
  cashOnDelivery: { enabled: true },
  razorpay: { enabled: false, mode: 'test', testKeyId: '', liveKeyId: '', testKeySecret: '', liveKeySecret: '' },
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

const AdminPaymentGatewaysScreen = () => {
  const { showToast } = useToast();
  const [form, setForm] = useState(defaultGatewayState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const loadGateways = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/settings/admin', { showSuccessToast: false, showErrorToast: false });
        if (!active) {
          return;
        }

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
      } catch (error) {
        if (!active) {
          return;
        }
        showToast(error?.response?.data?.message || error.message || 'Failed to load payment gateways', 'error');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadGateways();

    return () => {
      active = false;
    };
  }, [showToast]);

  const updateGateway = (gateway, field, value) => {
    setForm((current) => ({
      ...current,
      [gateway]: {
        ...current[gateway],
        [field]: value
      }
    }));
  };

  const gatewaySwitch = (gateway, label) => (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch
        value={Boolean(form?.[gateway]?.enabled)}
        onValueChange={(value) => updateGateway(gateway, 'enabled', value)}
        trackColor={{ true: palette.primarySoft, false: '#d7dce5' }}
        thumbColor={Boolean(form?.[gateway]?.enabled) ? palette.primary : '#f4f4f5'}
      />
    </View>
  );

  const onSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        paymentGateways: {
          cashOnDelivery: {
            enabled: Boolean(form.cashOnDelivery.enabled)
          },
          razorpay: {
            enabled: Boolean(form.razorpay.enabled),
            mode: form.razorpay.mode,
            testKeyId: form.razorpay.testKeyId,
            liveKeyId: form.razorpay.liveKeyId
          },
          stripe: {
            enabled: Boolean(form.stripe.enabled),
            mode: form.stripe.mode,
            testPublishableKey: form.stripe.testPublishableKey,
            livePublishableKey: form.stripe.livePublishableKey
          },
          paypal: {
            enabled: Boolean(form.paypal.enabled),
            clientId: form.paypal.clientId,
            environment: form.paypal.environment
          },
          payu: {
            enabled: Boolean(form.payu.enabled),
            merchantKey: form.payu.merchantKey,
            environment: form.payu.environment
          },
          cashfree: {
            enabled: Boolean(form.cashfree.enabled),
            appId: form.cashfree.appId,
            environment: form.cashfree.environment
          },
          phonepe: {
            enabled: Boolean(form.phonepe.enabled),
            merchantId: form.phonepe.merchantId,
            saltIndex: form.phonepe.saltIndex,
            environment: form.phonepe.environment
          }
        }
      };

      if (form.razorpay.testKeySecret.trim()) payload.paymentGateways.razorpay.testKeySecret = form.razorpay.testKeySecret.trim();
      if (form.razorpay.liveKeySecret.trim()) payload.paymentGateways.razorpay.liveKeySecret = form.razorpay.liveKeySecret.trim();
      if (form.stripe.testSecretKey.trim()) payload.paymentGateways.stripe.testSecretKey = form.stripe.testSecretKey.trim();
      if (form.stripe.liveSecretKey.trim()) payload.paymentGateways.stripe.liveSecretKey = form.stripe.liveSecretKey.trim();
      if (form.stripe.testWebhookSecret.trim()) payload.paymentGateways.stripe.testWebhookSecret = form.stripe.testWebhookSecret.trim();
      if (form.stripe.liveWebhookSecret.trim()) payload.paymentGateways.stripe.liveWebhookSecret = form.stripe.liveWebhookSecret.trim();
      if (form.paypal.clientSecret.trim()) payload.paymentGateways.paypal.clientSecret = form.paypal.clientSecret.trim();
      if (form.payu.merchantSalt.trim()) payload.paymentGateways.payu.merchantSalt = form.payu.merchantSalt.trim();
      if (form.cashfree.secretKey.trim()) payload.paymentGateways.cashfree.secretKey = form.cashfree.secretKey.trim();
      if (form.phonepe.saltKey.trim()) payload.paymentGateways.phonepe.saltKey = form.phonepe.saltKey.trim();

      await api.put('/settings', payload);
      showToast('Payment gateway settings saved', 'success');
    } catch (error) {
      showToast(error?.response?.data?.message || error.message || 'Failed to save payment gateways', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppScreen>
        <LoadingView message="Loading payment gateways..." />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader eyebrow="Dashboard" title="Payment Gateways" subtitle="Manage gateway availability and API credentials." />

      <SectionCard>
        {gatewaySwitch('cashOnDelivery', 'Cash on Delivery')}
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Razorpay</Text>
        {gatewaySwitch('razorpay', 'Enable Razorpay')}
        <AppInput label="Mode (test/live)" value={form.razorpay.mode} onChangeText={(value) => updateGateway('razorpay', 'mode', value.toLowerCase())} />
        <AppInput label="Test Key ID" value={form.razorpay.testKeyId} onChangeText={(value) => updateGateway('razorpay', 'testKeyId', value)} />
        <AppInput label="Test Secret (optional update)" value={form.razorpay.testKeySecret} onChangeText={(value) => updateGateway('razorpay', 'testKeySecret', value)} secureTextEntry />
        <AppInput label="Live Key ID" value={form.razorpay.liveKeyId} onChangeText={(value) => updateGateway('razorpay', 'liveKeyId', value)} />
        <AppInput label="Live Secret (optional update)" value={form.razorpay.liveKeySecret} onChangeText={(value) => updateGateway('razorpay', 'liveKeySecret', value)} secureTextEntry />
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Stripe</Text>
        {gatewaySwitch('stripe', 'Enable Stripe')}
        <AppInput label="Mode (test/live)" value={form.stripe.mode} onChangeText={(value) => updateGateway('stripe', 'mode', value.toLowerCase())} />
        <AppInput label="Test Publishable Key" value={form.stripe.testPublishableKey} onChangeText={(value) => updateGateway('stripe', 'testPublishableKey', value)} />
        <AppInput label="Test Secret (optional update)" value={form.stripe.testSecretKey} onChangeText={(value) => updateGateway('stripe', 'testSecretKey', value)} secureTextEntry />
        <AppInput label="Test Webhook Secret (optional update)" value={form.stripe.testWebhookSecret} onChangeText={(value) => updateGateway('stripe', 'testWebhookSecret', value)} secureTextEntry />
        <AppInput label="Live Publishable Key" value={form.stripe.livePublishableKey} onChangeText={(value) => updateGateway('stripe', 'livePublishableKey', value)} />
        <AppInput label="Live Secret (optional update)" value={form.stripe.liveSecretKey} onChangeText={(value) => updateGateway('stripe', 'liveSecretKey', value)} secureTextEntry />
        <AppInput label="Live Webhook Secret (optional update)" value={form.stripe.liveWebhookSecret} onChangeText={(value) => updateGateway('stripe', 'liveWebhookSecret', value)} secureTextEntry />
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>PayPal</Text>
        {gatewaySwitch('paypal', 'Enable PayPal')}
        <AppInput label="Client ID" value={form.paypal.clientId} onChangeText={(value) => updateGateway('paypal', 'clientId', value)} />
        <AppInput label="Client Secret (optional update)" value={form.paypal.clientSecret} onChangeText={(value) => updateGateway('paypal', 'clientSecret', value)} secureTextEntry />
        <AppInput label="Environment (sandbox/live)" value={form.paypal.environment} onChangeText={(value) => updateGateway('paypal', 'environment', value.toLowerCase())} />
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>PayU</Text>
        {gatewaySwitch('payu', 'Enable PayU')}
        <AppInput label="Merchant Key" value={form.payu.merchantKey} onChangeText={(value) => updateGateway('payu', 'merchantKey', value)} />
        <AppInput label="Merchant Salt (optional update)" value={form.payu.merchantSalt} onChangeText={(value) => updateGateway('payu', 'merchantSalt', value)} secureTextEntry />
        <AppInput label="Environment (test/live)" value={form.payu.environment} onChangeText={(value) => updateGateway('payu', 'environment', value.toLowerCase())} />
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Cashfree</Text>
        {gatewaySwitch('cashfree', 'Enable Cashfree')}
        <AppInput label="App ID" value={form.cashfree.appId} onChangeText={(value) => updateGateway('cashfree', 'appId', value)} />
        <AppInput label="Secret Key (optional update)" value={form.cashfree.secretKey} onChangeText={(value) => updateGateway('cashfree', 'secretKey', value)} secureTextEntry />
        <AppInput label="Environment (sandbox/production)" value={form.cashfree.environment} onChangeText={(value) => updateGateway('cashfree', 'environment', value.toLowerCase())} />
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>PhonePe</Text>
        {gatewaySwitch('phonepe', 'Enable PhonePe')}
        <AppInput label="Merchant ID" value={form.phonepe.merchantId} onChangeText={(value) => updateGateway('phonepe', 'merchantId', value)} />
        <AppInput label="Salt Key (optional update)" value={form.phonepe.saltKey} onChangeText={(value) => updateGateway('phonepe', 'saltKey', value)} secureTextEntry />
        <AppInput label="Salt Index" value={form.phonepe.saltIndex} onChangeText={(value) => updateGateway('phonepe', 'saltIndex', value)} />
        <AppInput label="Environment (sandbox/production)" value={form.phonepe.environment} onChangeText={(value) => updateGateway('phonepe', 'environment', value.toLowerCase())} />
      </SectionCard>

      <AppButton onPress={onSubmit} disabled={saving}>
        {saving ? 'Saving...' : 'Save Gateway Settings'}
      </AppButton>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: '700'
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  switchLabel: {
    flex: 1,
    color: palette.textSecondary,
    fontSize: 13,
    paddingRight: 8
  }
});

export default AdminPaymentGatewaysScreen;
