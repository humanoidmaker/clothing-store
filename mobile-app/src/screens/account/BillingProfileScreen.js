import { useEffect, useState } from 'react';
import { Switch, Text, View, StyleSheet } from 'react-native';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import AppInput from '../../components/AppInput';
import AppScreen from '../../components/AppScreen';
import SectionCard from '../../components/SectionCard';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { palette } from '../../theme/colors';

const createDraftFromUser = (user) => ({
  shipping: {
    fullName: String(user?.defaultShippingAddress?.fullName || user?.name || ''),
    phone: String(user?.defaultShippingAddress?.phone || user?.phone || ''),
    email: String(user?.defaultShippingAddress?.email || user?.email || ''),
    street: String(user?.defaultShippingAddress?.street || ''),
    addressLine2: String(user?.defaultShippingAddress?.addressLine2 || ''),
    city: String(user?.defaultShippingAddress?.city || ''),
    state: String(user?.defaultShippingAddress?.state || ''),
    postalCode: String(user?.defaultShippingAddress?.postalCode || ''),
    country: String(user?.defaultShippingAddress?.country || 'India')
  },
  billing: {
    sameAsShipping: user?.defaultBillingDetails?.sameAsShipping !== false,
    fullName: String(user?.defaultBillingDetails?.fullName || ''),
    phone: String(user?.defaultBillingDetails?.phone || ''),
    email: String(user?.defaultBillingDetails?.email || ''),
    street: String(user?.defaultBillingDetails?.street || ''),
    addressLine2: String(user?.defaultBillingDetails?.addressLine2 || ''),
    city: String(user?.defaultBillingDetails?.city || ''),
    state: String(user?.defaultBillingDetails?.state || ''),
    postalCode: String(user?.defaultBillingDetails?.postalCode || ''),
    country: String(user?.defaultBillingDetails?.country || 'India')
  },
  tax: {
    businessPurchase: Boolean(user?.defaultTaxDetails?.businessPurchase),
    businessName: String(user?.defaultTaxDetails?.businessName || ''),
    gstin: String(user?.defaultTaxDetails?.gstin || ''),
    pan: String(user?.defaultTaxDetails?.pan || ''),
    purchaseOrderNumber: String(user?.defaultTaxDetails?.purchaseOrderNumber || ''),
    notes: String(user?.defaultTaxDetails?.notes || '')
  }
});

