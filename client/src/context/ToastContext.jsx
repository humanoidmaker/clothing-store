import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { addToastListener, emitToast } from '../utils/toastBus';

const ToastContext = createContext({
  showToast: () => {}
});

export const ToastProvider = ({ children }) => {
  const [queue, setQueue] = useState([]);
  const [activeToast, setActiveToast] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = addToastListener((toast) => {
      setQueue((current) => [...current, toast]);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!activeToast && queue.length > 0) {
      setActiveToast(queue[0]);
      setQueue((current) => current.slice(1));
      setOpen(true);
    }
  }, [activeToast, queue]);

  const showToast = useCallback((message, severity = 'info', options = {}) => {
    if (typeof message === 'object' && message !== null) {
      emitToast(message);
      return;
    }

    emitToast({
      message,
      severity,
      duration: options.duration
    });
  }, []);

  const handleClose = (_, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  const handleExited = () => {
    setActiveToast(null);
  };

  const contextValue = useMemo(
    () => ({
      showToast
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <Snackbar
        open={open}
        onClose={handleClose}
        autoHideDuration={activeToast?.duration || 3500}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        TransitionProps={{ onExited: handleExited }}
      >
        <Alert
          onClose={handleClose}
          severity={activeToast?.severity || 'info'}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {activeToast?.message || ''}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
