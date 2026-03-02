import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const StoreSettingsContext = createContext(null);
const defaultStoreName = 'Clothing Store';
const defaultFooterText = 'Premium everyday clothing, delivered across India.';
const defaultShowOutOfStockProducts = false;
const defaultThemeSettings = {
  primaryColor: '#1b3557',
  secondaryColor: '#b54d66',
  backgroundDefault: '#f6f3ef',
  backgroundPaper: '#ffffff',
  textPrimary: '#1d2230',
  textSecondary: '#5e6472',
  bodyFontFamily: 'Manrope',
  headingFontFamily: 'Playfair Display'
};

const normalizeStoreName = (value) => String(value || '').trim() || defaultStoreName;
const normalizeFooterText = (value) => String(value || '').trim() || defaultFooterText;

const normalizeThemeSettings = (theme = {}) => ({
  primaryColor: String(theme.primaryColor || '').trim() || defaultThemeSettings.primaryColor,
  secondaryColor: String(theme.secondaryColor || '').trim() || defaultThemeSettings.secondaryColor,
  backgroundDefault: String(theme.backgroundDefault || '').trim() || defaultThemeSettings.backgroundDefault,
  backgroundPaper: String(theme.backgroundPaper || '').trim() || defaultThemeSettings.backgroundPaper,
  textPrimary: String(theme.textPrimary || '').trim() || defaultThemeSettings.textPrimary,
  textSecondary: String(theme.textSecondary || '').trim() || defaultThemeSettings.textSecondary,
  bodyFontFamily: String(theme.bodyFontFamily || '').trim() || defaultThemeSettings.bodyFontFamily,
  headingFontFamily: String(theme.headingFontFamily || '').trim() || defaultThemeSettings.headingFontFamily
});

export const StoreSettingsProvider = ({ children }) => {
  const [storeName, setStoreName] = useState(defaultStoreName);
  const [footerText, setFooterText] = useState(defaultFooterText);
  const [showOutOfStockProducts, setShowOutOfStockProducts] = useState(defaultShowOutOfStockProducts);
  const [themeSettings, setThemeSettings] = useState(defaultThemeSettings);
  const [authSecuritySettings, setAuthSecuritySettings] = useState({
    recaptcha: {
      enabled: false,
      siteKey: ''
    }
  });
  const [resellerContext, setResellerContext] = useState(null);
  const [loading, setLoading] = useState(true);

  const applySettings = useCallback((data) => {
    const nextStoreName = normalizeStoreName(data?.storeName);
    const nextFooterText = normalizeFooterText(data?.footerText);

    setStoreName(nextStoreName);
    setFooterText(nextFooterText);
    setShowOutOfStockProducts(
      typeof data?.showOutOfStockProducts === 'boolean'
        ? data.showOutOfStockProducts
        : defaultShowOutOfStockProducts
    );
    setThemeSettings(normalizeThemeSettings(data?.theme || {}));
    setAuthSecuritySettings({
      recaptcha: {
        enabled: Boolean(data?.authSecurity?.recaptcha?.enabled),
        siteKey: String(data?.authSecurity?.recaptcha?.siteKey || '').trim()
      }
    });
    setResellerContext(data?.reseller || null);

    return {
      storeName: nextStoreName,
      footerText: nextFooterText
    };
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const { data } = await api.get('/settings', { showSuccessToast: false, showErrorToast: false });
      applySettings(data);
    } finally {
      setLoading(false);
    }
  }, [applySettings]);

  useEffect(() => {
    void refreshSettings();
  }, [refreshSettings]);

  const updateStoreSettings = useCallback(
    async (payload = {}) => {
      const { data } = await api.put('/settings', payload);
      applySettings(data);
      return data;
    },
    [applySettings]
  );

  const value = useMemo(
    () => ({
      storeName,
      footerText,
      showOutOfStockProducts,
      themeSettings,
      authSecuritySettings,
      resellerContext,
      loading,
      refreshSettings,
      updateStoreSettings
    }),
    [
      storeName,
      footerText,
      showOutOfStockProducts,
      themeSettings,
      authSecuritySettings,
      resellerContext,
      loading,
      refreshSettings,
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