const BillingProfileScreen = () => {
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();
  const [draft, setDraft] = useState(() => createDraftFromUser(user));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(createDraftFromUser(user));
  }, [user]);

  const setShipping = (field, value) => {
    setDraft((current) => ({
      ...current,
      shipping: {
        ...current.shipping,
        [field]: value
      }
    }));
  };

  const setBilling = (field, value) => {
    setDraft((current) => ({
      ...current,
      billing: {
        ...current.billing,
        [field]: value
      }
    }));
  };

  const setTax = (field, value) => {
    setDraft((current) => ({
      ...current,
      tax: {
        ...current.tax,
        [field]: value
      }
    }));
  };

  const onSubmit = async () => {
    setSaving(true);
    try {
      await updateProfile({
        defaults: {
          defaultShippingAddress: {
            ...draft.shipping
          },
          defaultBillingDetails: draft.billing.sameAsShipping
            ? {
                sameAsShipping: true
              }
            : {
                ...draft.billing,
                sameAsShipping: false
              },
          defaultTaxDetails: {
            ...draft.tax
          }
        }
      });

      showToast('Billing profile saved', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to save billing profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <AppHeader eyebrow="Account" title="Billing Profile" subtitle="Saved shipping, billing and tax defaults for checkout." />

      <SectionCard>
        <Text style={styles.sectionTitle}>Default Shipping</Text>
        <AppInput label="Full Name" value={draft.shipping.fullName} onChangeText={(value) => setShipping('fullName', value)} />
        <AppInput label="Phone" value={draft.shipping.phone} onChangeText={(value) => setShipping('phone', value)} />
        <AppInput label="Email" value={draft.shipping.email} onChangeText={(value) => setShipping('email', value)} autoCapitalize="none" keyboardType="email-address" />
        <AppInput label="Street" value={draft.shipping.street} onChangeText={(value) => setShipping('street', value)} />
        <AppInput label="Address Line 2" value={draft.shipping.addressLine2} onChangeText={(value) => setShipping('addressLine2', value)} />
        <AppInput label="City" value={draft.shipping.city} onChangeText={(value) => setShipping('city', value)} />
        <AppInput label="State" value={draft.shipping.state} onChangeText={(value) => setShipping('state', value)} />
        <AppInput label="Postal Code" value={draft.shipping.postalCode} onChangeText={(value) => setShipping('postalCode', value)} />
        <AppInput label="Country" value={draft.shipping.country} onChangeText={(value) => setShipping('country', value)} />
      </SectionCard>

      <SectionCard>
        <View style={styles.switchRow}>
          <Text style={styles.sectionTitle}>Billing same as shipping</Text>
          <Switch
            value={draft.billing.sameAsShipping}
            onValueChange={(value) => setBilling('sameAsShipping', value)}
            trackColor={{ true: palette.primarySoft, false: '#d7dce5' }}
            thumbColor={draft.billing.sameAsShipping ? palette.primary : '#f4f4f5'}
          />
        </View>

        {!draft.billing.sameAsShipping ? (
          <>
            <AppInput label="Billing Full Name" value={draft.billing.fullName} onChangeText={(value) => setBilling('fullName', value)} />
            <AppInput label="Billing Phone" value={draft.billing.phone} onChangeText={(value) => setBilling('phone', value)} />
            <AppInput label="Billing Street" value={draft.billing.street} onChangeText={(value) => setBilling('street', value)} />
            <AppInput label="Billing Address Line 2" value={draft.billing.addressLine2} onChangeText={(value) => setBilling('addressLine2', value)} />
            <AppInput label="Billing City" value={draft.billing.city} onChangeText={(value) => setBilling('city', value)} />
            <AppInput label="Billing State" value={draft.billing.state} onChangeText={(value) => setBilling('state', value)} />
            <AppInput label="Billing Postal Code" value={draft.billing.postalCode} onChangeText={(value) => setBilling('postalCode', value)} />
            <AppInput label="Billing Country" value={draft.billing.country} onChangeText={(value) => setBilling('country', value)} />
          </>
        ) : null}
      </SectionCard>

      <SectionCard>
        <View style={styles.switchRow}>
          <Text style={styles.sectionTitle}>Business purchase by default</Text>
          <Switch
            value={draft.tax.businessPurchase}
            onValueChange={(value) => setTax('businessPurchase', value)}
            trackColor={{ true: palette.primarySoft, false: '#d7dce5' }}
            thumbColor={draft.tax.businessPurchase ? palette.primary : '#f4f4f5'}
          />
        </View>

        <AppInput label="Business Name" value={draft.tax.businessName} onChangeText={(value) => setTax('businessName', value)} />
        <AppInput label="GSTIN" value={draft.tax.gstin} onChangeText={(value) => setTax('gstin', value)} />
        <AppInput label="PAN" value={draft.tax.pan} onChangeText={(value) => setTax('pan', value)} />
        <AppInput label="PO Number" value={draft.tax.purchaseOrderNumber} onChangeText={(value) => setTax('purchaseOrderNumber', value)} />
        <AppInput label="Notes" value={draft.tax.notes} onChangeText={(value) => setTax('notes', value)} multiline numberOfLines={3} />
      </SectionCard>

      <AppButton onPress={onSubmit} disabled={saving}>
        {saving ? 'Saving...' : 'Save Billing Profile'}
      </AppButton>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: '700'
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  }
});

export default BillingProfileScreen;
