import { useState, useEffect, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

const ToastItem = ({ id, message, type = 'info', onDismiss }) => {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => onDismiss(id), 3000);
    return () => clearTimeout(timer);
  }, [id, paused, onDismiss]);

  return (
    <div
      className={`toast toast--${type}`}
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span className="toast__message">{message}</span>
      <button className="toast__close" onClick={() => onDismiss(id)} aria-label="Dismiss notification" type="button">
        ×
      </button>
      <div className="toast__progress" style={{ animationPlayState: paused ? 'paused' : 'running' }} />
    </div>
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <ToastItem key={t.id} {...t} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
