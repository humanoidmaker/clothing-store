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
const defaultHomepageStyleDeskBar = {
  enabled: true,
  title: 'STYLE DESK',
  subtitle: 'New drops weekly • curated for compact browsing',
  backgroundColor: '#ffffff',
  accentColor: '#b54d66',
  titleColor: '#1d2230',
  subtitleColor: '#5e6472'
};
const defaultHomepageBannerSlider = {
  enabled: false,
  banners: []
};

const normalizeStoreName = (value) => String(value || '').trim() || defaultStoreName;
const normalizeFooterText = (value) => String(value || '').trim() || defaultFooterText;
const hexColorPattern = /^#([0-9a-fA-F]{6})$/;
const normalizeHexColor = (value, fallback) => {
  const normalized = String(value || '').trim();
  if (!hexColorPattern.test(normalized)) return fallback;
  return normalized;
};
const normalizeHomepageStyleDeskBar = (value = {}) => {
  const source = value && typeof value === 'object' ? value : {};
  return {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : defaultHomepageStyleDeskBar.enabled,
    title: String(source.title || '').trim() || defaultHomepageStyleDeskBar.title,
    subtitle: String(source.subtitle || '').trim() || defaultHomepageStyleDeskBar.subtitle,
    backgroundColor: normalizeHexColor(source.backgroundColor, defaultHomepageStyleDeskBar.backgroundColor),
    accentColor: normalizeHexColor(source.accentColor, defaultHomepageStyleDeskBar.accentColor),
    titleColor: normalizeHexColor(source.titleColor, defaultHomepageStyleDeskBar.titleColor),
    subtitleColor: normalizeHexColor(source.subtitleColor, defaultHomepageStyleDeskBar.subtitleColor)
  };
};
const normalizeBannerSlider = (value = {}) => {
  const source = value && typeof value === 'object' ? value : {};
  const banners = Array.isArray(source.banners) ? source.banners : [];

  return {
    enabled: Boolean(source.enabled),
    banners: banners
      .map((entry, index) => {
        const item = entry && typeof entry === 'object' ? entry : {};
        const desktopImage = String(item.desktopImage || '').trim();
        const mobileImage = String(item.mobileImage || '').trim();
        if (!desktopImage || !mobileImage) return null;

        return {
          id: String(item.id || '').trim() || `banner-${index + 1}`,
          desktopImage,
          mobileImage,
          altText: String(item.altText || '').trim(),
          linkUrl: String(item.linkUrl || '').trim()
        };
      })
      .filter(Boolean)
  };
};

export const StoreSettingsProvider = ({ children }) => {
  const [storeName, setStoreName] = useState(defaultStoreName);
  const [footerText, setFooterText] = useState(defaultFooterText);
  const [showOutOfStockProducts, setShowOutOfStockProducts] = useState(defaultShowOutOfStockProducts);
  const [authSecuritySettings, setAuthSecuritySettings] = useState(defaultAuthSecuritySettings);
  const [themeSettings, setThemeSettings] = useState(defaultThemeSettings);
  const [homepageStyleDeskBar, setHomepageStyleDeskBar] = useState(defaultHomepageStyleDeskBar);
  const [homepageBannerSlider, setHomepageBannerSlider] = useState(defaultHomepageBannerSlider);
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
    const nextHomepageStyleDeskBar = normalizeHomepageStyleDeskBar(data?.homepageStyleDeskBar || {});
    const nextHomepageBannerSlider = normalizeBannerSlider(data?.homepageBannerSlider || {});

    setStoreName(nextStoreName);
    setFooterText(nextFooterText);
    setShowOutOfStockProducts(nextShowOutOfStockProducts);
    setAuthSecuritySettings(nextAuthSecuritySettings);
    setThemeSettings(nextThemeSettings);
    setHomepageStyleDeskBar(nextHomepageStyleDeskBar);
    setHomepageBannerSlider(nextHomepageBannerSlider);

    return {
      storeName: nextStoreName,
      footerText: nextFooterText,
      showOutOfStockProducts: nextShowOutOfStockProducts,
      authSecurity: nextAuthSecuritySettings,
      theme: nextThemeSettings,
      homepageStyleDeskBar: nextHomepageStyleDeskBar,
      homepageBannerSlider: nextHomepageBannerSlider
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
      setHomepageStyleDeskBar((current) => normalizeHomepageStyleDeskBar(current || defaultHomepageStyleDeskBar));
      setHomepageBannerSlider((current) => normalizeBannerSlider(current || defaultHomepageBannerSlider));
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
      theme: nextTheme,
      homepageStyleDeskBar: nextHomepageStyleDeskBar,
      homepageBannerSlider: nextHomepageBannerSlider
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

      if (nextHomepageStyleDeskBar !== undefined) {
        payload.homepageStyleDeskBar = normalizeHomepageStyleDeskBar(nextHomepageStyleDeskBar);
      }

      if (nextHomepageBannerSlider !== undefined) {
        payload.homepageBannerSlider = normalizeBannerSlider(nextHomepageBannerSlider);
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
      homepageStyleDeskBar,
      homepageBannerSlider,
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
      homepageStyleDeskBar,
      homepageBannerSlider,
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

