import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Toast, ToastType } from '@/types';

interface ToastContextValue {
  toasts: Toast[];
  addToast: (type: ToastType, title: string, description?: string) => void;
  removeToast: (id: string) => void;
}

const STORAGE_KEY = 'taskforge_toasts';

function getSavedToasts(): Toast[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Toast[]) : [];
  } catch {
    return [];
  }
}

function saveToasts(toasts: Toast[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toasts));
  } catch {
    // Ignore write failures (e.g. quota).
  }
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>(() => getSavedToasts());

  useEffect(() => {
    saveToasts(toasts);
  }, [toasts]);

  const addToast = useCallback((type: ToastType, title: string, description?: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => removeToast(id), 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return <ToastContext.Provider value={{ toasts, addToast, removeToast }}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

/** Icon mapped by toast type, using only lucide-react (bundled with the app). */
export function ToastIcon({ type }: { type: ToastType }) {
  switch (type) {
    case 'success':
      return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'error':
      return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 9v4.5M12 12.75c2.06 0 3.75 1.69 3.75 3.75S14.06 20.25 12 20.25S8.25 18.56 8.25 16.5S10.19 12.75 12 12.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case 'warning':
      return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 9v4.5M12 12.75c2.06 0 3.75 1.69 3.75 3.75S14.06 20.25 12 20.25S8.25 18.56 8.25 16.5S10.19 12.75 12 12.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
    case 'info':
    default:
      return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 8.25v8.25M12 3.75v8.25M3.75 12h8.25M12 12h8.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
  }
}

export function Toaster({ position = 'bottom-right' }: { position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' }) {
  const { toasts, removeToast } = useToast();

  const positionClass =
    position === 'bottom-left' ? 'bottom-4 left-4' :
    position === 'top-left' ? 'top-4 left-4' :
    position === 'top-right' ? 'top-4 right-4' :
    'bottom-4 right-4';

  return (
    <div className={`fixed z-50 flex flex-col gap-2 px-4 sm:px-6 py-4 ${positionClass}`} role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-3 rounded-lg border border-border bg-card shadow-sm py-2.5 pr-4 pl-3 max-w-sm w-full animate-in slide-in-from-right fade-in duration-200"
        >
          <div className="flex-shrink-0">
            <ToastIcon type={toast.type} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{toast.title}</p>
            {toast.description && <p className="text-sm text-muted-foreground mt-0.5 truncate">{toast.description}</p>}
          </div>
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 rounded p-0.5 transition-colors hover:bg-muted-foreground/10"
            aria-label="Dismiss"
          >
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 text-muted-foreground" aria-hidden="true">
              <path d="M4 4.5L11.5 11.5M11.5 4.5L4 11.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
