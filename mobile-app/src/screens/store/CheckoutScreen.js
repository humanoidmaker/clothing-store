import { useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, Switch, Text, View } from 'react-native';
import api from '../../api/client';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import AppInput from '../../components/AppInput';
import AppScreen from '../../components/AppScreen';
import EmptyState from '../../components/EmptyState';
import LoadingView from '../../components/LoadingView';
import SectionCard from '../../components/SectionCard';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { useToast } from '../../context/ToastContext';
import { palette, spacing } from '../../theme/colors';
import { formatINR } from '../../utils/currency';

const DEFAULT_COD_CHARGE_PER_PRODUCT = 25;

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

const CheckoutScreen = ({ navigation }) => {
  const { items, subtotal, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const { storeName } = useStoreSettings();

  const [loadingMethods, setLoadingMethods] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedGateway, setSelectedGateway] = useState('');
  const [codChargePerProduct, setCodChargePerProduct] = useState(DEFAULT_COD_CHARGE_PER_PRODUCT);
  const [form, setForm] = useState(() => createCheckoutFormFromUser(user));

  useEffect(() => {
    setForm((current) => {
      const hasTypedData =
        Boolean(normalizeText(current?.shipping?.street)) ||
        Boolean(normalizeText(current?.shipping?.city)) ||
        Boolean(normalizeText(current?.shipping?.postalCode));
      if (hasTypedData) {
        return current;
      }
      return createCheckoutFormFromUser(user);
    });
  }, [user]);

  useEffect(() => {
    let active = true;

    const loadGateways = async () => {
      setLoadingMethods(true);
      try {
        const { data } = await api.get('/orders/payment/options', { showSuccessToast: false, showErrorToast: false });
        if (!active) {
          return;
        }

        const methods = Array.isArray(data?.methods) ? data.methods : [];
        setPaymentMethods(methods);

        const codPerProduct = Number(data?.codCharges?.perProduct);
        if (Number.isFinite(codPerProduct) && codPerProduct >= 0) {
          setCodChargePerProduct(codPerProduct);
        }

        const firstConfigured = methods.find((method) => method.configured !== false);
        setSelectedGateway(firstConfigured?.id || methods[0]?.id || '');
      } catch (error) {
        if (!active) {
          return;
        }
        showToast(error?.response?.data?.message || error.message || 'Failed to load payment methods', 'error');
      } finally {
        if (active) {
          setLoadingMethods(false);
        }
      }
    };

    if (isAuthenticated) {
      void loadGateways();
    }

    return () => {
      active = false;
    };
  }, [isAuthenticated, showToast]);

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

  const totalPayable = useMemo(() => Number(subtotal || 0) + Number(codChargeEstimate || 0), [subtotal, codChargeEstimate]);

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

  const buildCheckoutPayload = () => {
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
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        selectedSize: item.selectedSize,
        selectedColor: item.selectedColor
      })),
      shippingAddress: {
        ...form.shipping
      },
      billingDetails,
      taxDetails: {
        ...form.tax
      },
      codChargesAccepted: Boolean(form.codChargesAccepted)
    };
  };

  const onSubmit = async () => {
    if (!isAuthenticated) {
      navigation.navigate('Login', {
        redirectTo: {
          name: 'Checkout'
        }
      });
      return;
    }

    if (items.length === 0) {
      showToast('Cart is empty', 'error');
      return;
    }

    if (!selectedGateway) {
      showToast('Select a payment method', 'error');
      return;
    }

    if (selectedMethod?.configured === false) {
      showToast('Selected gateway is not configured', 'error');
      return;
    }

    if (selectedMethod?.id === 'cash_on_delivery' && codChargeEstimate > 0 && !form.codChargesAccepted) {
      showToast('Accept COD convenience charges to continue', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildCheckoutPayload();
      const { data } = await api.post('/orders/payment/initiate', {
        gateway: selectedGateway,
        ...payload
      });

      if (data?.flow === 'direct') {
        clearCart();
        showToast('Order placed successfully', 'success');
        navigation.navigate('Cart');
        navigation.getParent()?.navigate('Orders');
        return;
      }

      if (data?.flow === 'redirect' && data?.redirectUrl) {
        await Linking.openURL(String(data.redirectUrl));
        showToast('Continue payment in browser. Return to app after payment.', 'info');
        return;
      }

      if (data?.flow === 'form_post') {
        showToast('This gateway requires browser form post. Use web checkout for this payment method.', 'warning');
        return;
      }

      if (data?.flow === 'razorpay_popup') {
        showToast('Razorpay popup flow is not embedded in this native build yet. Use web checkout.', 'warning');
        return;
      }

      showToast('Unsupported payment flow from server', 'error');
    } catch (error) {
      showToast(error?.response?.data?.message || error.message || 'Could not place order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <AppScreen>
        <EmptyState title="Login required" message="Sign in to continue checkout." />
        <AppButton onPress={() => navigation.navigate('Login', { redirectTo: { name: 'Checkout' } })}>
          Login
        </AppButton>
      </AppScreen>
    );
  }

  if (items.length === 0) {
    return (
      <AppScreen>
        <EmptyState title="Cart is empty" message="Add items before checkout." />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader
        eyebrow="Checkout"
        title="Shipping & Payment"
        subtitle={`Store: ${storeName} - ${items.length} item types`}
      />

      <SectionCard>
        {items.map((item) => (
          <View key={item.cartKey} style={styles.orderRow}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemMeta}>
              {item.quantity} x {formatINR(item.price)}
            </Text>
          </View>
        ))}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>{formatINR(subtotal)}</Text>
        </View>
        {selectedMethod?.id === 'cash_on_delivery' && codChargeEstimate > 0 ? (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>COD Charges</Text>
            <Text style={styles.summaryValue}>{formatINR(codChargeEstimate)}</Text>
          </View>
        ) : null}
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatINR(totalPayable)}</Text>
        </View>
      </SectionCard>

      <SectionCard>
        {loadingMethods ? <LoadingView message="Loading payment methods..." /> : null}

        {!loadingMethods && paymentMethods.length === 0 ? (
          <EmptyState title="No payment methods" message="Ask admin to enable payment gateways." />
        ) : null}

        {!loadingMethods && paymentMethods.length > 0 ? (
          <View style={styles.methodWrap}>
            {paymentMethods.map((method) => {
              const selected = selectedGateway === method.id;
              return (
                <AppButton
                  key={method.id}
                  variant={selected ? 'primary' : 'ghost'}
                  disabled={method.configured === false}
                  onPress={() => setSelectedGateway(method.id)}
                >
                  {method.label}
                </AppButton>
              );
            })}
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Shipping</Text>
        <AppInput label="Full Name" value={form.shipping.fullName} onChangeText={(value) => updateShipping('fullName', value)} />
        <AppInput label="Phone" value={form.shipping.phone} onChangeText={(value) => updateShipping('phone', value)} keyboardType="phone-pad" />
        <AppInput label="Email" value={form.shipping.email} onChangeText={(value) => updateShipping('email', value)} keyboardType="email-address" autoCapitalize="none" />
        <AppInput label="Street" value={form.shipping.street} onChangeText={(value) => updateShipping('street', value)} />
        <AppInput label="Address Line 2" value={form.shipping.addressLine2} onChangeText={(value) => updateShipping('addressLine2', value)} />

        <View style={styles.row2}>
          <AppInput style={styles.flex} label="City" value={form.shipping.city} onChangeText={(value) => updateShipping('city', value)} />
          <AppInput style={styles.flex} label="State" value={form.shipping.state} onChangeText={(value) => updateShipping('state', value)} />
        </View>

        <View style={styles.row2}>
          <AppInput style={styles.flex} label="Postal Code" value={form.shipping.postalCode} onChangeText={(value) => updateShipping('postalCode', value)} />
          <AppInput style={styles.flex} label="Country" value={form.shipping.country} onChangeText={(value) => updateShipping('country', value)} />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Billing same as shipping</Text>
          <Switch
            value={form.billing.sameAsShipping}
            onValueChange={(value) => updateBilling('sameAsShipping', value)}
            trackColor={{ true: palette.primarySoft, false: '#d7dce5' }}
            thumbColor={form.billing.sameAsShipping ? palette.primary : '#f4f4f5'}
          />
        </View>

        {!form.billing.sameAsShipping ? (
          <>
            <Text style={styles.sectionTitle}>Billing</Text>
            <AppInput label="Billing Full Name" value={form.billing.fullName} onChangeText={(value) => updateBilling('fullName', value)} />
            <AppInput label="Billing Phone" value={form.billing.phone} onChangeText={(value) => updateBilling('phone', value)} />
            <AppInput label="Billing Street" value={form.billing.street} onChangeText={(value) => updateBilling('street', value)} />
            <View style={styles.row2}>
              <AppInput style={styles.flex} label="Billing City" value={form.billing.city} onChangeText={(value) => updateBilling('city', value)} />
              <AppInput style={styles.flex} label="Billing State" value={form.billing.state} onChangeText={(value) => updateBilling('state', value)} />
            </View>
            <View style={styles.row2}>
              <AppInput style={styles.flex} label="Billing Postal Code" value={form.billing.postalCode} onChangeText={(value) => updateBilling('postalCode', value)} />
              <AppInput style={styles.flex} label="Billing Country" value={form.billing.country} onChangeText={(value) => updateBilling('country', value)} />
            </View>
          </>
        ) : null}

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Business purchase</Text>
          <Switch
            value={form.tax.businessPurchase}
            onValueChange={(value) => updateTax('businessPurchase', value)}
            trackColor={{ true: palette.primarySoft, false: '#d7dce5' }}
            thumbColor={form.tax.businessPurchase ? palette.primary : '#f4f4f5'}
          />
        </View>

        {form.tax.businessPurchase ? (
          <>
            <AppInput label="Business Name" value={form.tax.businessName} onChangeText={(value) => updateTax('businessName', value)} />
            <AppInput label="GSTIN" value={form.tax.gstin} onChangeText={(value) => updateTax('gstin', value)} />
            <AppInput label="PAN" value={form.tax.pan} onChangeText={(value) => updateTax('pan', value)} />
            <AppInput label="PO Number" value={form.tax.purchaseOrderNumber} onChangeText={(value) => updateTax('purchaseOrderNumber', value)} />
          </>
        ) : null}

        <AppInput label="Order Notes" value={form.tax.notes} onChangeText={(value) => updateTax('notes', value)} multiline numberOfLines={3} />

        {selectedMethod?.id === 'cash_on_delivery' && codChargeEstimate > 0 ? (
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>I accept COD charges ({formatINR(codChargeEstimate)})</Text>
            <Switch
              value={form.codChargesAccepted}
              onValueChange={(value) => setForm((current) => ({ ...current, codChargesAccepted: value }))}
              trackColor={{ true: palette.primarySoft, false: '#d7dce5' }}
              thumbColor={form.codChargesAccepted ? palette.primary : '#f4f4f5'}
            />
          </View>
        ) : null}

        <AppButton onPress={onSubmit} disabled={submitting || loadingMethods || paymentMethods.length === 0}>
          {submitting
            ? 'Processing...'
            : selectedMethod?.id === 'cash_on_delivery'
              ? 'Place Order'
              : selectedMethod?.label
                ? `Pay with ${selectedMethod.label}`
                : 'Continue'}
        </AppButton>
      </SectionCard>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  orderRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#edf0f5',
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs
  },
  itemName: {
    color: palette.textPrimary,
    fontWeight: '700'
  },
  itemMeta: {
    color: palette.textSecondary,
    fontSize: 12
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  summaryLabel: {
    color: palette.textSecondary,
    fontSize: 13
  },
  summaryValue: {
    color: palette.textPrimary,
    fontWeight: '700'
  },
  totalLabel: {
    color: palette.textPrimary,
    fontSize: 16,
    fontWeight: '700'
  },
  totalValue: {
    color: palette.primary,
    fontSize: 20,
    fontWeight: '700'
  },
  methodWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  sectionTitle: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginTop: spacing.xs
  },
  row2: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  flex: {
    flex: 1
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  switchLabel: {
    color: palette.textSecondary,
    fontSize: 13,
    flex: 1,
    paddingRight: spacing.sm
  }
});

export default CheckoutScreen;

