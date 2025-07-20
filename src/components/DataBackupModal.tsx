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
  const { getModalStyle, getButtonContainerStyle, isAndroid } = useAndroidSafeArea();
  const [importText, setImportText] = useState('');
  const [exportedData, setExportedData] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleExportData = () => {
    try {
      const dataString = exportAllData();
      setExportedData(dataString);
      
      // Mobil cihazlar için paylaşma seçeneği
      const fileName = `mesai-yedek-${new Date().toISOString().split('T')[0]}.json`;
      
      setMessage({ 
        type: 'success', 
        text: `Veriler hazırlandı! Aşağıdaki metni kopyalayıp güvenli bir yere kaydedin veya paylaşın.` 
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Veri hazırlama sırasında hata oluştu!' });
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(exportedData);
        setMessage({ type: 'success', text: 'Yedek veriler panoya kopyalandı! Artık istediğiniz yere yapıştırabilirsiniz.' });
      } else {
        // Fallback method
        const textArea = document.createElement('textarea');
        textArea.value = exportedData;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          setMessage({ type: 'success', text: 'Yedek veriler panoya kopyalandı! Artık istediğiniz yere yapıştırabilirsiniz.' });
        } catch (err) {
          setMessage({ type: 'error', text: 'Panoya kopyalama başarısız oldu.' });
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Panoya kopyalama başarısız oldu.' });
    }
  };

  const handleShareData = async () => {
    if (!exportedData) return;
    
    const fileName = `mesai-yedek-${new Date().toISOString().split('T')[0]}`;
    await shareText(exportedData, `${fileName} - Mesai Yedek Verisi`);
  };

  const handleDownloadFile = () => {
    if (!exportedData) return;
    
    try {
      const blob = new Blob([exportedData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `mesai-yedek-${new Date().toISOString().split('T')[0]}.json`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setMessage({ 
        type: 'success', 
        text: `Dosya indirildi: ${fileName}` 
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Dosya indirme başarısız oldu!' });
    }
  };

  const handleImportData = () => {
    if (!importText.trim()) {
      setMessage({ type: 'error', text: 'Lütfen yedek verisini girin!' });
      return;
    }

    const success = importData(importText);
    if (success) {
      setMessage({ type: 'success', text: 'Veriler başarıyla geri yüklendi!' });
      setImportText('');
    } else {
      setMessage({ type: 'error', text: 'Veri formatı geçersiz! Lütfen doğru yedek verisini girin.' });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setImportText(content);
      };
      reader.readAsText(file);
    }
  };

  const clearMessages = () => {
    setMessage(null);
  };

  const handleClearAllData = () => {
    if (window.confirm('⚠️ TÜM VERİLERİ SİLMEK İSTEDİĞİNİZDEN EMİN MİSİNİZ?\n\n• Tüm mesai kayıtları silinecek\n• Maaş ayarları sıfırlanacak\n• Bu işlem geri alınamaz!\n\nDevam etmek istiyor musunuz?')) {
      if (window.confirm('🚨 SON UYARI!\n\nBu işlem tüm verilerinizi kalıcı olarak silecek ve geri getirilemeyecek.\n\nGerçekten devam etmek istiyor musunuz?')) {
        // Önce tüm localStorage'ı temizle
        try {
          // Tüm mesai ile ilgili anahtarları bul ve sil
          const allKeys = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) allKeys.push(key);
          }
          
          allKeys.forEach(key => {
            if (key.includes('mesai') || key.includes('salary') || key.includes('overtime')) {
              localStorage.removeItem(key);
              console.log(`🗑️ Silinen anahtar: ${key}`);
            }
          });
          
          // Kesin olarak bilinen anahtarları da sil
          localStorage.removeItem('mesai-data');
          localStorage.removeItem('mesai-salary-settings');
          localStorage.removeItem('mesai-data-backup-1');
          localStorage.removeItem('mesai-data-backup-2');
          localStorage.removeItem('mesai-data-backup-3');
          
        } catch (error) {
          console.error('localStorage temizleme hatası:', error);
        }
        
        // Sonra hook'ları çağır
        clearAllData();
        clearSalarySettings();
        
        setMessage({ 
          type: 'success', 
          text: 'Tüm veriler ve localStorage başarıyla temizlendi! Uygulama yeniden başlatılıyor...' 
        });
        
        // 3 saniye sonra sayfayı yenile
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div 
        className={`
          bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto
          ${isAndroid ? 'modal-android android-safe-modal' : 'max-h-[85vh] mb-safe'}
        `}
        style={isAndroid ? getModalStyle() : undefined}
      >
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Veri Yedekleme</h2>
            </div>
            <button
              onClick={onClose}
              className="p-3 rounded-lg active:bg-gray-100 transition-colors touch-manipulation"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded-lg flex items-start gap-2 ${
              message.type === 'success' ? 'bg-green-50 text-green-700' :
              message.type === 'error' ? 'bg-red-50 text-red-700' :
              'bg-blue-50 text-blue-700'
            }`}>
              {message.type === 'success' && <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              {message.type === 'error' && <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              {message.type === 'info' && <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              <div className="flex-1">
                <span className="text-sm whitespace-pre-line">{message.text}</span>
                <button
                  onClick={clearMessages}
                  className="ml-2 text-xs underline opacity-70 hover:opacity-100"
                >
                  Kapat
                </button>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Export Section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Download className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                  Veri Yedekleme
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Tüm mesai verilerinizi yedekleyin. Mobil cihazlarda paylaşma özelliğini kullanın.
              </p>
              
              <button
                onClick={handleExportData}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-500 text-white rounded-lg font-medium active:bg-blue-600 transition-colors touch-manipulation mb-3"
              >
                <Shield className="w-4 h-4" />
                Yedek Hazırla
              </button>

              {exportedData && (
                <div className="space-y-3">
                  <div className="bg-white border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Yedek Verisi Hazır</span>
                      <span className="text-xs text-gray-500">
                        {(new Blob([exportedData]).size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <textarea
                      value={exportedData}
                      readOnly
                      className="w-full h-20 text-xs bg-gray-50 border rounded p-2 resize-none"
                      placeholder="Yedek verisi burada görünecek..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      onClick={handleCopyToClipboard}
                      className="flex items-center justify-center gap-2 py-2 px-3 bg-green-500 text-white rounded-lg font-medium active:bg-green-600 transition-colors touch-manipulation text-sm"
                    >
                      <Copy className="w-4 h-4" />
                      Kopyala
                    </button>
                    
                    <button
                      onClick={handleShareData}
                      className="flex items-center justify-center gap-2 py-2 px-3 bg-purple-500 text-white rounded-lg font-medium active:bg-purple-600 transition-colors touch-manipulation text-sm"
                    >
                      <Share2 className="w-4 h-4" />
                      Paylaş
                    </button>
                    
                    <button
                      onClick={handleDownloadFile}
                      className="flex items-center justify-center gap-2 py-2 px-3 bg-orange-500 text-white rounded-lg font-medium active:bg-orange-600 transition-colors touch-manipulation text-sm"
                    >
                      <Download className="w-4 h-4" />
                      İndir
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Import Section */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Upload className="w-4 h-4 text-green-600" />
                <h3 className="text-sm sm:text-base font-semibold text-gray-800">
                  Veri Geri Yükleme
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Daha önce yedeklediğiniz verileri geri yükleyin.
              </p>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dosya Seç (Opsiyonel)
                  </label>
                  <input
                    type="file"
                    accept=".json,.txt"
                    onChange={handleFileUpload}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yedek Verisini Yapıştır
                  </label>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="Yedek verinizi buraya yapıştırın..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm h-24 resize-none"
                  />
                </div>
                
                <button
                  onClick={handleImportData}
                  disabled={!importText.trim()}
                  className={`
                    w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium
                    transition-colors touch-manipulation
                    ${importText.trim()
                      ? 'bg-green-500 text-white active:bg-green-600'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  <Upload className="w-4 h-4" />
                  Verileri Geri Yükle
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">Yedekleme Talimatları</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p><strong>Mobil Cihazlar İçin:</strong></p>
                    <p>• "Yedek Hazırla" → "Kopyala" → Not uygulamasına yapıştır</p>
                    <p>• "Paylaş" ile WhatsApp, e-posta veya bulut depolamaya gönder</p>
                    <p></p>
                    <p><strong>Bilgisayar İçin:</strong></p>
                    <p>• "İndir" butonu ile JSON dosyası indir</p>
                    <p>• Dosyayı güvenli bir klasöre kaydet</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-yellow-800 mb-1">Önemli Uyarı</h4>
                  <p className="text-sm text-yellow-700">
                    • Düzenli yedekleme yapın (aylık önerilir)<br/>
                    • Yedek verilerinizi güvenli yerlerde saklayın<br/>
                    • Geri yükleme mevcut verilerle birleştirilir<br/>
                    • Aynı tarihteki kayıtlar güncellenir
                  </p>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-3">
                <Trash2 className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-red-800 mb-1">Tehlikeli Bölge</h4>
                  <p className="text-sm text-red-700 mb-3">
                    Tüm mesai kayıtlarınızı ve ayarlarınızı kalıcı olarak siler.
                    Bu işlem geri alınamaz!
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleClearAllData}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-500 text-white rounded-lg font-medium active:bg-red-600 transition-colors touch-manipulation text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Tüm Verileri Sil
              </button>
            </div>
          </div>

          <div 
            className={`
              mt-6
              ${isAndroid ? 'android-safe-button' : 'pb-safe'}
            `}
            style={isAndroid ? getButtonContainerStyle() : undefined}
          >
            <button
              onClick={onClose}
              className={`
                w-full px-4 bg-gray-100 text-gray-700 rounded-lg font-medium 
                active:bg-gray-200 transition-colors touch-manipulation
                ${isAndroid ? 'android-button' : 'py-4 min-h-[48px]'}
              `}
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};