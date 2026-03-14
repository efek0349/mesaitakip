import React, { useState } from 'react';
import { X, Download, Upload, Shield, AlertTriangle, CheckCircle, Copy, Share2, Info, Trash2 } from 'lucide-react';
import { useOvertimeData } from '../hooks/useOvertimeData';
import { useSalarySettings } from '../hooks/useSalarySettings';
import { useAndroidSafeArea } from '../hooks/useAndroidSafeArea';
import { useHolidays } from '../hooks/useHolidays';
import { saveBackupFile, pickAndReadBackupFile, generateCsvContent, shareText, shareFile } from '../utils/fileUtils';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({ isOpen, onClose }) => {
  const { exportAllData, exportMonthData, importData, clearAllData, monthlyData } = useOvertimeData();
  const { clearSalarySettings, settings } = useSalarySettings();
  const { getHoliday } = useHolidays();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [showPasteArea, setShowPasteArea] = useState(false);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());

  if (!isOpen) return null;

  const ayAdlari = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];
  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i); // Current year +/- 2 years

  const handleExport = async (type: 'currentMonth' | 'all') => {
    try {
      let data: string;
      let fileName: string;

      if (type === 'currentMonth') {
        const year = today.getFullYear();
        const month = today.getMonth();
        const monthName = ayAdlari[month];
        data = exportMonthData(year, month);
        fileName = `MesaiTakip-${monthName}-${year}.json`;
      } else { // all
        const day = today.getDate().toString().padStart(2, '0');
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const year = today.getFullYear();
        data = exportAllData();
        fileName = `MesaiTakip-Tam-Yedek-${day}-${month}-${year}.json`;
      }
      
      await saveBackupFile(data, fileName);
      
      setMessage({ type: 'success', text: 'Yedekleme başarılı! Dosyanızı kaydetmek veya paylaşmak için bir seçenek belirleyin.' });
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Yedekleme sırasında bir hata oluştu.' });
    }
  };

  const handleCopyAllData = async () => {
    try {
      const data = exportAllData();
      await navigator.clipboard.writeText(data);
      setMessage({ type: 'success', text: 'Tüm MesaiTakip verileri kopyalandı! WhatsApp veya notlarınıza yapıştırabilirsiniz.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Kopyalama başarısız oldu. Lütfen manuel olarak seçip kopyalayın.' });
      setShowPasteArea(true);
      setPasteText(exportAllData());
    }
  };

  const handleShareAsText = async () => {
    try {
      const data = exportAllData();
      const day = today.getDate().toString().padStart(2, '0');
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const year = today.getFullYear();
      const fileName = `MesaiTakip-Tam-Yedek-${day}-${month}-${year}.txt`;
      await shareFile(data, fileName, 'MesaiTakip Tam Yedek');
    } catch (err) {
      setMessage({ type: 'error', text: 'Paylaşım sırasında bir hata oluştu.' });
    }
  };

  const handleImportFromText = () => {
    if (!pasteText.trim()) {
      setMessage({ type: 'error', text: 'Lütfen yedekleme metnini kutuya yapıştırın.' });
      return;
    }

    if (importData(pasteText)) {
      setMessage({ type: 'success', text: 'Veriler başarıyla içe aktarıldı! Sayfa yenileniyor...' });
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setMessage({ type: 'error', text: 'Geçersiz yedekleme metni. Lütfen metnin tamamını kopyaladığınızdan emin olun.' });
    }
  };

  const handleExportCsv = async () => {
    try {
      const monthName = ayAdlari[selectedMonth];

      const csvContent = generateCsvContent(selectedYear, selectedMonth, monthlyData, settings, getHoliday);
      const fileName = `MesaiTakip-${monthName}-${selectedYear}-Raporu.csv`;
      
      await saveBackupFile(csvContent, fileName);
      setMessage({ type: 'success', text: 'CSV raporu başarıyla oluşturuldu! Dosyanızı kaydetmek veya paylaşmak için bir seçenek belirleyin.' });
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'CSV raporu oluşturulurken bir hata oluştu.' });
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
              <h3 className="font-semibold text-gray-800 dark:text-white">Dosya Olarak Yedekle</h3>
            </div>
            <div className="flex gap-2">
                <button onClick={() => handleExport('currentMonth')} className="flex-1 w-full py-2 px-4 bg-green-500 text-white rounded-lg font-medium active:bg-green-600">
                  Bu Ayı Yedekle
                </button>
                <button onClick={() => handleExport('all')} className="flex-1 w-full py-2 px-4 bg-blue-500 text-white rounded-lg font-medium active:bg-blue-600">
                  Tümünü Yedekle
                </button>
            </div>
            <button onClick={handleExportCsv} className="w-full py-2 px-4 bg-purple-500 text-white rounded-lg font-medium active:bg-purple-600 mt-2">
              Seçili Ayı CSV Olarak Dışa Aktar
            </button>
            <div className="flex gap-2 mt-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="flex-1 py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ayAdlari.map((monthName, index) => (
                  <option key={monthName} value={index}>{monthName}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="flex-1 py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Text Backup/Restore */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-blue-800 dark:text-blue-200">Metin Olarak Tam Yedekleme</h3>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 italic font-medium">Bu işlem tüm ayları ve tüm ayarlarınızı kapsayan bir tam yedektir.</p>
            <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80">Dosya yüklemede sorun yaşıyorsanız bu metni kopyalayıp WhatsApp gibi yerlere kendinize not olarak gönderebilirsiniz.</p>
            
            <div className="flex gap-2">
              <button 
                onClick={handleCopyAllData} 
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium active:bg-blue-700 text-sm"
              >
                <Copy size={16} /> Tam Yedeği Kopyala
              </button>
              <button 
                onClick={handleShareAsText} 
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-green-600 text-white rounded-lg font-medium active:bg-green-700 text-sm"
              >
                <Share2 size={16} /> Paylaş
              </button>
            </div>

            <button 
              onClick={() => setShowPasteArea(!showPasteArea)} 
              className="w-full py-2 px-4 border border-blue-500 text-blue-600 dark:text-blue-400 rounded-lg font-medium active:bg-blue-50 dark:active:bg-blue-900/30 text-sm"
            >
              {showPasteArea ? 'Metin Alanını Kapat' : 'Yedekten Tam Geri Yükle'}
            </button>

            {showPasteArea && (
              <div className="space-y-2 mt-2">
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Kopyaladığınız tam yedek metnini buraya yapıştırın..."
                  className="w-full h-32 p-3 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  onClick={handleImportFromText}
                  className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg font-medium active:bg-blue-600"
                >
                  Tam Yedeği Şimdi Yükle
                </button>
              </div>
            )}
          </div>

          {/* Import */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <h3 className="font-semibold text-gray-800 dark:text-white">Dosyadan Geri Yükle</h3>
            </div>
            <button onClick={handleImport} className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg font-medium active:bg-blue-600">
              Dosya Seç ve Yükle
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
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button onClick={onClose} className="w-full py-3 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium active:bg-gray-200 dark:active:bg-gray-500">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};