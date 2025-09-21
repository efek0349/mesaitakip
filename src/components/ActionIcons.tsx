import React from 'react';
import { Download, Settings, Share2, Trash2 } from 'lucide-react';

interface ActionIconsProps {
  onOpenDataBackup: () => void;
  onOpenSalarySettings: () => void;
  onShareMonthlyStats: () => void;
  onClearMonthlyStats: () => void;
  canShare: boolean;
  canClear: boolean;
  className?: string;
}

export const ActionIcons: React.FC<ActionIconsProps> = React.memo(({
  onOpenDataBackup,
  onOpenSalarySettings,
  onShareMonthlyStats,
  onClearMonthlyStats,
  canShare,
  canClear,
  className
}) => {
  return (
    <div className={`flex items-center justify-end gap-1 mt-4 mb-6 ${className}`}>
      {/* Maaş Ayarları */}
      <button onClick={onOpenSalarySettings} className="p-1 rounded-full active:bg-gray-100" aria-label="Maaş Ayarları">
        <Settings className="w-6 h-6 text-gray-600" />
      </button>

      {/* Yedekle */}
      <button onClick={onOpenDataBackup} className="p-1 rounded-full active:bg-gray-100" aria-label="Veri Yedekle">
        <Download className="w-6 h-6 text-gray-600" />
      </button>

      {/* Paylaş */}
      <button 
        onClick={onShareMonthlyStats} 
        disabled={!canShare}
        className={`p-1 rounded-full transition-colors ${canShare ? 'active:bg-gray-100' : 'text-gray-300 cursor-not-allowed'}`}
        aria-label="Aylık Raporu Paylaş"
      >
        <Share2 className="w-6 h-6" />
      </button>

      {/* Sil */}
      <button 
        onClick={onClearMonthlyStats} 
        disabled={!canClear}
        className={`p-1 rounded-full transition-colors ${canClear ? 'active:bg-gray-100' : 'text-gray-300 cursor-not-allowed'}`}
        aria-label="Aylık Verileri Sil"
      >
        <Trash2 className="w-6 h-6" />
      </button>
    </div>
  );
});

ActionIcons.displayName = 'ActionIcons';
