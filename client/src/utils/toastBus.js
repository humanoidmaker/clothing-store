let listeners = new Set();
let toastIdCounter = 0;

export const emitToast = (toast = {}) => {
  const message = String(toast?.message || '').trim();
  if (!message) {
    return;
  }

  toastIdCounter += 1;
  const payload = {
    id: toastIdCounter,
    severity: toast?.severity || 'info',
    duration: Number(toast?.duration || 0) > 0 ? Number(toast.duration) : 3500,
    message
  };

  listeners.forEach((listener) => listener(payload));
};

export const addToastListener = (listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
