import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { addToastListener, emitToast } from '../utils/toastBus';
import { palette, radii, spacing } from '../theme/colors';
import { Animated, StyleSheet, Text, View } from 'react-native';

const ToastContext = createContext({
  showToast: () => {}
});

const ToastViewport = ({ toast }) => {
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: toast ? 1 : 0,
      duration: 180,
      useNativeDriver: true
    }).start();
  }, [toast, opacity]);

  if (!toast) {
    return null;
  }

  const backgroundColor =
    toast.severity === 'success'
      ? palette.success
      : toast.severity === 'error'
        ? palette.danger
        : toast.severity === 'warning'
          ? palette.warning
          : palette.primary;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <Animated.View style={[styles.toast, { backgroundColor, opacity }]}>
        <Text style={styles.toastText}>{toast.message}</Text>
      </Animated.View>
    </View>
  );
};

export const ToastProvider = ({ children }) => {
  const [queue, setQueue] = useState([]);
  const [activeToast, setActiveToast] = useState(null);

  useEffect(() => {
    const unsubscribe = addToastListener((toast) => {
      if (!toast?.message) {
        return;
      }
      setQueue((current) => [...current, toast]);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (activeToast || queue.length === 0) {
      return;
    }

    const next = queue[0];
    setActiveToast(next);
    setQueue((current) => current.slice(1));

    const timeout = setTimeout(() => {
      setActiveToast(null);
    }, Number(next.duration || 3200));

    return () => clearTimeout(timeout);
  }, [activeToast, queue]);

  const value = useMemo(
    () => ({
      showToast: (message, severity = 'info', options = {}) => {
        if (typeof message === 'object' && message !== null) {
          emitToast(message);
          return;
        }
        emitToast({
          message,
          severity,
          duration: options.duration
        });
      }
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toast={activeToast} />
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    zIndex: 999
  },
  toast: {
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5
  },
  toastText: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600'
  }
});

export const useToast = () => useContext(ToastContext);
