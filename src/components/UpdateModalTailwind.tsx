import React from 'react';
import { Download, X, RefreshCw, Info } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  version: string;
  onDownload: () => void;
}

const PLATFORM = Capacitor.getPlatform();

export const UpdateModalTailwind: React.FC<UpdateModalProps> = ({ isOpen, onClose, version, onDownload }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-dark-bg rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100 dark:border-gray-800"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Blue Header with Icon */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 flex flex-col items-center text-center relative">
          <div className="relative p-3 bg-white/20 rounded-xl shadow-[0_4px_10px_-2px_rgba(255,255,255,0.2),inset_0_1px_2px_rgba(255,255,255,0.4)] border-b-2 border-white/30 overflow-hidden mb-3 backdrop-blur-md">
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
            <RefreshCw className="w-7 h-7 text-white animate-spin-slow relative z-10" />
          </div>
          <h2 className="text-lg font-black text-white uppercase tracking-tight">Yeni Güncelleme!</h2>
          <p className="text-blue-100 text-[0.6875rem] font-bold opacity-80 mt-1 uppercase tracking-widest">Versiyon v{version}</p>
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex items-start gap-3 bg-blue-50/50 dark:bg-blue-900/20 p-3.5 rounded-xl mb-5 border border-blue-100/50 dark:border-blue-800/30">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex flex-col gap-2">
              <p className="text-[0.6875rem] text-blue-900 dark:text-blue-100 leading-relaxed font-bold">
                Uygulamanın yeni sürümü hazır! En son özellikleri ve iyileştirmeleri almak için hemen güncelleyin.
              </p>
              <p className="text-[0.625rem] text-blue-600 dark:text-blue-400 font-black italic leading-tight uppercase tracking-tighter">
                {PLATFORM === 'ios' 
                  ? '* Güncellemek için .ipa uzantılı dosyayı indirip kurmanız yeterlidir.' 
                  : PLATFORM === 'android'
                  ? '* Güncellemek için .apk uzantılı dosyayı indirip kurmanız yeterlidir.'
                  : '* Sayfayı yenileyerek en güncel sürümü kullanmaya başlayabilirsiniz.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={onDownload}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-wider active:scale-[0.98] transition-all shadow-lg shadow-blue-600/20"
            >
              <Download className="w-4 h-4" />
              Şimdi İndir
            </button>
            
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-xl font-black text-xs uppercase tracking-wider active:scale-[0.98] transition-all border border-gray-100 dark:border-gray-700"
            >
              <X className="w-3 h-3" />
              Daha Sonra
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
