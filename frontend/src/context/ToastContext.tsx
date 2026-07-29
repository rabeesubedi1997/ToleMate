import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-4 h-4 flex-shrink-0" />,
  error:   <XCircle    className="w-4 h-4 flex-shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 flex-shrink-0" />,
  info:    <Info       className="w-4 h-4 flex-shrink-0" />,
};

const COLORS: Record<ToastType, string> = {
  success: 'bg-green-600 text-white',
  error:   'bg-red-600 text-white',
  warning: 'bg-yellow-500 text-white',
  info:    'bg-primary-600 text-white',
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++counter.current;
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none" role="alert" aria-live="polite">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto animate-slide-up max-w-xs ${COLORS[t.type]}`}
          >
            {ICONS[t.type]}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="opacity-70 hover:opacity-100 transition-opacity ml-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
