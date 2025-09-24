import React from 'react';
import { Download, Settings, Share2, Trash2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

interface ActionIconsProps {
  onOpenDataBackup: () => void;
  onOpenSettings: () => void;
  onShareMonthlyStats: () => void;
  onClearMonthlyStats: () => void;
  canShare: boolean;
  canClear: boolean;
  className?: string;
}

export const ActionIcons: React.FC<ActionIconsProps> = React.memo(({
  onOpenDataBackup,
  onOpenSettings,
  onShareMonthlyStats,
  onClearMonthlyStats,
  canShare,
  canClear,
  className
}) => {
  return (
    <div className={`flex items-center justify-end gap-1 mt-4 mb-6 ${className}`}>
      {/* Maaş Ayarları */}
      <button onClick={onOpenSettings} className="p-1 rounded-full active:bg-gray-100 dark:active:bg-gray-700" aria-label="Ayarlar">
        <Settings className="w-6 h-6 text-gray-600 dark:text-gray-300" />
      </button>

      {/* Yedekle */}
      <button onClick={onOpenDataBackup} className="p-1 rounded-full active:bg-gray-100 dark:active:bg-gray-700" aria-label="Veri Yedekle">
        <Download className="w-6 h-6 text-gray-600 dark:text-gray-300" />
      </button>

      {/* Paylaş (sadece mobilde göster) */}
      {Capacitor.isNativePlatform() && (
        <button 
          onClick={onShareMonthlyStats} 
          disabled={!canShare}
          className={`p-1 rounded-full transition-colors ${canShare ? 'text-gray-600 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-700' : 'text-gray-300 dark:text-gray-700 cursor-not-allowed'}`}
          aria-label="Aylık Raporu Paylaş"
        >
          <Share2 className="w-6 h-6" />
        </button>
      )}

      {/* Sil */}
      <button 
        onClick={onClearMonthlyStats} 
        disabled={!canClear}
        className={`p-1 rounded-full transition-colors ${canClear ? 'text-gray-600 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-700' : 'text-gray-300 dark:text-gray-700 cursor-not-allowed'}`}
        aria-label="Aylık Verileri Sil"
      >
        <Trash2 className="w-6 h-6" />
      </button>
    </div>
  );
});

ActionIcons.displayName = 'ActionIcons';
