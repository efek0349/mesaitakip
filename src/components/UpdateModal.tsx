import React from 'react';
import { Download, X, RefreshCw, Info } from 'lucide-react';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  version: string;
  onDownload: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, onClose, version, onDownload }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
      <div className="bg-white dark:bg-dark-bg rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Blue Header with Icon */}
        <div className="bg-blue-600 p-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
            <RefreshCw className="w-8 h-8 text-white animate-spin-slow" />
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Yeni Güncelleme!</h2>
          <p className="text-blue-100 text-sm font-medium mt-1">Versiyon v{version}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-6">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed font-medium">
              Uygulamanın yeni sürümü hazır. En son özellikleri ve iyileştirmeleri almak için hemen güncelleyin.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={onDownload}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-xl font-black text-sm uppercase tracking-wider active:scale-[0.98] transition-all shadow-lg shadow-blue-600/20"
            >
              <Download className="w-5 h-5" />
              Şimdi İndir
            </button>
            
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl font-bold text-sm uppercase tracking-wider active:scale-[0.98] transition-all"
            >
              <X className="w-4 h-4" />
              Daha Sonra
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
