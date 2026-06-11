import React from 'react';
import { Download, Settings, Share2, Trash2, AlertTriangle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface ActionIconsProps {
  onOpenDataBackup: () => void;
  onOpenSettings: () => void;
  onShareMonthlyStats: () => void;
  onClearMonthlyStats: () => void;
  onOpenBilgi: () => void;
  canShare: boolean;
  canClear: boolean;
  className?: string;
}

export const ActionIcons: React.FC<ActionIconsProps> = React.memo(({
  onOpenDataBackup,
  onOpenSettings,
  onShareMonthlyStats,
  onClearMonthlyStats,
  onOpenBilgi,
  canShare,
  canClear,
  className
}) => {
  const isShareAvailable = Capacitor.isNativePlatform() || !!navigator.share;

// Ortak kare buton sınıfı (köşeleri biraz kırdım ama daha kare/keskin bir görünüm için 'rounded-lg' yaptım)
  const buttonClass = "group relative flex items-center justify-center p-2.5 rounded-lg border-b-4 active:border-b-0 active:translate-y-1 transition-all overflow-hidden";

  return (
    <div className={`flex items-center justify-end gap-2.5 ${className}`}>      

      {/* Maaş Ayarları */}
      <button 
        onClick={onOpenSettings} 
        className="group relative flex items-center justify-center p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-[0_4px_10px_-2px_rgba(59,130,246,0.5),inset_0_1px_2px_rgba(255,255,255,0.4)] border-b-2 border-blue-800 active:translate-y-0.5 active:border-b-0 active:scale-95 transition-all overflow-hidden" 
        aria-label="Ayarlar"
      >
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
        <Settings className="w-5 h-5 relative z-10 group-hover:rotate-45 transition-transform duration-300" />
      </button>

      {/* Yedekle */}
      <button 
        onClick={onOpenDataBackup} 
        className="group relative flex items-center justify-center p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_4px_10px_-2px_rgba(16,185,129,0.5),inset_0_1px_2px_rgba(255,255,255,0.4)] border-b-2 border-emerald-800 active:translate-y-0.5 active:border-b-0 active:scale-95 transition-all overflow-hidden" 
        aria-label="Veri Yedekle"
      >
        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
        <Download className="w-5 h-5 relative z-10 group-active:translate-y-1 transition-transform" />
      </button>

      {/* Paylaş (native mobil ve web mobil) */}
      {isShareAvailable && (
        <button 
          onClick={() => canShare && onShareMonthlyStats()} 
          disabled={!canShare}
          className={`group relative flex items-center justify-center p-2.5 rounded-xl transition-all overflow-hidden ${
            canShare 
              ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-[0_4px_10px_-2px_rgba(79,70,229,0.5),inset_0_1px_2px_rgba(255,255,255,0.4)] border-b-2 border-indigo-800 active:translate-y-0.5 active:border-b-0 active:scale-95' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 opacity-40 cursor-not-allowed border-b-2 border-gray-300 dark:border-gray-900'
          }`}
          aria-label="Aylık Raporu Paylaş"
        >
          {canShare && <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />}
          <Share2 className="w-5 h-5 relative z-10 group-active:scale-90 transition-transform" />
        </button>
      )}

      {/* Sil */}
      <button 
        onClick={() => canClear && onClearMonthlyStats()} 
        disabled={!canClear}
        className={`group relative flex items-center justify-center p-2.5 rounded-xl transition-all overflow-hidden ${
          canClear 
            ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[0_4px_10px_-2px_rgba(239,68,68,0.5),inset_0_1px_2px_rgba(255,255,255,0.4)] border-b-2 border-red-800 active:translate-y-0.5 active:border-b-0 active:scale-95' 
            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 opacity-40 cursor-not-allowed border-b-2 border-gray-300 dark:border-gray-900'
        }`}
        aria-label="Aylık Verileri Sil"
      >
        {canClear && <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />}
        <Trash2 className="w-5 h-5 relative z-10 group-active:scale-110 transition-transform" />
      </button>

      {/* Bilgi ve Duyurular */}
      <button 
        onClick={onOpenBilgi} 
        className={`${buttonClass} bg-gradient-to-br from-gray-700 to-gray-900 border-gray-950 text-yellow-400 shadow-md`}
        aria-label="Bilgi ve Duyurular"
      >
        <AlertTriangle className="w-5 h-5 animate-pulse group-hover:scale-110 transition-transform" />
      </button>
    </div>
  );
});

ActionIcons.displayName = 'ActionIcons';
