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
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useAuth } from '../context/AuthContext';

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

const UserBillingProfileSettingsPage = () => {
  const { user, updateProfile } = useAuth();
  const [draft, setDraft] = useState(() => createDraftFromUser(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
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
    } catch (requestError) {
      setError(requestError.message || 'Failed to update billing profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent component="form" onSubmit={onSubmit} sx={{ p: 1.2 }}>
        <Stack spacing={1.2}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Reusable Billing Profile
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Saved details auto-fill checkout for faster repeat purchases.
          </Typography>

          {error && <Alert severity="error">{error}</Alert>}

          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Default Shipping Address
          </Typography>
          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
            <TextField
              required
              label="Full Name"
              value={draft.shipping.fullName}
              onChange={(event) => setShipping('fullName', event.target.value)}
            />
            <TextField
              required
              label="Phone Number"
              value={draft.shipping.phone}
              onChange={(event) => setShipping('phone', event.target.value)}
            />
            <TextField
              required
              label="Street Address"
              value={draft.shipping.street}
              onChange={(event) => setShipping('street', event.target.value)}
              sx={{ gridColumn: { xs: 'auto', md: '1 / span 2' } }}
            />
            <TextField
              label="Address Line 2 (Optional)"
              value={draft.shipping.addressLine2}
              onChange={(event) => setShipping('addressLine2', event.target.value)}
              sx={{ gridColumn: { xs: 'auto', md: '1 / span 2' } }}
            />
            <TextField
              required
              label="City"
              value={draft.shipping.city}
              onChange={(event) => setShipping('city', event.target.value)}
            />
            <TextField
              required
              label="State"
              value={draft.shipping.state}
              onChange={(event) => setShipping('state', event.target.value)}
            />
            <TextField
              required
              label="Postal Code"
              value={draft.shipping.postalCode}
              onChange={(event) => setShipping('postalCode', event.target.value)}
            />
            <TextField
              required
              label="Country"
              value={draft.shipping.country}
              onChange={(event) => setShipping('country', event.target.value)}
            />
          </Box>

          <Divider />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Default Billing Address
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={draft.billing.sameAsShipping}
                onChange={(event) => setBilling('sameAsShipping', event.target.checked)}
              />
            }
            label="Use shipping address as billing by default"
          />

          {!draft.billing.sameAsShipping && (
            <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
              <TextField
                required
                label="Billing Full Name"
                value={draft.billing.fullName}
                onChange={(event) => setBilling('fullName', event.target.value)}
              />
              <TextField
                required
                label="Billing Phone"
                value={draft.billing.phone}
                onChange={(event) => setBilling('phone', event.target.value)}
              />
              <TextField
                required
                label="Billing Street"
                value={draft.billing.street}
                onChange={(event) => setBilling('street', event.target.value)}
                sx={{ gridColumn: { xs: 'auto', md: '1 / span 2' } }}
              />
              <TextField
                label="Billing Address Line 2 (Optional)"
                value={draft.billing.addressLine2}
                onChange={(event) => setBilling('addressLine2', event.target.value)}
                sx={{ gridColumn: { xs: 'auto', md: '1 / span 2' } }}
              />
              <TextField
                required
                label="Billing City"
                value={draft.billing.city}
                onChange={(event) => setBilling('city', event.target.value)}
              />
              <TextField
                required
                label="Billing State"
                value={draft.billing.state}
                onChange={(event) => setBilling('state', event.target.value)}
              />
              <TextField
                required
                label="Billing Postal Code"
                value={draft.billing.postalCode}
                onChange={(event) => setBilling('postalCode', event.target.value)}
              />
              <TextField
                required
                label="Billing Country"
                value={draft.billing.country}
                onChange={(event) => setBilling('country', event.target.value)}
              />
            </Box>
          )}

          <Divider />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Tax / GST Defaults
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={draft.tax.businessPurchase}
                onChange={(event) => setTax('businessPurchase', event.target.checked)}
              />
            }
            label="Business purchase by default"
          />

          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
            <TextField
              label="Business Name"
              value={draft.tax.businessName}
              onChange={(event) => setTax('businessName', event.target.value)}
            />
            <TextField
              required={draft.tax.businessPurchase}
              label="GSTIN"
              value={draft.tax.gstin}
              onChange={(event) => setTax('gstin', event.target.value)}
            />
            <TextField
              label="PAN (Optional)"
              value={draft.tax.pan}
              onChange={(event) => setTax('pan', event.target.value)}
            />
            <TextField
              label="PO Number (Optional)"
              value={draft.tax.purchaseOrderNumber}
              onChange={(event) => setTax('purchaseOrderNumber', event.target.value)}
            />
            <TextField
              multiline
              minRows={2}
              label="Notes (Optional)"
              value={draft.tax.notes}
              onChange={(event) => setTax('notes', event.target.value)}
              sx={{ gridColumn: { xs: 'auto', md: '1 / span 2' } }}
            />
          </Box>

          <Stack direction="row">
            <Button
              type="submit"
              variant="contained"
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveOutlinedIcon />}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Billing Profile'}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default UserBillingProfileSettingsPage;
