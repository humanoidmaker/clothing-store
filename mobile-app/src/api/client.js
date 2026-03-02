import axios from 'axios';
import { getStorageItem, STORAGE_KEYS } from './storage';
import { emitToast } from '../utils/toastBus';

const mutationMethods = new Set(['post', 'put', 'patch', 'delete']);

const getDefaultSuccessMessage = (method) => {
  if (method === 'post') {
    return 'Submitted successfully.';
  }
  if (method === 'delete') {
    return 'Deleted successfully.';
  }
  return 'Updated successfully.';
};

const resolveApiBase = () => {
  const envBase = String(process.env.EXPO_PUBLIC_API_URL || '').trim();
  if (envBase) {
    return envBase;
  }
  return 'http://localhost:3000/api';
};

const api = axios.create({
  baseURL: resolveApiBase(),
  timeout: 20000
});

api.interceptors.request.use(async (config) => {
  const token = await getStorageItem(STORAGE_KEYS.token, '');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const method = String(response?.config?.method || '').trim().toLowerCase();
    if (mutationMethods.has(method) && response?.config?.showSuccessToast !== false) {
      const explicit = String(response?.config?.toastSuccessMessage || '').trim();
      const responseMessage = String(response?.data?.message || '').trim();
      emitToast({
        severity: 'success',
        message: explicit || responseMessage || getDefaultSuccessMessage(method)
      });
    }
    return response;
  },
  (error) => {
    const method = String(error?.config?.method || '').trim().toLowerCase();
    if (mutationMethods.has(method) && error?.config?.showErrorToast !== false) {
      const message =
        String(error?.response?.data?.message || '').trim() ||
        String(error?.message || '').trim() ||
        'Request failed. Please try again.';
      emitToast({ severity: 'error', message });
    }

    return Promise.reject(error);
  }
);

export default api;
