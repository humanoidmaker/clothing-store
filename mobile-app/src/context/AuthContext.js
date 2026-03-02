import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import { getStorageItem, getStorageJson, removeStorageItem, setStorageItem, setStorageJson, STORAGE_KEYS } from '../api/storage';
import { normalizeText } from '../utils/format';

const AuthContext = createContext(null);
const DEFAULT_COUNTRY = 'India';

const normalizeAddress = (value = {}, fallback = {}) => ({
  fullName: normalizeText(value.fullName ?? fallback.fullName ?? ''),
  phone: normalizeText(value.phone ?? fallback.phone ?? ''),
  email: normalizeText(value.email ?? fallback.email ?? ''),
  street: normalizeText(value.street ?? fallback.street ?? ''),
  addressLine2: normalizeText(value.addressLine2 ?? fallback.addressLine2 ?? ''),
  city: normalizeText(value.city ?? fallback.city ?? ''),
  state: normalizeText(value.state ?? fallback.state ?? ''),
  postalCode: normalizeText(value.postalCode ?? fallback.postalCode ?? ''),
  country: normalizeText(value.country ?? fallback.country ?? DEFAULT_COUNTRY) || DEFAULT_COUNTRY
});

const normalizeTaxDetails = (value = {}) => ({
  businessPurchase: Boolean(value.businessPurchase),
  businessName: normalizeText(value.businessName || ''),
  gstin: normalizeText(value.gstin || ''),
  pan: normalizeText(value.pan || ''),
  purchaseOrderNumber: normalizeText(value.purchaseOrderNumber || ''),
  notes: normalizeText(value.notes || '')
});

const normalizeUser = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const baseUser = {
    _id: value._id,
    name: normalizeText(value.name || ''),
    email: normalizeText(value.email || ''),
    phone: normalizeText(value.phone || ''),
    isAdmin: Boolean(value.isAdmin),
    isResellerAdmin: Boolean(value.isResellerAdmin),
    resellerId: normalizeText(value.resellerId || '')
  };

  const shippingAddress = normalizeAddress(value.defaultShippingAddress || {}, {
    fullName: baseUser.name,
    email: baseUser.email,
    country: DEFAULT_COUNTRY
  });
  const billingSameAsShipping = value?.defaultBillingDetails?.sameAsShipping !== false;
  const billingAddress = billingSameAsShipping
    ? normalizeAddress(shippingAddress, shippingAddress)
    : normalizeAddress(value.defaultBillingDetails || {}, {
        email: shippingAddress.email,
        country: shippingAddress.country || DEFAULT_COUNTRY
      });

  return {
    ...baseUser,
    defaultShippingAddress: shippingAddress,
    defaultBillingDetails: {
      sameAsShipping: billingSameAsShipping,
      ...billingAddress
    },
    defaultTaxDetails: normalizeTaxDetails(value.defaultTaxDetails || {})
  };
};

const mapError = (error) =>
  error?.response?.data?.message || error?.message || 'Request failed. Please try again.';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistUser = useCallback(async (nextUser) => {
    const normalized = normalizeUser(nextUser);
    setUser(normalized);
    if (normalized) {
      await setStorageJson(STORAGE_KEYS.user, normalized);
    } else {
      await removeStorageItem(STORAGE_KEYS.user);
    }
    return normalized;
  }, []);

  const saveAuth = useCallback(
    async (authData) => {
      const authToken = normalizeText(authData?.token || '');
      setToken(authToken);
      if (authToken) {
        await setStorageItem(STORAGE_KEYS.token, authToken);
      } else {
        await removeStorageItem(STORAGE_KEYS.token);
      }
      await persistUser(authData);
    },
    [persistUser]
  );

  const clearAuth = useCallback(async () => {
    setToken('');
    setUser(null);
    await removeStorageItem(STORAGE_KEYS.token);
    await removeStorageItem(STORAGE_KEYS.user);
  }, []);

  const fetchProfile = useCallback(async () => {
    const storedToken = normalizeText(await getStorageItem(STORAGE_KEYS.token, ''));
    const storedUser = await getStorageJson(STORAGE_KEYS.user, null);

    setToken(storedToken);
    setUser(normalizeUser(storedUser));

    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get('/auth/me', { showErrorToast: false, showSuccessToast: false });
      await persistUser(data);
    } catch {
      await clearAuth();
    } finally {
      setLoading(false);
    }
  }, [clearAuth, persistUser]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const login = async (email, password, recaptchaToken = '') => {
    try {
      const { data } = await api.post('/auth/login', {
        email,
        password,
        recaptchaToken
      });
      await saveAuth(data);
      return data;
    } catch (error) {
      throw new Error(mapError(error));
    }
  };

  const register = async (name, email, password, recaptchaToken = '') => {
    try {
      const { data } = await api.post('/auth/register', {
        name,
        email,
        password,
        recaptchaToken
      });
      await saveAuth(data);
      return data;
    } catch (error) {
      throw new Error(mapError(error));
    }
  };

  const forgotPassword = async (email, recaptchaToken = '') => {
    try {
      const { data } = await api.post('/auth/forgot-password', {
        email,
        recaptchaToken
      });
      return data;
    } catch (error) {
      throw new Error(mapError(error));
    }
  };

  const resetPassword = async ({ email, token: resetToken, newPassword, recaptchaToken = '' }) => {
    try {
      const { data } = await api.post('/auth/reset-password', {
        email,
        token: resetToken,
        newPassword,
        recaptchaToken
      });
      return data;
    } catch (error) {
      throw new Error(mapError(error));
    }
  };

  const updateProfile = async (payload) => {
    try {
      const { data } = await api.put('/auth/me', payload);
      await persistUser(data);
      return data;
    } catch (error) {
      throw new Error(mapError(error));
    }
  };

  const logout = async () => {
    await clearAuth();
  };

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(user?._id),
      isAdmin: Boolean(user?.isAdmin),
      isResellerAdmin: Boolean(user?.isResellerAdmin),
      resellerId: normalizeText(user?.resellerId || ''),
      login,
      register,
      forgotPassword,
      resetPassword,
      updateProfile,
      fetchProfile,
      logout
    }),
    [token, user, loading, fetchProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
