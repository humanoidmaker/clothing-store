import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api';
import { defaultThemeSettings, normalizeThemeSettings } from '../theme';

const StoreSettingsContext = createContext(null);
const defaultStoreName = 'Astra Attire';
const defaultFooterText = 'Premium everyday clothing, delivered across India.';

const normalizeStoreName = (value) => String(value || '').trim() || defaultStoreName;
const normalizeFooterText = (value) => String(value || '').trim() || defaultFooterText;
const normalizeRazorpaySettings = (value = {}) => ({
  keyId: String(value.keyId || '').trim(),
  keySecretConfigured: Boolean(value.keySecretConfigured)
});

export const StoreSettingsProvider = ({ children }) => {
  const [storeName, setStoreName] = useState(defaultStoreName);
  const [footerText, setFooterText] = useState(defaultFooterText);
  const [themeSettings, setThemeSettings] = useState(defaultThemeSettings);
  const [loading, setLoading] = useState(true);

  const applySettingsFromResponse = useCallback((data) => {
    const nextStoreName = normalizeStoreName(data?.storeName);
    const nextFooterText = normalizeFooterText(data?.footerText);
    const nextThemeSettings = normalizeThemeSettings(data?.theme || {});

    setStoreName(nextStoreName);
    setFooterText(nextFooterText);
    setThemeSettings(nextThemeSettings);

    return {
      storeName: nextStoreName,
      footerText: nextFooterText,
      theme: nextThemeSettings,
      razorpay: normalizeRazorpaySettings(data?.razorpay || {})
    };
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const { data } = await api.get('/settings');
      applySettingsFromResponse(data);
    } catch {
      setStoreName((current) => current || defaultStoreName);
      setFooterText((current) => current || defaultFooterText);
      setThemeSettings((current) => normalizeThemeSettings(current || defaultThemeSettings));
    } finally {
      setLoading(false);
    }
  }, [applySettingsFromResponse]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const updateStoreSettings = useCallback(
    async ({
      storeName: nextStoreName,
      footerText: nextFooterText,
      theme: nextTheme,
      razorpay: nextRazorpay
    } = {}) => {
      const payload = {};

      if (nextStoreName !== undefined) {
        payload.storeName = String(nextStoreName || '').trim();
      }

      if (nextFooterText !== undefined) {
        payload.footerText = String(nextFooterText || '').trim();
      }

      if (nextTheme !== undefined) {
        payload.theme = normalizeThemeSettings(nextTheme);
      }

      if (nextRazorpay !== undefined) {
        payload.razorpay = {};

        if (Object.prototype.hasOwnProperty.call(nextRazorpay || {}, 'keyId')) {
          payload.razorpay.keyId = String(nextRazorpay.keyId || '').trim();
        }
        if (Object.prototype.hasOwnProperty.call(nextRazorpay || {}, 'keySecret')) {
          payload.razorpay.keySecret = String(nextRazorpay.keySecret || '');
        }

        if (Object.keys(payload.razorpay).length === 0) {
          delete payload.razorpay;
        }
      }

      const { data } = await api.put('/settings', payload);
      return applySettingsFromResponse(data);
    },
    [applySettingsFromResponse]
  );

  const updateStoreName = useCallback(
    async (nextStoreName) => {
      const updated = await updateStoreSettings({ storeName: nextStoreName });
      return updated.storeName;
    },
    [updateStoreSettings]
  );

  const value = useMemo(
    () => ({
      storeName,
      footerText,
      themeSettings,
      loading,
      refreshSettings,
      updateStoreName,
      updateStoreSettings
    }),
    [storeName, footerText, themeSettings, loading, refreshSettings, updateStoreName, updateStoreSettings]
  );

  return <StoreSettingsContext.Provider value={value}>{children}</StoreSettingsContext.Provider>;
};

export const useStoreSettings = () => {
  const context = useContext(StoreSettingsContext);
  if (!context) {
    throw new Error('useStoreSettings must be used within StoreSettingsProvider');
  }

  return context;
};
