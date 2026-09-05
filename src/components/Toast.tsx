import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  message: { text: string; type: 'success' | 'info' | 'error' } | null;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose }) => {
  if (!message) return null;

  const getStyle = () => {
    switch (message.type) {
      case 'success':
        return 'bg-emerald-800 text-white border-emerald-600';
      case 'error':
        return 'bg-rose-800 text-white border-rose-600';
      case 'info':
      default:
        return 'bg-slate-900 text-amber-300 border-slate-700';
    }
  };

  const getIcon = () => {
    switch (message.type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-amber-400 shrink-0" />;
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center pointer-events-none">
      <div
        className={`max-w-md w-full p-3.5 rounded-2xl shadow-xl border flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-auto ${getStyle()}`}
      >
        <div className="flex items-center gap-2.5">
          {getIcon()}
          <span className="text-sm font-black text-white">{message.text}</span>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
