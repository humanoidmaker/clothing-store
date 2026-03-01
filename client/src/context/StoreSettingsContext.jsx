import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api';
import { defaultThemeSettings, normalizeThemeSettings } from '../theme';

const StoreSettingsContext = createContext(null);
const defaultStoreName = 'Clothing Store';
const defaultFooterText = 'Premium everyday clothing, delivered across India.';
const defaultShowOutOfStockProducts = false;
const defaultAuthSecuritySettings = {
  recaptcha: {
    enabled: false,
    siteKey: ''
  }
};

const normalizeStoreName = (value) => String(value || '').trim() || defaultStoreName;
const normalizeFooterText = (value) => String(value || '').trim() || defaultFooterText;

export const StoreSettingsProvider = ({ children }) => {
  const [storeName, setStoreName] = useState(defaultStoreName);
  const [footerText, setFooterText] = useState(defaultFooterText);
  const [showOutOfStockProducts, setShowOutOfStockProducts] = useState(defaultShowOutOfStockProducts);
  const [authSecuritySettings, setAuthSecuritySettings] = useState(defaultAuthSecuritySettings);
  const [themeSettings, setThemeSettings] = useState(defaultThemeSettings);
  const [loading, setLoading] = useState(true);

  const applySettingsFromResponse = useCallback((data) => {
    const nextStoreName = normalizeStoreName(data?.storeName);
    const nextFooterText = normalizeFooterText(data?.footerText);
    const nextShowOutOfStockProducts =
      typeof data?.showOutOfStockProducts === 'boolean'
        ? data.showOutOfStockProducts
        : defaultShowOutOfStockProducts;
    const nextAuthSecuritySettings = {
      recaptcha: {
        enabled: Boolean(data?.authSecurity?.recaptcha?.enabled),
        siteKey: String(data?.authSecurity?.recaptcha?.siteKey || '').trim()
      }
    };
    const nextThemeSettings = normalizeThemeSettings(data?.theme || {});

    setStoreName(nextStoreName);
    setFooterText(nextFooterText);
    setShowOutOfStockProducts(nextShowOutOfStockProducts);
    setAuthSecuritySettings(nextAuthSecuritySettings);
    setThemeSettings(nextThemeSettings);

    return {
      storeName: nextStoreName,
      footerText: nextFooterText,
      showOutOfStockProducts: nextShowOutOfStockProducts,
      authSecurity: nextAuthSecuritySettings,
      theme: nextThemeSettings
    };
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const { data } = await api.get('/settings');
      applySettingsFromResponse(data);
    } catch {
      setStoreName((current) => current || defaultStoreName);
      setFooterText((current) => current || defaultFooterText);
      setShowOutOfStockProducts((current) =>
        typeof current === 'boolean' ? current : defaultShowOutOfStockProducts
      );
      setAuthSecuritySettings((current) =>
        current && typeof current === 'object' ? current : defaultAuthSecuritySettings
      );
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
      showOutOfStockProducts: nextShowOutOfStockProducts,
      authSecurity: nextAuthSecurity,
      theme: nextTheme
    } = {}) => {
      const payload = {};

      if (nextStoreName !== undefined) {
        payload.storeName = String(nextStoreName || '').trim();
      }

      if (nextFooterText !== undefined) {
        payload.footerText = String(nextFooterText || '').trim();
      }

      if (nextShowOutOfStockProducts !== undefined) {
        payload.showOutOfStockProducts = Boolean(nextShowOutOfStockProducts);
      }

      if (nextAuthSecurity !== undefined && nextAuthSecurity && typeof nextAuthSecurity === 'object') {
        payload.authSecurity = nextAuthSecurity;
      }

      if (nextTheme !== undefined) {
        payload.theme = normalizeThemeSettings(nextTheme);
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
      showOutOfStockProducts,
      authSecuritySettings,
      themeSettings,
      loading,
      refreshSettings,
      updateStoreName,
      updateStoreSettings
    }),
    [
      storeName,
      footerText,
      showOutOfStockProducts,
      authSecuritySettings,
      themeSettings,
      loading,
      refreshSettings,
      updateStoreName,
      updateStoreSettings
    ]
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

