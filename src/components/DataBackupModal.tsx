import React, { useState } from 'react';
import { X, Download, Upload, Shield, AlertTriangle, CheckCircle, Copy, Share2, Info, Trash2 } from 'lucide-react';
import { useOvertimeData } from '../hooks/useOvertimeData';
import { useSalarySettings } from '../hooks/useSalarySettings';
import { useAndroidSafeArea } from '../hooks/useAndroidSafeArea';
import { saveBackupFile, pickAndReadBackupFile } from '../utils/fileUtils';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({ isOpen, onClose }) => {
  const { exportAllData, exportMonthData, importData, clearAllData } = useOvertimeData();
  const { clearSalarySettings } = useSalarySettings();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleExport = async (type: 'currentMonth' | 'all') => {
    const ayAdlari = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];

    try {
      let data: string;
      let fileName: string;
      const today = new Date();

      if (type === 'currentMonth') {
        const year = today.getFullYear();
        const month = today.getMonth();
        const monthName = ayAdlari[month];
        data = exportMonthData(year, month);
        fileName = `${monthName}-${year}.mesai-takip.json`;
      } else { // all
        const day = today.getDate().toString().padStart(2, '0');
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const year = today.getFullYear();
        data = exportAllData();
        fileName = `Tam-yedek-${day}-${month}-${year}.mesai-takip.json`;
      }
      
      await saveBackupFile(data, fileName);
      
      setMessage({ type: 'success', text: `Yedekleme başarılı! Dosyanız (cihazınıza göre) Dokümanlar klasörüne kaydedildi.` });
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Yedekleme sırasında bir hata oluştu.' });
    }
  };

  const handleImport = async () => {
    try {
      const dataString = await pickAndReadBackupFile();
      if (!dataString) {
        // Kullanıcı dosya seçmeyi iptal etti, mesaj gösterme
        return;
      }

      if (importData(dataString)) {
        setMessage({ type: 'success', text: 'Veriler başarıyla içe aktarıldı! Sayfa yenileniyor...' });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage({ type: 'error', text: 'Geçersiz veya bozuk yedekleme dosyası.' });
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Dosya okunurken bir hata oluştu.' });
    }
  };

  const handleClear = () => {
    if (window.confirm('TÜM verileri (mesailer ve ayarlar) silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
      clearAllData();
      clearSalarySettings();
      setMessage({ type: 'success', text: 'Tüm veriler silindi. Uygulama yeniden başlatılıyor...' });
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 h-screen-dynamic">
      <div className="bg-white dark:bg-dark-bg rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-full">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Veri Yönetimi</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full active:bg-gray-100 dark:active:bg-gray-600"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {message && (
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'}`}>
              {message.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Export */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <h3 className="font-semibold text-gray-800 dark:text-white">Verileri Dışa Aktar</h3>
            </div>
            <div className="flex gap-2">
                <button onClick={() => handleExport('currentMonth')} className="flex-1 w-full py-2 px-4 bg-green-500 text-white rounded-lg font-medium active:bg-green-600">
                  Bu Ayı Yedekle
                </button>
                <button onClick={() => handleExport('all')} className="flex-1 w-full py-2 px-4 bg-blue-500 text-white rounded-lg font-medium active:bg-blue-600">
                  Tümünü Yedekle
                </button>
            </div>
          </div>

          {/* Import */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <h3 className="font-semibold text-gray-800 dark:text-white">Verileri İçe Aktar</h3>
            </div>
            <button onClick={handleImport} className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg font-medium active:bg-blue-600">
              Yedekten Geri Yükle
            </button>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <h3 className="font-semibold text-red-800 dark:text-red-200">Tehlikeli Bölge</h3>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300">Bu işlem tüm mesai ve ayar verilerinizi kalıcı olarak siler. Geri alınamaz.</p>
            <button onClick={handleClear} className="w-full py-2 px-4 bg-red-500 text-white rounded-lg font-medium active:bg-red-600">
              Tüm Verileri Sil
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
          <button onClick={onClose} className="w-full py-3 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium active:bg-gray-200 dark:active:bg-gray-500">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};