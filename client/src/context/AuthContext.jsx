import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);
const DEFAULT_COUNTRY = 'India';

const normalizeString = (value) => String(value || '').trim();

const normalizeAddress = (value = {}, fallback = {}) => ({
  fullName: normalizeString(value.fullName ?? fallback.fullName ?? ''),
  phone: normalizeString(value.phone ?? fallback.phone ?? ''),
  email: normalizeString(value.email ?? fallback.email ?? ''),
  street: normalizeString(value.street ?? fallback.street ?? ''),
  addressLine2: normalizeString(value.addressLine2 ?? fallback.addressLine2 ?? ''),
  city: normalizeString(value.city ?? fallback.city ?? ''),
  state: normalizeString(value.state ?? fallback.state ?? ''),
  postalCode: normalizeString(value.postalCode ?? fallback.postalCode ?? ''),
  country: normalizeString(value.country ?? fallback.country ?? DEFAULT_COUNTRY) || DEFAULT_COUNTRY
});

const normalizeTaxDetails = (value = {}) => ({
  businessPurchase: Boolean(value.businessPurchase),
  businessName: normalizeString(value.businessName || ''),
  gstin: normalizeString(value.gstin || ''),
  pan: normalizeString(value.pan || ''),
  purchaseOrderNumber: normalizeString(value.purchaseOrderNumber || ''),
  notes: normalizeString(value.notes || '')
});

const normalizeUser = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const baseUser = {
    _id: value._id,
    name: normalizeString(value.name || ''),
    email: normalizeString(value.email || ''),
    phone: normalizeString(value.phone || ''),
    isAdmin: Boolean(value.isAdmin)
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

const parseUser = () => {
  const raw = localStorage.getItem('user');
  if (!raw) return null;

  try {
    return normalizeUser(JSON.parse(raw));
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

const mapError = (error) => error.response?.data?.message || 'Request failed';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(parseUser);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')));

  const persistUser = useCallback((value) => {
    const normalized = normalizeUser(value);
    if (!normalized) {
      return null;
    }
    localStorage.setItem('user', JSON.stringify(normalized));
    setUser(normalized);
    return normalized;
  }, []);

  const saveAuth = (authData) => {
    localStorage.setItem('token', authData.token);
    setToken(authData.token);
    persistUser(authData);
  };

  const clearAuth = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const fetchProfile = useCallback(async () => {
    if (!localStorage.getItem('token')) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await api.get('/auth/me');
      persistUser(data);
    } catch {
      clearAuth();
    } finally {
      setLoading(false);
    }
  }, [persistUser]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password }).catch((error) => {
      throw new Error(mapError(error));
    });

    saveAuth(data);
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password }).catch((error) => {
      throw new Error(mapError(error));
    });

    saveAuth(data);
    return data;
  };

  const updateProfile = async (payload) => {
    const { data } = await api.put('/auth/me', payload).catch((error) => {
      throw new Error(mapError(error));
    });

    persistUser(data);
    return data;
  };

  const logout = () => {
    clearAuth();
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: Boolean(user?.isAdmin),
      login,
      register,
      updateProfile,
      logout
    }),
    [user, token, loading]
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
