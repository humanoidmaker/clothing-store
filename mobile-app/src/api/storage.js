import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  token: 'hm_mobile_token',
  user: 'hm_mobile_user',
  cart: 'hm_mobile_cart',
  wishlist: 'hm_mobile_wishlist'
};

export const getStorageItem = async (key, fallback = null) => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

export const setStorageItem = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    // Ignore storage errors.
  }
};

export const removeStorageItem = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // Ignore storage errors.
  }
};

export const getStorageJson = async (key, fallback = null) => {
  const raw = await getStorageItem(key, '');
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const setStorageJson = async (key, value) => setStorageItem(key, JSON.stringify(value));
