import React, { useState } from 'react';
import { X, Download, Upload, Shield, AlertTriangle, CheckCircle, Copy, Share2, Info, Trash2 } from 'lucide-react';
import { useOvertimeData } from '../hooks/useOvertimeData';
import { useSalarySettings } from '../hooks/useSalarySettings';
import { useAndroidSafeArea } from '../hooks/useAndroidSafeArea';
import { shareText } from '../utils/fileUtils';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({ isOpen, onClose }) => {
  const { exportAllData, importData, clearAllData } = useOvertimeData();
  const { clearSalarySettings } = useSalarySettings();
  const [importText, setImportText] = useState('');
  const [exportedData, setExportedData] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    try {
      const data = exportAllData();
      setExportedData(data);
      setMessage({ type: 'success', text: 'Veriler dışa aktarıldı. Şimdi kopyalayabilir veya paylaşabilirsiniz.' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Veri dışa aktarılırken bir hata oluştu.' });
    }
  };

  const handleImport = () => {
    if (!importText.trim()) {
      setMessage({ type: 'error', text: 'Lütfen içe aktarılacak veriyi girin.' });
      return;
    }
    if (importData(importText)) {
      setMessage({ type: 'success', text: 'Veriler başarıyla içe aktarıldı!' });
      setImportText('');
      setTimeout(() => window.location.reload(), 1000);
    } else {
      setMessage({ type: 'error', text: 'Geçersiz veri formatı.' });
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

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(exportedData).then(() => {
      setMessage({ type: 'success', text: 'Veri panoya kopyalandı!' });
    }, () => {
      setMessage({ type: 'error', text: 'Panoya kopyalanamadı.' });
    });
  };

  const handleShare = () => {
    shareText(exportedData, 'Mesai Takip Yedek');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 h-screen-dynamic">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-full">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-800">Veri Yönetimi</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full active:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {message && (
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Export */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-800">Verileri Dışa Aktar</h3>
            </div>
            <button onClick={handleExport} className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg font-medium active:bg-blue-600">
              Yedek Oluştur
            </button>
            {exportedData && (
              <div className="space-y-2">
                <textarea readOnly value={exportedData} className="w-full h-24 text-xs bg-white border rounded p-2 resize-none" />
                <div className="flex gap-2">
                  <button onClick={handleCopyToClipboard} className="flex-1 py-2 text-sm bg-gray-200 rounded-lg active:bg-gray-300">Kopyala</button>
                  <button onClick={handleShare} className="flex-1 py-2 text-sm bg-gray-200 rounded-lg active:bg-gray-300">Paylaş</button>
                </div>
              </div>
            )}
          </div>

          {/* Import */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-800">Verileri İçe Aktar</h3>
            </div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Yedek verinizi buraya yapıştırın..."
              className="w-full h-24 text-sm border rounded p-2 resize-none"
            />
            <button onClick={handleImport} disabled={!importText.trim()} className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg font-medium active:bg-blue-600 disabled:bg-gray-300">
              Geri Yükle
            </button>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-red-800">Tehlikeli Bölge</h3>
            </div>
            <p className="text-sm text-red-700">Bu işlem tüm mesai ve ayar verilerinizi kalıcı olarak siler. Geri alınamaz.</p>
            <button onClick={handleClear} className="w-full py-2 px-4 bg-red-500 text-white rounded-lg font-medium active:bg-red-600">
              Tüm Verileri Sil
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 p-4">
          <button onClick={onClose} className="w-full py-3 bg-gray-100 text-gray-800 rounded-lg font-medium active:bg-gray-200">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};