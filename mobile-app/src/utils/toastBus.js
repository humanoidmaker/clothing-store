const listeners = new Set();

export const emitToast = (toast) => {
  listeners.forEach((listener) => {
    try {
      listener(toast);
    } catch {
      // Ignore listener failures.
    }
  });
};

export const addToastListener = (listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
