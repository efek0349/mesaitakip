import React, { useState, useEffect } from 'react';
import { toastEmitter, ToastMessage } from '../utils/toastUtils';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export const ToastTailwind: React.FC = () => {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let clearTimer: ReturnType<typeof setTimeout>;

    const unsubscribe = toastEmitter.subscribe((newToast) => {
      // Önceki zamanlayıcıları temizle
      clearTimeout(timer);
      clearTimeout(clearTimer);
      
      setToast(newToast);
      setIsVisible(true);
      
      if (!newToast.isPersistent) {
        timer = setTimeout(() => {
          setIsVisible(false);
          clearTimer = setTimeout(() => setToast(null), 300); // Animasyon sonrası temizle
        }, newToast.duration || 3000);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(timer);
      clearTimeout(clearTimer);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => setToast(null), 300);
  };

  if (!toast) return null;

  const getIcon = () => {
    if (toast.icon) return toast.icon;
    switch (toast.type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-white" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-white" />;
      case 'update': return <Info className="w-5 h-5 text-white" />;
      default: return <Info className="w-5 h-5 text-blue-500 dark:text-blue-400" />;
    }
  };

  const getBgColor = () => {
    switch (toast.type) {
      case 'success': return 'bg-emerald-600 dark:bg-emerald-600 border-emerald-500 text-white shadow-emerald-500/20';
      case 'error': return 'bg-red-600 dark:bg-red-600 border-red-500 text-white shadow-red-500/20';
      case 'update': return 'bg-blue-600 dark:bg-blue-600 border-blue-500 text-white shadow-blue-500/20';
      default: return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 shadow-xl';
    }
  };

  return (
    <div 
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95 pointer-events-none'
      }`}
    >
      <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border shadow-2xl min-w-[320px] max-w-[90vw] ${getBgColor()}`}>
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold leading-tight ${toast.type === 'success' || toast.type === 'error' || toast.type === 'update' ? 'text-white' : ''}`}>
            {toast.message}
          </p>
          {toast.action && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toast.action?.onClick();
                handleClose();
              }}
              className="mt-2 text-xs font-black uppercase tracking-widest bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        <button 
          onClick={handleClose} 
          className={`flex-shrink-0 p-1 rounded-full hover:bg-black/10 transition-colors ${toast.type === 'success' || toast.type === 'error' || toast.type === 'update' ? 'text-white/60' : 'text-gray-400'}`}
        >
          <X size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};
