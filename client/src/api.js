import axios from 'axios';
import { emitToast } from './utils/toastBus';

const MUTATION_METHODS = new Set(['post', 'put', 'patch', 'delete']);

const getDefaultSuccessMessage = (method) => {
  if (method === 'post') {
    return 'Submitted successfully.';
  }
  if (method === 'delete') {
    return 'Deleted successfully.';
  }
  return 'Updated successfully.';
};

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api'
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    const method = String(response?.config?.method || '').trim().toLowerCase();
    const isMutation = MUTATION_METHODS.has(method);

    if (isMutation && response?.config?.showSuccessToast !== false) {
      const explicitMessage = String(response?.config?.toastSuccessMessage || '').trim();
      const responseMessage = String(response?.data?.message || '').trim();
      const message = explicitMessage || responseMessage || getDefaultSuccessMessage(method);

      if (message) {
        emitToast({
          severity: 'success',
          message
        });
      }
    }

    return response;
  },
  (error) => {
    const method = String(error?.config?.method || '').trim().toLowerCase();
    const isMutation = MUTATION_METHODS.has(method);

    if (isMutation && error?.config?.showErrorToast !== false) {
      const message =
        String(error?.response?.data?.message || '').trim() ||
        String(error?.message || '').trim() ||
        'Request failed. Please try again.';

      emitToast({
        severity: 'error',
        message
      });
    }

    return Promise.reject(error);
  }
);

export default api;
