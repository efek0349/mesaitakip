import React, { useState, useEffect } from 'react';
import { X, Download, Upload, Shield, AlertTriangle, CheckCircle, Cloud, LogOut, Trash2, RefreshCw, Clock, Copy, Share2, FileText, FileSpreadsheet, ChevronRight, ShieldCheck, Database, Info } from 'lucide-react';
import { useOvertimeData } from '../hooks/useOvertimeData';
import { useSalarySettings } from '../hooks/useSalarySettings';
import { useHolidays } from '../hooks/useHolidays';
import { saveBackupFile, pickAndReadBackupFile, generateCsvContent, shareFile } from '../utils/fileUtils';
import { googleDriveService, GoogleUser, DriveFile } from '../utils/googleDriveService';
import { generateDynamicHash } from '../utils/dateUtils';
import { Dialog } from '@capacitor/dialog';
import { Capacitor } from '@capacitor/core';
import { TabButton } from './TabButton';
import { useAndroidSafeArea } from '../hooks/useAndroidSafeArea';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate?: Date;
}

type BackupTab = 'cloud' | 'backup' | 'file' | 'tools';

export const DataBackupModal: React.FC<DataBackupModalProps> = ({ isOpen, onClose, currentDate }) => {
  const { exportAllData, importData, clearAllData, monthlyData } = useOvertimeData();
  const { clearSalarySettings, settings, updateSettings } = useSalarySettings();
  const { getHoliday } = useHolidays();
  const { modalStyle, buttonContainerStyle } = useAndroidSafeArea();
  
  const [activeTab, setActiveTab] = useState<BackupTab>('cloud');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [backups, setBackups] = useState<DriveFile[]>([]);
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [showVerifyArea, setShowVerifyArea] = useState(false);
  const [verifyText, setVerifyText] = useState('');
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const today = React.useMemo(() => new Date(), []);
  const isWeb = Capacitor.getPlatform() === 'web';

  const refreshBackupList = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await googleDriveService.listBackups();
      setBackups(list);
      setGoogleUser(googleDriveService.getUser());
    } catch (e) {
      setMessage({ type: 'error', text: 'Yedekler yüklenemedi. Bağlantınızı kontrol edin.' });
      setGoogleUser(googleDriveService.getUser());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      const existingUser = googleDriveService.getUser();
      if (existingUser) {
        setGoogleUser(existingUser);
        refreshBackupList();
      } else {
        setLoading(true);
        googleDriveService.init()
          .then(user => {
            setGoogleUser(user);
            if (user) refreshBackupList();
          })
          .catch(() => setGoogleUser(null))
          .finally(() => setLoading(false));
      }
    }
  }, [isOpen, refreshBackupList]);

  // Mesajları otomatik temizle
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleVerifyLog = () => {
    if (!verifyText.trim()) return;

    // 1. Temizlik: Markdown bloklarını ve gereksiz boşlukları çıkar
    let cleanText = verifyText.trim().replace(/^```[\s\S]*?\n|^```|```$/g, '').trim();
    
    // 2. Normalizasyon: Satır sonlarını \n formatına getir (WhatsApp vb. platformlar \r\n ekleyebilir)
    cleanText = cleanText.replace(/\r\n/g, '\n');

    // 3. Etiketi ara (generateExportText ile aynı olmalı)
    const hashLabel = '[!] KONTROL_KODU: ';
    const lastLineStart = cleanText.lastIndexOf(hashLabel);

    if (lastLineStart === -1) {
      setVerifyResult({ success: false, message: 'Log içerisinde doğrulama kodu bulunamadı!' });
      return;
    }

    // 4. Hash ve İçeriği Ayrıştır
    const providedHash = cleanText.substring(lastLineStart + hashLabel.length).trim();
    // Hash satırından önceki tüm içerik (sonundaki \n dahil, çünkü generateExportText'te öyle)
    const contentToHash = cleanText.substring(0, lastLineStart);
    
    // 5. Karşılaştır
    const calculatedHash = generateDynamicHash(contentToHash);

    if (providedHash === calculatedHash) {
      setVerifyResult({ success: true, message: 'DOĞRULANDI: Veri orijinal.' });
    } else {
      // Debug için konsola basabiliriz
      if (import.meta.env.DEV) {
        console.log('Provided:', providedHash);
        console.log('Calculated:', calculatedHash);
      }
      setVerifyResult({ success: false, message: 'HATA: Veri manipüle edilmiş! Kod geçersiz.' });
    }
  };

  const handleGoogleSignIn = async () => {
    await googleDriveService.signIn();
    const user = googleDriveService.getUser();
    if (user) {
      setGoogleUser(user);
      refreshBackupList();
    }
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
    } catch (error) {
      setMessage({ type: 'error', text: 'Bulut yedeği oluşturulurken bir hata oluştu.' });
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
      if (jsonData && await importData(jsonData)) {
        await Dialog.alert({ title: 'Başarılı', message: 'Veriler geri yüklendi.', buttonTitle: 'Tamam' });
        window.location.reload();
      } else {
        setMessage({ type: 'error', text: 'Veri içe aktarma başarısız.' });
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
      } else {
        setMessage({ type: 'error', text: 'Yedek silinemedi.' });
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
      await clearAllData();
      await clearSalarySettings();
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
      const year = currentDate?.getFullYear() || today.getFullYear();
      const month = currentDate?.getMonth() ?? today.getMonth();
      const csv = generateCsvContent(year, month, monthlyData, settings, getHoliday);
      await saveBackupFile(csv, `Mesai-Rapor-${month + 1}.csv`);
      setMessage({ type: 'success', text: 'CSV Raporu oluşturuldu.' });
    } catch (e) {
      setMessage({ type: 'error', text: 'CSV hatası.' });
    }
  };

  const handleImportFromText = async () => {
    if (!pasteText.trim()) return;
    try {
      if (await importData(pasteText)) {
        await Dialog.alert({ title: 'Başarılı', message: 'Yedek metinden yüklendi.', buttonTitle: 'Tamam' });
        window.location.reload();
      } else {
        setMessage({ type: 'error', text: 'Geçersiz veri.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'İçe aktarma hatası.' });
    }
  };

  const handleImportFromFile = async () => {
    try {
      const data = await pickAndReadBackupFile();
      if (!data) return;
      const success = await importData(data);
      if (success) {
        await Dialog.alert({ title: 'Başarılı', message: 'Yedek dosyadan yüklendi.', buttonTitle: 'Tamam' });
        window.location.reload();
      } else {
        setMessage({ type: 'error', text: 'Geçersiz dosya içeriği.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Dosya okuma hatası.' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-hidden animate-in fade-in duration-300">
      <div 
        className="bg-gray-50 dark:bg-dark-bg rounded-[32px] w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] border border-white/10 overflow-hidden transition-all duration-300"
        style={modalStyle}
      >

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-5 pb-2">
          <div className="flex items-center gap-3">
            <div className="relative p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-[0_4px_10px_-2px_rgba(59,130,246,0.5),inset_0_1px_2px_rgba(255,255,255,0.4)] border-b-2 border-blue-800 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
              <Shield className="w-5 h-5 relative z-10" />
            </div>
            <h2 className="text-xl font-black text-gray-800 dark:text-white tracking-tight uppercase">Veri Yönetimi</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl bg-white dark:bg-gray-800 shadow-md active:scale-90 transition-all border border-gray-100 dark:border-gray-800"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tab Navigation - 3D Container */}
        <div className="flex-shrink-0 p-4 pt-2">
          <div className="grid grid-cols-4 gap-2 bg-gray-200/50 dark:bg-gray-900/50 p-2 rounded-[24px] shadow-inner border border-gray-200/50 dark:border-gray-700/50">
            <TabButton 
              id="cloud" 
              label="Bulut" 
              icon={Cloud} 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              className="py-3 px-1 gap-1.5"
              activeGradient="from-blue-500 to-indigo-600"
              shadowSize="shadow-[0_6px_12px_-2px_rgba(59,130,246,0.4),inset_0_2px_4px_rgba(255,255,255,0.3)]"
              iconSize={18}
              fontSize="text-[9px]"
            />
            <TabButton 
              id="backup" 
              label="Yedek" 
              icon={RefreshCw} 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              className="py-3 px-1 gap-1.5"
              activeGradient="from-blue-500 to-indigo-600"
              shadowSize="shadow-[0_6px_12px_-2px_rgba(59,130,246,0.4),inset_0_2px_4px_rgba(255,255,255,0.3)]"
              iconSize={18}
              fontSize="text-[9px]"
            />
            <TabButton 
              id="file" 
              label="Dosya" 
              icon={FileText} 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              className="py-3 px-1 gap-1.5"
              activeGradient="from-blue-500 to-indigo-600"
              shadowSize="shadow-[0_6px_12px_-2px_rgba(59,130,246,0.4),inset_0_2px_4px_rgba(255,255,255,0.3)]"
              iconSize={18}
              fontSize="text-[9px]"
            />
            <TabButton 
              id="tools" 
              label="Araçlar" 
              icon={Database} 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              className="py-3 px-1 gap-1.5"
              activeGradient="from-blue-500 to-indigo-600"
              shadowSize="shadow-[0_6px_12px_-2px_rgba(59,130,246,0.4),inset_0_2px_4px_rgba(255,255,255,0.3)]"
              iconSize={18}
              fontSize="text-[9px]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 pt-2 custom-scrollbar">
          {message && (
            <div className={`mb-5 p-4 rounded-2xl text-xs font-black flex items-center gap-3 animate-in fade-in zoom-in-95 shadow-lg border-b-4 ${message.type === 'success' ? 'bg-green-500 text-white border-green-700 shadow-green-500/20' : 'bg-red-500 text-white border-red-700 shadow-red-500/20'}`}>
              {message.type === 'success' ? <CheckCircle size={18} strokeWidth={3} /> : <AlertTriangle size={18} strokeWidth={3} />}
              <span className="uppercase tracking-widest">{message.text}</span>
            </div>
          )}

          {activeTab === 'cloud' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Google Drive Hesabı</h3>
                <div className="bg-orange-50/50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/20 p-5 space-y-5 shadow-inner">
                  
                  {/* Hesap Durumu */}
                  {googleUser ? (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-2xl border border-orange-100/50 dark:border-orange-800/30 shadow-md">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-tighter mb-0.5">Bağlı Hesap</span>
                          <span className="text-xs font-black text-gray-700 dark:text-gray-200 truncate max-w-[160px]">{googleUser.email}</span>
                        </div>
                        <button 
                          onClick={() => googleDriveService.signOut().then(() => setGoogleUser(null))}
                          className="p-3 bg-red-50 dark:bg-red-900/30 text-red-500 rounded-xl active:scale-90 transition-transform shadow-sm border border-red-100 dark:border-red-900/30"
                        >
                          <LogOut size={18} />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest opacity-70">Buluttaki Yedekleriniz</label>
                        <div className="max-h-80 overflow-y-auto custom-scrollbar pr-2">
                          {backups.length > 0 ? (
                            <div className="bg-white dark:bg-gray-900 rounded-[22px] border border-gray-100 dark:border-gray-800 shadow-sm divide-y divide-gray-50 dark:divide-gray-800/50 overflow-hidden">
                              {backups.map(file => (
                                <div key={file.id} className="py-1.5 px-3 flex items-center justify-between group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                  <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 bg-orange-50/50 dark:bg-orange-900/10 text-orange-500 rounded-lg shadow-inner">
                                      <Clock size={12} />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-[11px] font-black text-gray-800 dark:text-gray-200 uppercase leading-none">{new Date(file.createdTime).toLocaleDateString('tr-TR')}</span>
                                      <span className="text-[8px] text-gray-400 font-bold leading-none mt-0.5">{new Date(file.createdTime).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'})}</span>
                                    </div>
                                  </div>
                                  <div className="flex gap-1.5">
                                    <button onClick={() => handleRestore(file)} className="p-1.5 text-blue-500 bg-blue-50/50 dark:bg-blue-900/20 rounded-md active:scale-90 border border-blue-100/30 dark:border-blue-900/20 shadow-sm"><Download size={13} strokeWidth={2.5} /></button>
                                    <button onClick={() => handleDelete(file)} className="p-1.5 text-red-500 bg-red-50/50 dark:bg-red-900/20 rounded-md active:scale-90 border border-red-100/30 dark:border-blue-900/20 shadow-sm"><Trash2 size={13} strokeWidth={2.5} /></button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 bg-white dark:bg-gray-900 rounded-[24px] border border-dashed border-gray-200 dark:border-gray-800 shadow-inner">
                              <Cloud size={32} className="mx-auto text-gray-200 mb-2 opacity-40" />
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Yedek Bulunmuyor</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 space-y-5">
                      <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-500 text-white rounded-[28px] flex items-center justify-center mx-auto mb-2 shadow-xl shadow-orange-500/20 relative">
                        <div className="absolute top-1 left-2 right-2 h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-t-full" />
                        <Cloud size={40} strokeWidth={2.5} />
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed px-6 font-bold uppercase tracking-tight">
                        Bulut yedeklerini yönetmek için Google Drive hesabınızla bağlanmanız gerekmektedir.
                      </p>
                      <button 
                        onClick={handleGoogleSignIn}
                        className="group relative w-full py-4 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl font-black text-sm tracking-widest shadow-lg shadow-orange-500/20 border-b-4 border-orange-800 active:translate-y-1 active:border-b-0 transition-all overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                        GOOGLE İLE BAĞLAN
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">YEDEKLEME</h3>
                <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20 p-5 space-y-5 shadow-inner">
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <button 
                        onClick={handleGoogleBackup} 
                        disabled={loading}
                        className="group relative w-full py-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-[20px] font-black tracking-widest text-sm shadow-[0_8px_16px_-4px_rgba(59,130,246,0.4),inset_0_2px_4px_rgba(255,255,255,0.3)] border-b-4 border-indigo-800 active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center gap-2 overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                        {loading ? <RefreshCw className="animate-spin" size={20} /> : <Upload size={20} strokeWidth={2.5} />} 
                        <span className="relative z-10 uppercase">Manuel Yedekle</span>
                      </button>
                      
                      {/* Oto Yedekleme Toggle */}
                      <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-blue-100/50 dark:border-blue-800/30 shadow-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg transition-colors ${settings.autoBackupEnabled ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                              <RefreshCw size={18} className={settings.autoBackupEnabled ? 'animate-spin-slow' : ''} />
                            </div>
                            <div>
                              <span className="block text-sm font-semibold text-gray-700 dark:text-gray-200">Oto Yedekleme</span>
                              <span className="block text-[10px] text-gray-500 dark:text-gray-400 italic">Anlık bulut senkronizasyonu</span>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={!!settings.autoBackupEnabled}
                              onChange={(e) => updateSettings({ ...settings, autoBackupEnabled: e.target.checked })}
                            />
                            <div className="w-12 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500 shadow-inner"></div>
                          </label>
                        </div>
                        
                        {!googleUser && settings.autoBackupEnabled && (
                          <div className="mt-3 flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800/30 text-[9px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-tighter animate-pulse">
                            <AlertTriangle size={14} />
                            <span>Google Drive bağlantısı kurulu değil!</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'file' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Dışa Aktar ve Paylaş</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={handleShareAsTxt} className="group relative flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border border-green-200/50 dark:border-green-800/30 rounded-3xl active:scale-95 transition-all shadow-md">
                    <div className="p-3.5 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl shadow-[0_6px_12px_-2px_rgba(16,185,129,0.4),inset_0_1px_2px_rgba(255,255,255,0.4)] border-b-2 border-green-800 group-hover:scale-110 transition-transform relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                      <Share2 size={22} strokeWidth={2.5} />
                    </div>
                    <span className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase tracking-tighter">TXT PAYLAŞ</span>
                  </button>
                  <button onClick={handleExportCsv} className="group relative flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-900/10 dark:to-fuchsia-900/10 border border-purple-200/50 dark:border-purple-800/30 rounded-3xl active:scale-95 transition-all shadow-md">
                    <div className="p-3.5 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl shadow-[0_6px_12px_-2px_rgba(168,85,247,0.4),inset_0_1px_2px_rgba(255,255,255,0.4)] border-b-2 border-purple-800 group-hover:scale-110 transition-transform relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                      <FileSpreadsheet size={22} strokeWidth={2.5} />
                    </div>
                    <span className="text-[10px] font-black text-purple-700 dark:text-purple-400 uppercase tracking-tighter">CSV RAPORU</span>
                  </button>
                </div>

                <div className="bg-gray-100/50 dark:bg-gray-800/40 rounded-[28px] border border-gray-200 dark:border-gray-800 p-5 space-y-4 shadow-inner">
                  <button 
                    onClick={() => { navigator.clipboard.writeText(exportAllData()); setMessage({type:'success', text:'Yedek metni kopyalandı!'}) }}
                    className="group w-full flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 active:scale-[0.98] transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-gray-50 dark:bg-gray-800 text-gray-600 rounded-xl shadow-inner group-hover:text-blue-500 transition-colors">
                        <Copy size={18} />
                      </div>
                      <span className="text-sm font-black text-gray-700 dark:text-gray-200 uppercase tracking-tight">Metni Kopyala</span>
                    </div>
                    <ChevronRight size={18} className="text-gray-300" />
                  </button>

                  <button 
                    onClick={() => setShowPasteArea(!showPasteArea)}
                    className="group w-full flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 active:scale-[0.98] transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl shadow-inner group-hover:bg-blue-100 transition-colors">
                        <FileText size={18} />
                      </div>
                      <span className="text-sm font-black text-gray-700 dark:text-gray-200 uppercase tracking-tight">Yedek Metni Yükle</span>
                    </div>
                    <ChevronRight size={18} className={`text-gray-300 transition-transform duration-300 ${showPasteArea ? 'rotate-90' : ''}`} />
                  </button>

                  {showPasteArea && (
                    <div className="space-y-4 pt-2 animate-in slide-in-from-top-3">
                      <textarea 
                        value={pasteText} 
                        onChange={(e)=>setPasteText(e.target.value)} 
                        placeholder="Yedek metnini buraya yapıştırın..." 
                        className="w-full h-32 p-4 text-[10px] font-mono border-2 rounded-[20px] dark:bg-gray-950 dark:text-white border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500 outline-none shadow-inner resize-none" 
                      />
                      <button 
                        onClick={handleImportFromText} 
                        className="group relative w-full py-4 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 border-b-4 border-blue-800 active:translate-y-1 active:border-b-0 transition-all overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                        METİNDEN GERİ YÜKLE
                      </button>
                      
                      <div className="relative flex py-3 items-center">
                        <div className="flex-grow border-t-2 border-dashed border-gray-200 dark:border-gray-800"></div>
                        <span className="flex-shrink mx-4 text-gray-400 text-[9px] font-black uppercase tracking-widest">VEYA</span>
                        <div className="flex-grow border-t-2 border-dashed border-gray-200 dark:border-gray-800"></div>
                      </div>

                      <button 
                        onClick={handleImportFromFile}
                        className="group relative w-full py-4 bg-white dark:bg-gray-900 border-2 border-dashed border-blue-400 text-blue-600 dark:text-blue-400 rounded-2xl font-black text-xs uppercase tracking-widest active:bg-blue-50 transition-all"
                      >
                        DOSYADAN SEÇ VE YÜKLE
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'tools' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <section className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Veri Güvenliği ve Temizlik</h3>
                
                {/* Log Doğrulama */}
                <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/20 p-5 space-y-5 shadow-inner">
                  <button 
                    onClick={() => setShowVerifyArea(!showVerifyArea)}
                    className="group w-full flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-xl shadow-md">
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <span className="block text-sm font-black text-gray-700 dark:text-gray-200 uppercase tracking-tight">Log Doğrulama</span>
                        <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase opacity-70 tracking-tighter">Veri orijinalliğini kontrol et</span>
                      </div>
                    </div>
                    <ChevronRight size={18} className={`text-emerald-300 transition-transform duration-300 ${showVerifyArea ? 'rotate-90' : ''}`} />
                  </button>

                  {showVerifyArea && (
                    <div className="space-y-4 pt-2 animate-in slide-in-from-top-3">
                      <textarea 
                        value={verifyText} 
                        onChange={(e) => { setVerifyText(e.target.value); setVerifyResult(null); }} 
                        placeholder="Doğrulanacak log metnini buraya yapıştırın..." 
                        className="w-full h-36 p-4 text-[10px] font-mono border-2 rounded-[20px] dark:bg-gray-950 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800 focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner resize-none" 
                      />
                      <button 
                        onClick={handleVerifyLog} 
                        disabled={!verifyText.trim()}
                        className="group relative w-full py-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl font-black text-sm tracking-widest shadow-lg shadow-emerald-600/20 border-b-4 border-emerald-800 active:translate-y-1 active:border-b-0 disabled:opacity-50 transition-all overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                        <div className="flex items-center justify-center gap-2 relative z-10">
                          <RefreshCw size={20} strokeWidth={3} className={loading ? 'animate-spin' : ''} /> 
                          <span>DOĞRULA</span>
                        </div>
                      </button>
                      
                      {verifyResult && (
                        <div className={`p-5 rounded-[22px] text-xs font-black flex items-start gap-4 shadow-xl animate-in zoom-in-95 duration-300 border-b-4 ${
                          verifyResult.success 
                            ? 'bg-emerald-600 text-white border-emerald-800' 
                            : 'bg-red-600 text-white border-red-800'
                        }`}>
                          <div className="mt-0.5 p-1.5 bg-white/20 rounded-lg shadow-inner">
                            {verifyResult.success ? <CheckCircle size={20} strokeWidth={3} /> : <AlertTriangle size={20} strokeWidth={3} />}
                          </div>
                          <span className="leading-relaxed uppercase tracking-widest">{verifyResult.message}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Sıfırlama */}
                <div className="bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 p-5 space-y-5 shadow-inner">
                  <div className="flex items-center gap-4 text-red-600">
                    <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl shadow-inner">
                      <Trash2 size={20} strokeWidth={2.5} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">Tehlikeli Bölge</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-tighter italic leading-relaxed px-1">
                    Bu işlem tüm kayıtlarınızı ve ayarlarınız kalıcı olarak siler. Lütfen yedek aldığınızdan emin olun.
                  </p>
                  <button 
                    onClick={handleClear} 
                    className="group relative w-full py-4 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 border-b-4 border-red-800 active:translate-y-1 active:border-b-0 transition-all overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                    TÜM VERİLERİ SIFIRLA
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer - 3D Closing Button */}
        <div 
          className="flex-shrink-0 p-5 pt-2 bg-gray-50 dark:bg-gray-800/20 border-t border-gray-100 dark:border-gray-800 rounded-b-[32px]"
          style={buttonContainerStyle}
        >
          <button 
            onClick={onClose} 
            className="group relative w-full py-4 bg-gradient-to-br from-white to-gray-100 dark:from-gray-700 dark:to-gray-800 text-gray-500 dark:text-gray-400 rounded-2xl font-black uppercase tracking-widest text-sm shadow-md border-b-4 border-gray-300 dark:border-gray-950 active:translate-y-1 active:border-b-0 transition-all overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            KAPAT
          </button>
        </div>
      </div>
    </div>
  );
};
