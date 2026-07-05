import React, { useRef, useEffect } from 'react';

import { X, Download, Upload, Shield, AlertTriangle, CheckCircle, Cloud, LogOut, Trash2, RefreshCw, Clock, Copy, Share2, FileText, FileSpreadsheet, ChevronRight, ShieldCheck, Database, Info, CalendarDays, Plus, Landmark, Moon, FolderOpen, FolderX, FolderInput, Pencil } from 'lucide-react';

import { googleDriveService, DriveFile } from '../utils/googleDriveService';

import { TabButton } from './TabButton';

import { useAndroidSafeArea } from '../hooks/useAndroidSafeArea';

import { useDataBackupLogic } from '../hooks/useDataBackupLogic';

interface DataBackupModalTailwindProps {

  isOpen: boolean;

  onClose: () => void;

  currentDate?: Date;

}

export const DataBackupModalTailwind: React.FC<DataBackupModalTailwindProps> = ({ isOpen, onClose, currentDate }) => {

  const { modalStyle, buttonContainerStyle } = useAndroidSafeArea();

  const {
    isWeb, today,
    activeTab, setActiveTab,
    message, setMessage, loading,
    googleUser, setGoogleUser,
    backups,
    showPasteArea, setShowPasteArea,
    pasteText, setPasteText,
    showVerifyArea, setShowVerifyArea,
    verifyText, setVerifyText,
    verifyResult, setVerifyResult,
    settings, updateSettings,
    exportAllData,
    handleVerifyLog,
    handleGoogleSignIn,
    handleGoogleBackup,
    handleRestore,
    handleDelete,
    handleClear,
    handleShareAsTxt,
    handleExportCsv,
    handleImportFromText,
    handleImportFromFile,
    folderBackupSupported,
    backupFolderName,
    folderBackups,
    folderBackupsRefreshing,
    handlePickBackupFolder,
    handleRemoveBackupFolder,
    handleBackupToFolder,
    handleRestoreFromFolder,
    handleDeleteFolderBackupFile,
    diniLoading, diniError, diniLastUpdated, refreshDini,
    resmiLoading, resmiError, resmiLastUpdated, refreshResmi,
    customHolidays,
    newHolidayDate, setNewHolidayDate,
    newHolidayName, setNewHolidayName,
    newHolidayShortName, setNewHolidayShortName,
    newHolidayType, setNewHolidayType,
    newHolidayHalfDay, setNewHolidayHalfDay,
    newHolidayRecurring, setNewHolidayRecurring,
    editingHolidayDate,
    handleAddCustomHoliday,
    handleStartEditCustomHoliday,
    handleCancelEditCustomHoliday,
    handleRemoveCustomHoliday,
    formatTurkishDate,
    parseDate,
  } = useDataBackupLogic(isOpen, currentDate);

  const messageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (message) {
      messageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [message]);

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

          <div className="grid grid-cols-5 gap-2 bg-gray-200/50 dark:bg-gray-900/50 p-2 rounded-[24px] shadow-inner border border-gray-200/50 dark:border-gray-700/50">

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

              fontSize="text-[0.5625rem]"

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

              fontSize="text-[0.5625rem]"

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

              fontSize="text-[0.5625rem]"

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

              fontSize="text-[0.5625rem]"

            />

            <TabButton 

              id="holidays" 

              label="Tatiller" 

              icon={CalendarDays} 

              activeTab={activeTab} 

              setActiveTab={setActiveTab} 

              className="py-3 px-1 gap-1.5"

              activeGradient="from-blue-500 to-indigo-600"

              shadowSize="shadow-[0_6px_12px_-2px_rgba(59,130,246,0.4),inset_0_2px_4px_rgba(255,255,255,0.3)]"

              iconSize={18}

              fontSize="text-[0.5625rem]"

            />

          </div>

        </div>



        <div className="flex-1 overflow-y-auto p-5 pt-2 custom-scrollbar">

          {message && (

            <div ref={messageRef} className={`mb-5 p-4 rounded-2xl text-xs font-black flex items-center gap-3 animate-in fade-in zoom-in-95 shadow-lg border-b-4 ${message.type === 'success' ? 'bg-green-500 text-white border-green-700 shadow-green-500/20' : 'bg-red-500 text-white border-red-700 shadow-red-500/20'}`}>

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

                          <span className="text-[0.5625rem] font-black text-orange-600 dark:text-orange-400 uppercase tracking-tighter mb-0.5">Bağlı Hesap</span>

                          <span className="text-xs font-black text-gray-700 dark:text-gray-200 truncate max-w-[160px]">{googleUser.email}</span>

                        </div>

                        <button 

                          onClick={() => googleDriveService.signOut().then(() => setGoogleUser(null))}

                          className="p-3 bg-red-50 dark:bg-red-900/30 text-red-500 rounded-xl active:scale-90 transition-transform shadow-sm border border-red-100 dark:border-red-900/30"

                        >

                          <LogOut size={18} />

                        </button>

                      </div>



                      <button

                        onClick={handleGoogleBackup}

                        disabled={loading}

                        className="group relative w-full py-4 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl font-black text-sm tracking-widest shadow-lg shadow-orange-500/20 border-b-4 border-orange-800 active:translate-y-1 active:border-b-0 disabled:opacity-50 transition-all overflow-hidden flex items-center justify-center gap-2"

                      >

                        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

                        {loading ? <RefreshCw className="animate-spin relative z-10" size={18} /> : <Upload size={18} strokeWidth={2.5} className="relative z-10" />}

                        <span className="relative z-10 uppercase">Şimdi Buluta Yedekle</span>

                      </button>



                      <div className="space-y-3">

                        <label className="text-[0.625rem] font-black text-gray-400 uppercase ml-2 tracking-widest opacity-70">Buluttaki Yedekleriniz</label>

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

                                      <span className="text-[0.6875rem] font-black text-gray-800 dark:text-gray-200 uppercase leading-none">{new Date(file.createdTime).toLocaleDateString('tr-TR')}</span>

                                      <span className="text-[0.5rem] text-gray-400 font-bold leading-none mt-0.5">{new Date(file.createdTime).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'})}</span>

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

                              <p className="text-[0.625rem] text-gray-400 font-black uppercase tracking-widest">Yedek Bulunmuyor</p>

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

                      <p className="text-[0.6875rem] text-gray-500 dark:text-gray-400 leading-relaxed px-6 font-bold uppercase tracking-tight">

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

                <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20 p-5 space-y-4 shadow-inner">
                  {!folderBackupSupported ? (
                    <div className="flex items-start gap-3 p-3.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/30">
                      <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-[0.625rem] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-tighter leading-relaxed">
                        Bu özellik bu ortamda desteklenmiyor. Mobil uygulamada veya masaüstü Chrome/Edge tarayıcısında kullanılabilir.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Klasör Durumu */}
                      <div className="flex items-center justify-between gap-3 p-3.5 bg-white dark:bg-gray-900 rounded-2xl border border-blue-100/50 dark:border-blue-800/30 shadow-md">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-md flex-shrink-0">
                            <FolderOpen size={18} />
                          </div>
                          <div className="min-w-0">
                            <span className="block text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-tight truncate">
                              {backupFolderName || 'Klasör Seçilmedi'}
                            </span>
                            <span className="block text-[0.5625rem] text-blue-500 dark:text-blue-400 font-bold uppercase opacity-70 tracking-tighter">
                              {backupFolderName ? 'Yedekleme klasörü' : 'İnternet/Google hesabı gerektirmez'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            onClick={handlePickBackupFolder}
                            className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-[0.5625rem] font-black uppercase tracking-tight active:scale-95 transition-all border border-blue-100 dark:border-blue-800/40"
                          >
                            {backupFolderName ? 'Değiştir' : 'Seç'}
                          </button>
                          {backupFolderName && (
                            <button
                              onClick={handleRemoveBackupFolder}
                              className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl active:scale-90 transition-all"
                            >
                              <FolderX size={16} />
                            </button>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={handleBackupToFolder}
                        disabled={loading || !backupFolderName}
                        className="group relative w-full py-4 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-[20px] font-black tracking-widest text-sm shadow-[0_8px_16px_-4px_rgba(59,130,246,0.4),inset_0_2px_4px_rgba(255,255,255,0.3)] border-b-4 border-indigo-800 active:translate-y-1 active:border-b-0 disabled:opacity-50 transition-all flex items-center justify-center gap-2 overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                        {loading ? <RefreshCw className="animate-spin" size={20} /> : <FolderInput size={20} strokeWidth={2.5} />}
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
                              <span className="block text-[0.625rem] text-gray-500 dark:text-gray-400 italic">Seçili klasöre otomatik yedekler</span>
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

                        {settings.autoBackupEnabled && (
                          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-2">
                            <label className="block text-[0.625rem] font-black text-gray-400 uppercase mb-2 ml-1 tracking-widest">Yedekleme Periyodu</label>
                            <div className="grid grid-cols-3 gap-2">
                              {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                                <button
                                  key={period}
                                  onClick={() => updateSettings({ ...settings, autoBackupPeriod: period })}
                                  className={`py-2 px-1 rounded-xl text-[0.625rem] font-black uppercase transition-all border-b-2 active:translate-y-0.5 active:border-b-0 ${
                                    settings.autoBackupPeriod === period || (!settings.autoBackupPeriod && period === 'weekly')
                                      ? 'bg-orange-500 text-white border-orange-700 shadow-md'
                                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'
                                  }`}
                                >
                                  {period === 'daily' ? 'Günlük' : period === 'weekly' ? 'Haftalık' : 'Aylık'}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {!backupFolderName && settings.autoBackupEnabled && (
                          <div className="mt-3 flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800/30 text-[0.5625rem] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-tighter animate-pulse">
                            <AlertTriangle size={14} />
                            <span>Önce bir yedekleme klasörü seçmelisiniz!</span>
                          </div>
                        )}
                      </div>

                      {backupFolderName && (
                        <div className="space-y-3">
                          <label className="text-[0.625rem] font-black text-gray-400 uppercase ml-1 tracking-widest opacity-70">Klasördeki Yedekler</label>
                          <div className="max-h-64 overflow-y-auto custom-scrollbar pr-2">
                            {folderBackups.length > 0 ? (
                              <div className="bg-white dark:bg-gray-900 rounded-[22px] border border-gray-100 dark:border-gray-800 shadow-sm divide-y divide-gray-50 dark:divide-gray-800/50 overflow-hidden">
                                {folderBackups.map(file => (
                                  <div key={file.name} className="py-1.5 px-3 flex items-center justify-between group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="p-1.5 bg-blue-50/50 dark:bg-blue-900/10 text-blue-500 rounded-lg shadow-inner flex-shrink-0">
                                        <Clock size={12} />
                                      </div>
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-[0.6875rem] font-black text-gray-800 dark:text-gray-200 uppercase leading-none">{file.date.toLocaleDateString('tr-TR')}</span>
                                        <span className="text-[0.5rem] text-gray-400 font-bold leading-none mt-0.5">{file.date.toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'})}</span>
                                      </div>
                                    </div>
                                    <div className="flex gap-1.5 flex-shrink-0">
                                      <button onClick={() => handleRestoreFromFolder(file.name)} className="p-1.5 text-blue-500 bg-blue-50/50 dark:bg-blue-900/20 rounded-md active:scale-90 border border-blue-100/30 dark:border-blue-900/20 shadow-sm"><Download size={13} strokeWidth={2.5} /></button>
                                      <button onClick={() => handleDeleteFolderBackupFile(file.name)} className="p-1.5 text-red-500 bg-red-50/50 dark:bg-red-900/20 rounded-md active:scale-90 border border-red-100/30 dark:border-blue-900/20 shadow-sm"><Trash2 size={13} strokeWidth={2.5} /></button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6 bg-white dark:bg-gray-900 rounded-[24px] border border-dashed border-gray-200 dark:border-gray-800 shadow-inner">
                                <FolderOpen size={28} className="mx-auto text-gray-200 mb-2 opacity-40" />
                                <p className="text-[0.625rem] text-gray-400 font-black uppercase tracking-widest">{folderBackupsRefreshing ? 'Yükleniyor...' : 'Yedek Bulunmuyor'}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <p className="text-[0.5625rem] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-tighter leading-relaxed px-1">
                        Otomatik yedekleme artık Google Drive yerine seçtiğiniz yerel klasöre yazar — internet/hesap gerektirmez. Google Drive'a manuel yedeklemek için "Bulut" sekmesini kullanabilirsiniz.
                      </p>
                    </>
                  )}
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

                    <span className="text-[0.625rem] font-black text-green-700 dark:text-green-400 uppercase tracking-tighter">TXT PAYLAŞ</span>

                  </button>

                  <button onClick={handleExportCsv} className="group relative flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-900/10 dark:to-fuchsia-900/10 border border-purple-200/50 dark:border-purple-800/30 rounded-3xl active:scale-95 transition-all shadow-md">

                    <div className="p-3.5 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl shadow-[0_6px_12px_-2px_rgba(168,85,247,0.4),inset_0_1px_2px_rgba(255,255,255,0.4)] border-b-2 border-purple-800 group-hover:scale-110 transition-transform relative overflow-hidden">

                      <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

                      <FileSpreadsheet size={22} strokeWidth={2.5} />

                    </div>

                    <span className="text-[0.625rem] font-black text-purple-700 dark:text-purple-400 uppercase tracking-tighter">CSV RAPORU</span>

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

                        className="w-full h-32 p-4 text-[0.625rem] font-mono border-2 rounded-[20px] dark:bg-gray-950 dark:text-white border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-blue-500 outline-none shadow-inner resize-none" 

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

                        <span className="flex-shrink mx-4 text-gray-400 text-[0.5625rem] font-black uppercase tracking-widest">VEYA</span>

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

                        <span className="block text-[0.625rem] text-emerald-600 dark:text-emerald-400 font-bold uppercase opacity-70 tracking-tighter">Veri orijinalliğini kontrol et</span>

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

                        className="w-full h-36 p-4 text-[0.625rem] font-mono border-2 rounded-[20px] dark:bg-gray-950 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800 focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner resize-none" 

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

                  <p className="text-[0.6875rem] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-tighter italic leading-relaxed px-1">

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

          {activeTab === 'holidays' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <section className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Online Güncelleme</h3>

                <div className="grid grid-cols-2 gap-3">
                  {/* Resmi Tatiller - kompakt kart */}
                  <div className="bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20 p-3.5 space-y-2.5 shadow-inner">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg shadow-md flex-shrink-0">
                        <Landmark size={14} />
                      </div>
                      <span className="text-[0.625rem] font-black text-gray-700 dark:text-gray-200 uppercase tracking-tight truncate">Resmi</span>
                    </div>

                    <span className="block text-[0.5rem] text-red-500 dark:text-red-400 font-bold uppercase opacity-70 tracking-tighter leading-tight min-h-[2.2em]">
                      {resmiLastUpdated ? formatTurkishDate(resmiLastUpdated) : 'Yerleşik veri'}
                    </span>

                    {resmiError && (
                      <div className="flex items-center gap-1 p-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-100 dark:border-amber-800/30">
                        <AlertTriangle size={10} className="text-amber-500 flex-shrink-0" />
                        <span className="text-[0.4375rem] text-amber-600 dark:text-amber-400 font-bold uppercase leading-none">Hata</span>
                      </div>
                    )}

                    <button
                      onClick={() => refreshResmi()}
                      disabled={resmiLoading}
                      className="group relative w-full py-2.5 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl font-black text-[0.5625rem] tracking-wide shadow-md border-b-2 border-red-800 active:translate-y-0.5 active:border-b-0 disabled:opacity-60 transition-all overflow-hidden"
                    >
                      <div className="flex items-center justify-center gap-1 relative z-10">
                        <RefreshCw size={12} strokeWidth={3} className={resmiLoading ? 'animate-spin' : ''} />
                        <span>{resmiLoading ? '...' : 'GÜNCELLE'}</span>
                      </div>
                    </button>
                  </div>

                  {/* Dini Bayramlar - kompakt kart */}
                  <div className="bg-green-50/50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-900/20 p-3.5 space-y-2.5 shadow-inner">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-md flex-shrink-0">
                        <Moon size={14} />
                      </div>
                      <span className="text-[0.625rem] font-black text-gray-700 dark:text-gray-200 uppercase tracking-tight truncate">Dini</span>
                    </div>

                    <span className="block text-[0.5rem] text-green-600 dark:text-green-400 font-bold uppercase opacity-70 tracking-tighter leading-tight min-h-[2.2em]">
                      {diniLastUpdated ? formatTurkishDate(diniLastUpdated) : 'Yerleşik veri'}
                    </span>

                    {diniError && (
                      <div className="flex items-center gap-1 p-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-100 dark:border-amber-800/30">
                        <AlertTriangle size={10} className="text-amber-500 flex-shrink-0" />
                        <span className="text-[0.4375rem] text-amber-600 dark:text-amber-400 font-bold uppercase leading-none">Hata</span>
                      </div>
                    )}

                    <button
                      onClick={() => refreshDini()}
                      disabled={diniLoading}
                      className="group relative w-full py-2.5 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl font-black text-[0.5625rem] tracking-wide shadow-md border-b-2 border-green-800 active:translate-y-0.5 active:border-b-0 disabled:opacity-60 transition-all overflow-hidden"
                    >
                      <div className="flex items-center justify-center gap-1 relative z-10">
                        <RefreshCw size={12} strokeWidth={3} className={diniLoading ? 'animate-spin' : ''} />
                        <span>{diniLoading ? '...' : 'GÜNCELLE'}</span>
                      </div>
                    </button>
                  </div>
                </div>

                <p className="text-[0.5625rem] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-tighter leading-relaxed px-1">
                  Resmi tatillerin sabit tarihli olanları (Yılbaşı, 23 Nisan vb.) internet olmasa bile her yıl için otomatik gösterilir.
                </p>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between pl-1 pr-1">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    {editingHolidayDate ? 'Özel Günü Düzenle' : 'Manuel Olarak Ekle'}
                  </h3>
                  {editingHolidayDate && (
                    <button
                      onClick={handleCancelEditCustomHoliday}
                      className="text-[0.5625rem] font-black text-gray-400 uppercase tracking-widest underline active:text-gray-600"
                    >
                      Vazgeç
                    </button>
                  )}
                </div>

                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/20 p-5 space-y-4 shadow-inner">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewHolidayType('official')}
                      className={`py-2.5 rounded-xl text-[0.625rem] font-black uppercase transition-all border-b-2 active:translate-y-0.5 active:border-b-0 ${
                        newHolidayType === 'official'
                          ? 'bg-red-500 text-white border-red-700 shadow-md'
                          : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      Resmi Tatil
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewHolidayType('religious')}
                      className={`py-2.5 rounded-xl text-[0.625rem] font-black uppercase transition-all border-b-2 active:translate-y-0.5 active:border-b-0 ${
                        newHolidayType === 'religious'
                          ? 'bg-green-500 text-white border-green-700 shadow-md'
                          : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      Dini Bayram
                    </button>
                  </div>

                  <div>
                    <label className="block text-[0.625rem] font-black text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Tarih</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={newHolidayDate}
                        onChange={(e) => setNewHolidayDate(e.target.value)}
                        className="w-full p-3.5 pr-10 text-sm font-bold border-2 rounded-2xl dark:bg-gray-950 dark:text-gray-200 border-indigo-100 dark:border-indigo-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner"
                      />
                      <CalendarDays size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[0.625rem] font-black text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Tatil Adı</label>
                    <input
                      type="text"
                      value={newHolidayName}
                      onChange={(e) => setNewHolidayName(e.target.value)}
                      placeholder="Örn: Kurban Bayramı 1. Gün"
                      className="w-full p-3.5 text-sm font-bold border-2 rounded-2xl dark:bg-gray-950 dark:text-gray-200 border-indigo-100 dark:border-indigo-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-[0.625rem] font-black text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Kısa Ad (Takvimde Görünür)</label>
                    <input
                      type="text"
                      value={newHolidayShortName}
                      onChange={(e) => setNewHolidayShortName(e.target.value)}
                      placeholder="Örn: Kurban"
                      maxLength={10}
                      className="w-full p-3.5 text-sm font-bold border-2 rounded-2xl dark:bg-gray-950 dark:text-gray-200 border-indigo-100 dark:border-indigo-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 p-3 bg-white dark:bg-gray-900 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/30 shadow-md cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newHolidayHalfDay}
                        onChange={(e) => setNewHolidayHalfDay(e.target.checked)}
                        className="w-4 h-4 rounded accent-amber-500 flex-shrink-0"
                      />
                      <span className="text-[0.6875rem] font-bold text-gray-600 dark:text-gray-300 leading-tight">Yarım gün</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 bg-white dark:bg-gray-900 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/30 shadow-md cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newHolidayRecurring}
                        onChange={(e) => setNewHolidayRecurring(e.target.checked)}
                        className="w-4 h-4 rounded accent-indigo-500 flex-shrink-0"
                      />
                      <span className="text-[0.6875rem] font-bold text-gray-600 dark:text-gray-300 leading-tight">Her yıl tekrarla</span>
                    </label>
                  </div>

                  <button
                    onClick={handleAddCustomHoliday}
                    className="group relative w-full py-4 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-2xl font-black text-sm tracking-widest shadow-lg shadow-indigo-600/20 border-b-4 border-indigo-800 active:translate-y-1 active:border-b-0 transition-all overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                    <div className="flex items-center justify-center gap-2 relative z-10">
                      {editingHolidayDate ? <Pencil size={18} strokeWidth={2.5} /> : <Plus size={20} strokeWidth={3} />}
                      <span>{editingHolidayDate ? 'GÜNCELLE' : 'ÖZEL GÜN EKLE'}</span>
                    </div>
                  </button>
                </div>

                {customHolidays.length > 0 ? (
                  <div className="space-y-2">
                    {customHolidays.map((h) => (
                      <div
                        key={h.date}
                        className={`flex items-center justify-between gap-3 p-3.5 bg-white dark:bg-gray-900 rounded-2xl border shadow-md transition-colors ${
                          editingHolidayDate === h.date ? 'border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-200 dark:ring-indigo-900' : 'border-gray-100 dark:border-gray-800'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="block text-xs font-black text-gray-700 dark:text-gray-200 truncate">{h.name}</span>
                          <span className="block text-[0.625rem] text-gray-400 font-bold uppercase tracking-tighter">
                            {h.recurring ? `Her Yıl ${formatTurkishDate(parseDate(h.date)).split(' ').slice(0, 2).join(' ')}` : formatTurkishDate(parseDate(h.date))} · {h.type === 'official' ? 'Resmi' : 'Dini'}{h.isHalfDay ? ' · Yarım Gün' : ''}
                          </span>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleStartEditCustomHoliday(h)}
                            className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-xl active:scale-90 transition-all"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleRemoveCustomHoliday(h.date, h.name)}
                            className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl active:scale-90 transition-all"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[0.6875rem] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-tighter italic text-center py-4">
                    Henüz manuel olarak eklenmiş özel gün yok.
                  </p>
                )}
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

