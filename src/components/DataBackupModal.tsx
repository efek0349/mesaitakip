import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Upload, Shield, AlertTriangle, CheckCircle, Cloud, LogOut, Trash2, RefreshCw, Clock, Copy, Share2, FileText, FileSpreadsheet } from 'lucide-react';
import { useOvertimeData } from '../hooks/useOvertimeData';
import { useSalarySettings } from '../hooks/useSalarySettings';
import { useHolidays } from '../hooks/useHolidays';
import { saveBackupFile, pickAndReadBackupFile, generateCsvContent, shareFile } from '../utils/fileUtils';
import { googleDriveService, GoogleUser, DriveFile } from '../utils/googleDriveService';
import { generateDynamicHash } from '../utils/dateUtils';
import { Dialog } from '@capacitor/dialog';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({ isOpen, onClose }) => {
  const { exportAllData, importData, clearAllData, monthlyData } = useOvertimeData();
  const { clearSalarySettings, settings } = useSalarySettings();
  const { getHoliday } = useHolidays();
  
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [backups, setBackups] = useState<DriveFile[]>([]);
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showVerifyArea, setShowVerifyArea] = useState(false);
  const [verifyText, setVerifyText] = useState('');
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const isInitialMount = useRef(true);
  const today = new Date();

  useEffect(() => {
    if (isOpen) {
      googleDriveService.init().then(user => {
        if (user) {
          setGoogleUser(user);
          refreshBackupList();
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  const refreshBackupList = async () => {
    setLoading(true);
    try {
      const list = await googleDriveService.listBackups();
      setBackups(list);
    } catch (e) {
      // Hata durumunda listeyi güncelleme, sessizce geç
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLog = () => {
    if (!verifyText.trim()) return;
    
    // Baştaki ve sondaki backtick ve boşlukları temizle
    const cleanText = verifyText.trim().replace(/^```[\s\S]*?\n|^```|```$/g, '').trim();
    
    // Mesajın sonundaki hash satırını ayıkla
    const hashLabel = '[!] LOG_HASH: ';
    const lastLineStart = cleanText.lastIndexOf(hashLabel);
    
    if (lastLineStart === -1) {
      setVerifyResult({ success: false, message: 'Log içerisinde Hash bulunamadı!' });
      return;
    }

    const providedHash = cleanText.substring(lastLineStart + hashLabel.length).trim();
    const contentToHash = cleanText.substring(0, lastLineStart);
    
    const calculatedHash = generateDynamicHash(contentToHash);
    
    if (providedHash === calculatedHash) {
      setVerifyResult({ success: true, message: `DOĞRULANDI: Veri orijinal. (${calculatedHash})` });
    } else {
      setVerifyResult({ success: false, message: `HATA: Veri manipüle edilmiş! (Beklenen: ${providedHash}, Hesaplanan: ${calculatedHash})` });
    }
  };

  const handleGoogleSignIn = async () => {
    await googleDriveService.signIn();
  };

  const handleGoogleBackup = async () => {
    if (!googleUser) { handleGoogleSignIn(); return; }
    setLoading(true);
    try {
      const success = await googleDriveService.uploadBackup(exportAllData());
      if (success) {
        setMessage({ type: 'success', text: 'Buluta yedeklendi!' });
        refreshBackupList();
      } else {
        setMessage({ type: 'error', text: 'Yedekleme başarısız.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (file: DriveFile) => {
    if (!googleUser) return;
    
    const { value } = await Dialog.confirm({
      title: 'Yedekten Geri Yükle',
      message: `${new Date(file.createdTime).toLocaleString('tr-TR')} tarihli yedeği yüklemek istiyor musunuz? Mevcut verileriniz silinecektir.`,
      okButtonTitle: 'Evet, Yükle',
      cancelButtonTitle: 'Vazgeç'
    });

    if (!value) return;
    
    setLoading(true);
    try {
      const jsonData = await googleDriveService.downloadBackup(file.id);
      if (jsonData && importData(jsonData)) {
        await Dialog.alert({ title: 'Başarılı', message: 'Veriler geri yüklendi.', buttonTitle: 'Tamam' });
        window.location.reload();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Geri yükleme hatası.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (file: DriveFile) => {
    if (!googleUser) return;

    const { value } = await Dialog.confirm({
      title: 'Yedeği Sil',
      message: 'Bu yedek buluttan kalıcı olarak silinecek. Emin misiniz?',
      okButtonTitle: 'Sil',
      cancelButtonTitle: 'İptal'
    });

    if (!value) return;
    
    try {
      const success = await googleDriveService.deleteBackup(file.id);
      if (success) {
        setBackups(backups.filter(b => b.id !== file.id));
        setMessage({ type: 'success', text: 'Yedek silindi.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Silme hatası.' });
    }
  };

  const handleClear = async () => {
    const { value } = await Dialog.confirm({
      title: 'Tüm Verileri Temizle',
      message: 'Dikkat! Tüm mesai kayıtlarınız ve ayarlarınız kalıcı olarak silinecek. Bu işlem geri alınamaz!',
      okButtonTitle: 'HER ŞEYİ SİL',
      cancelButtonTitle: 'VAZGEÇ'
    });

    if (value) {
      clearAllData();
      clearSalarySettings();
      window.location.reload();
    }
  };

  const handleShareAsTxt = async () => {
    try {
      const data = exportAllData();
      const fileName = `MesaiTakip-Yedek-${today.toLocaleDateString('tr-TR')}.txt`;
      await shareFile(data, fileName, 'Mesai Takip Yedek (TXT)');
    } catch (err) {
      setMessage({ type: 'error', text: 'Paylaşım hatası.' });
    }
  };

  const handleExportCsv = async () => {
    try {
      const csv = generateCsvContent(today.getFullYear(), today.getMonth(), monthlyData, settings, getHoliday);
      await saveBackupFile(csv, `Mesai-Rapor-${today.getMonth() + 1}.csv`);
      setMessage({ type: 'success', text: 'CSV Raporu oluşturuldu.' });
    } catch (e) {
      setMessage({ type: 'error', text: 'CSV hatası.' });
    }
  };

  const handleImportFromText = async () => {
    if (!pasteText.trim()) return;
    if (importData(pasteText)) {
      await Dialog.alert({ title: 'Başarılı', message: 'Yedek metinden yüklendi.', buttonTitle: 'Tamam' });
      window.location.reload();
    } else {
      setMessage({ type: 'error', text: 'Geçersiz veri.' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-hidden backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3 text-gray-800 dark:text-white">
            <Shield className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold">Veri Yönetimi</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {message && (
            <div className={`p-3 rounded-xl text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/30' : 'bg-red-50 text-red-700 dark:bg-red-900/30'}`}>
              {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
              <span>{message.text}</span>
            </div>
          )}

          {/* GOOGLE DRIVE BÖLÜMÜ */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                <Cloud size={20} />
                <h3 className="font-bold">Google Drive</h3>
              </div>
              {googleUser && <button onClick={() => googleDriveService.signOut().then(() => setGoogleUser(null))} className="text-red-500 p-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm active:scale-95"><LogOut size={18} /></button>}
            </div>

            {googleUser ? (
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-orange-700 dark:text-orange-300 truncate px-1 italic opacity-80">● {googleUser.email}</p>
                <button onClick={handleGoogleBackup} disabled={loading} className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold shadow-md flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                  {loading ? <RefreshCw className="animate-spin" size={18} /> : <Upload size={18} />} Buluta Yedekle
                </button>
                <div className="max-h-32 overflow-y-auto space-y-2 custom-scrollbar">
                  {backups.map(file => (
                    <div key={file.id} className="bg-white dark:bg-gray-800/50 p-2.5 rounded-xl border border-orange-100 dark:border-orange-800/20 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[11px]">
                        <Clock size={12} className="text-orange-400" />
                        <span className="font-bold text-gray-700 dark:text-gray-300">{new Date(file.createdTime).toLocaleString('tr-TR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}</span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleRestore(file)} className="p-1.5 text-blue-600 bg-blue-50 dark:bg-blue-900/30 rounded-lg active:scale-90"><Download size={14} /></button>
                        <button onClick={() => handleDelete(file)} className="p-1.5 text-red-500 bg-red-50 dark:bg-red-900/30 rounded-lg active:scale-90"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <button onClick={handleGoogleSignIn} className="w-full py-3.5 bg-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all">
                <Cloud size={20} /> Google Drive'a Bağlan
              </button>
            )}
          </div>

          {/* PAYLAŞIM VE DOSYA BÖLÜMÜ */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-2xl p-4 space-y-3">
            <h3 className="font-bold text-blue-800 dark:text-blue-200 flex items-center gap-2"><Share2 size={20} /> Paylaş ve Aktar</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button onClick={handleShareAsTxt} className="flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl font-bold active:scale-95 transition-all shadow-sm">
                <Share2 size={16} /> TXT Olarak Paylaş
              </button>
              <button onClick={handleExportCsv} className="flex items-center justify-center gap-2 py-2.5 bg-purple-600 text-white rounded-xl font-bold active:scale-95 transition-all shadow-sm">
                <FileSpreadsheet size={16} /> CSV Raporu Al
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button onClick={() => { navigator.clipboard.writeText(exportAllData()); setMessage({type:'success', text:'Kopyalandı!'}) }} className="flex items-center justify-center gap-2 py-2.5 bg-gray-700 text-white rounded-xl font-bold active:scale-95">
                <Copy size={16} /> Metni Kopyala
              </button>
              <button onClick={() => setShowPasteArea(!showPasteArea)} className="flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 text-gray-700 dark:text-gray-200 rounded-xl font-bold active:scale-95 shadow-sm">
                <FileText size={16} /> Yedek Yükle
              </button>
            </div>

            {showPasteArea && (
              <div className="space-y-2 pt-2 animate-in slide-in-from-top-2">
                <textarea value={pasteText} onChange={(e)=>setPasteText(e.target.value)} placeholder="Yedek metnini buraya yapıştırın..." className="w-full h-24 p-2 text-[10px] border rounded-lg dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
                <button onClick={handleImportFromText} className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Metinden Geri Yükle</button>
                <div className="relative flex py-2 items-center"><div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div><span className="flex-shrink mx-4 text-gray-400 text-[10px]">VEYA</span><div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div></div>
                <button onClick={() => pickAndReadBackupFile().then(d => d && importData(d) && window.location.reload())} className="w-full py-2 border-2 border-dashed border-blue-400 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold">Dosyadan Geri Yükle</button>
              </div>
            )}
          </div>

          {/* LOG DOĞRULAMA BÖLÜMÜ */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-2"><Shield size={20} /> Log Doğrulama</h3>
              <button onClick={() => setShowVerifyArea(!showVerifyArea)} className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                {showVerifyArea ? 'Gizle' : 'Göster'}
              </button>
            </div>
            
            {showVerifyArea && (
              <div className="space-y-3 animate-in slide-in-from-top-2">
                <p className="text-[10px] text-emerald-700 dark:text-emerald-300 italic">Paylaşılan mesai logunun orijinal olup olmadığını hash değeri ile kontrol edin.</p>
                <textarea 
                  value={verifyText} 
                  onChange={(e) => { setVerifyText(e.target.value); setVerifyResult(null); }} 
                  placeholder="Doğrulanacak log metnini buraya yapıştırın..." 
                  className="w-full h-32 p-3 text-[10px] font-mono border rounded-xl dark:bg-gray-900 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800 focus:ring-2 focus:ring-emerald-500" 
                />
                <button 
                  onClick={handleVerifyLog} 
                  disabled={!verifyText.trim()}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-md flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 transition-all"
                >
                  <RefreshCw size={18} /> Logu Doğrula
                </button>
                
                {verifyResult && (
                  <div className={`p-3 rounded-xl text-[11px] font-bold flex items-start gap-2 ${verifyResult.success ? 'bg-green-100 text-green-800 dark:bg-green-900/40' : 'bg-red-100 text-red-800 dark:bg-red-900/40'}`}>
                    {verifyResult.success ? <CheckCircle size={16} className="mt-0.5" /> : <AlertTriangle size={16} className="mt-0.5" />}
                    <span>{verifyResult.message}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TEHLİKELİ BÖLGE (Daha Belirgin) */}
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800/30 rounded-2xl p-4 mt-2">
            <div className="flex items-center gap-2 mb-3 text-red-600 dark:text-red-400">
              <AlertTriangle size={18} />
              <span className="text-xs font-black uppercase tracking-wider">Tehlikeli Bölge</span>
            </div>
            <button 
              onClick={handleClear} 
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 active:scale-[0.98] transition-all"
            >
              Tüm Verileri Şimdi Sıfırla
            </button>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 dark:border-gray-700">
          <button onClick={onClose} className="w-full py-4 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-2xl font-black transition-all active:scale-[0.97]">Kapat</button>
        </div>
      </div>
    </div>
  );
};
