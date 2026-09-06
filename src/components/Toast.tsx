import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      id="toast-notification-container"
      className="fixed bottom-16 lg:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-lg border text-xs backdrop-blur-md transition-all animate-in slide-in-from-bottom-3 ${
            t.type === 'success'
              ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900'
              : t.type === 'warning'
              ? 'bg-amber-50/95 border-amber-200 text-amber-900'
              : t.type === 'error'
              ? 'bg-rose-50/95 border-rose-200 text-rose-900'
              : 'bg-sky-50/95 border-sky-200 text-sky-900'
          }`}
        >
          {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
          {t.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
          {t.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
          {t.type === 'info' && <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />}

          <div className="flex-1 font-medium leading-relaxed">{t.message}</div>

          <button
            onClick={() => onDismiss(t.id)}
            className="text-stone-400 hover:text-stone-700 p-0.5 rounded transition"
            aria-label="Fermer la notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
