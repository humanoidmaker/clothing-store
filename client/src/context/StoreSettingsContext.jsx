import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api';

const StoreSettingsContext = createContext(null);
const defaultStoreName = 'Astra Attire';
const defaultFooterText = 'Premium everyday clothing, delivered across India.';

const normalizeStoreName = (value) => String(value || '').trim() || defaultStoreName;
const normalizeFooterText = (value) => String(value || '').trim() || defaultFooterText;

export const StoreSettingsProvider = ({ children }) => {
  const [storeName, setStoreName] = useState(defaultStoreName);
  const [footerText, setFooterText] = useState(defaultFooterText);
  const [loading, setLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    try {
      const { data } = await api.get('/settings');
      setStoreName(normalizeStoreName(data?.storeName));
      setFooterText(normalizeFooterText(data?.footerText));
    } catch {
      setStoreName((current) => current || defaultStoreName);
      setFooterText((current) => current || defaultFooterText);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const updateStoreSettings = useCallback(async ({ storeName: nextStoreName, footerText: nextFooterText }) => {
    const payload = {};

    if (nextStoreName !== undefined) {
      payload.storeName = String(nextStoreName || '').trim();
    }

    if (nextFooterText !== undefined) {
      payload.footerText = String(nextFooterText || '').trim();
    }

    const { data } = await api.put('/settings', payload);
    const updatedStoreName = normalizeStoreName(data?.storeName);
    const updatedFooterText = normalizeFooterText(data?.footerText);

    setStoreName(updatedStoreName);
    setFooterText(updatedFooterText);

    return {
      storeName: updatedStoreName,
      footerText: updatedFooterText
    };
  }, []);

  const updateStoreName = useCallback(
    async (nextStoreName) => {
      const updated = await updateStoreSettings({ storeName: nextStoreName, footerText });
      return updated.storeName;
    },
    [updateStoreSettings, footerText]
  );

  const value = useMemo(
    () => ({
      storeName,
      footerText,
      loading,
      refreshSettings,
      updateStoreName,
      updateStoreSettings
    }),
    [storeName, footerText, loading, refreshSettings, updateStoreName, updateStoreSettings]
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
