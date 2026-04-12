import React, { useState, useEffect } from 'react';
import { toastEmitter, ToastMessage } from '../utils/toastUtils';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = toastEmitter.subscribe((newToast) => {
      setToast(newToast);
      setIsVisible(true);
      
      if (!newToast.isPersistent) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          setTimeout(() => setToast(null), 300); // Wait for fade out
        }, newToast.duration || 3000);
        return () => clearTimeout(timer);
      }
    });

    return unsubscribe;
  }, []);

  if (!toast) return null;

  const getIcon = () => {
    if (toast.icon) return toast.icon;
    switch (toast.type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-white" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-white" />;
      case 'update': return <Info className="w-5 h-5 text-white" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
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
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) transform ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95 pointer-events-none'
      }`}
    >
      <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border shadow-2xl min-w-[320px] max-w-[90vw] ${getBgColor()}`}>
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold leading-tight ${toast.type === 'info' ? '' : 'text-white'}`}>
            {toast.message}
          </p>
          {toast.action && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toast.action?.onClick();
                setIsVisible(false);
              }}
              className="mt-2 text-xs font-black uppercase tracking-widest bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              {toast.action.label}
            </button>
          )}
        </div>

        <button 
          onClick={() => setIsVisible(false)} 
          className={`flex-shrink-0 p-1 rounded-full hover:bg-black/10 transition-colors ${toast.type === 'info' ? 'text-gray-400' : 'text-white/60'}`}
        >
          <X size={18} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};
