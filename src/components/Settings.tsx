import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Square, Settings as SettingsIcon, User, Briefcase, Percent, RefreshCw, ExternalLink, Info, Calendar, Moon, Sun } from 'lucide-react';
import { useSalarySettings } from '../hooks/useSalarySettings';
import { SalarySettings as SalarySettingsType } from '../types/overtime';
import { ThemeSwitcher } from './ThemeSwitcher';
import { APP_VERSION } from './AboutModal';
import { getMonthKey } from '../utils/dateUtils';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
}

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, currentDate }) => {
  const { settings, updateSettings, getSalaryForDate } = useSalarySettings();
  const [formData, setFormData] = useState<SalarySettingsType>({
    ...settings,
    shiftSystemEnabled: settings.shiftSystemEnabled ?? false,
    shiftSystemType: settings.shiftSystemType ?? '2-shift',
    shiftStartDate: settings.shiftStartDate ?? new Date().toISOString().split('T')[0],
    shiftInitialType: settings.shiftInitialType ?? 'day'
  });
  const [updateStatus, setUpdateStatus] = useState<{
    loading: boolean;
    version?: string;
    isNew?: boolean;
    error?: string;
  }>({ loading: false });

  useEffect(() => {
    if (isOpen) {
      const monthSalary = getSalaryForDate(currentDate);
      setFormData({
        ...settings,
        monthlyGrossSalary: monthSalary.monthlyGrossSalary,
        bonus: monthSalary.bonus,
        tesRate: settings.tesRate ?? 3,
        shiftSystemEnabled: settings.shiftSystemEnabled ?? false,
        shiftSystemType: settings.shiftSystemType ?? '2-shift',
        shiftStartDate: settings.shiftStartDate ?? new Date().toISOString().split('T')[0],
        shiftInitialType: settings.shiftInitialType ?? 'day'
      });
    }
  }, [settings, isOpen, currentDate, getSalaryForDate]);

  const handleSave = () => {
    const monthKey = getMonthKey(currentDate);
    updateSettings(formData, monthKey);
    onClose();
  };

  const checkUpdates = async () => {
    setUpdateStatus({ loading: true });
    try {
      const response = await fetch('https://api.github.com/repos/efek0349/mesaitakip/releases/latest');
      if (!response.ok) throw new Error('Güncelleme kontrolü başarısız.');
      
      const data = await response.json();
      const latestVersion = data.tag_name.replace('v', '');
      
      // Semantik Versiyon Karşılaştırması (1.6.6 > 1.6.5 kontrolü)
      const compareVersions = (v1: string, v2: string) => {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
          const p1 = parts1[i] || 0;
          const p2 = parts2[i] || 0;
          if (p1 > p2) return 1; // v1 daha büyük
          if (p1 < p2) return -1; // v2 daha büyük
        }
        return 0; // Eşit
      };

      const hasNewVersion = compareVersions(latestVersion, APP_VERSION) === 1;
      
      setUpdateStatus({
        loading: false,
        version: latestVersion,
        isNew: hasNewVersion
      });
    } catch (error) {
      setUpdateStatus({ loading: false, error: 'Sunucuya ulaşılamadı. Lütfen internet bağlantınızı kontrol edin.' });
    }
  };

  const handleInputChange = (field: keyof SalarySettingsType, value: any) => {
    // Sayısal alanlar için özel kontrol
    if (field === 'monthlyGrossSalary' || field === 'bonus' || field === 'monthlyWorkingHours' || field === 'tesRate' || field.toString().includes('Multiplier')) {
      // Sadece rakam ve nokta/virgül izni ver, virgülü noktaya çevir
      let stringValue = String(value).replace(/[^0-9.,]/g, '').replace(',', '.');
      
      // Birden fazla nokta olmasını engelle
      const parts = stringValue.split('.');
      if (parts.length > 2) {
        stringValue = parts[0] + '.' + parts.slice(1).join('');
      }

      setFormData(prev => ({ ...prev, [field]: stringValue as any }));
      return;
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  const grossHourlyRate = (Number(formData.monthlyGrossSalary) / Number(formData.monthlyWorkingHours)) || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-dark-bg rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-full">
        
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Ayarlar</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full active:bg-gray-100 dark:active:bg-gray-600"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">

          {/* Update Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <RefreshCw size={18} className={updateStatus.loading ? 'animate-spin' : ''} /> Uygulama Sürümü
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Mevcut Sürüm</span>
                  <span className="text-xs text-gray-500 font-mono tracking-tighter">v{APP_VERSION}</span>
                </div>
                <button 
                  onClick={checkUpdates}
                  disabled={updateStatus.loading}
                  className="px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg active:scale-95 transition-transform"
                >
                  {updateStatus.loading ? 'Denetleniyor...' : 'Güncellemeleri Denetle'}
                </button>
              </div>

              {updateStatus.version && (
                <div className={`p-3 rounded-lg flex items-start gap-3 ${updateStatus.isNew ? 'bg-orange-50 dark:bg-orange-900/30' : 'bg-green-50 dark:bg-green-900/30'}`}>
                  {updateStatus.isNew ? <Info className="w-4 h-4 text-orange-600 mt-0.5" /> : <Info className="w-4 h-4 text-green-600 mt-0.5" />}
                  <div className="flex-1">
                    <p className={`text-xs font-bold ${updateStatus.isNew ? 'text-orange-800 dark:text-orange-200' : 'text-green-800 dark:text-green-200'}`}>
                      {updateStatus.isNew ? `Yeni Sürüm (v${updateStatus.version}) Mevcut!` : 'Uygulamanız Güncel.'}
                    </p>
                    {updateStatus.isNew && (
                      <a 
                        href="https://github.com/efek0349/mesaitakip/releases" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] text-orange-600 dark:text-orange-400 underline flex items-center gap-1 mt-1"
                      >
                        İndirmek için tıklayın <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {updateStatus.error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg text-xs font-medium text-red-600 dark:text-red-400">
                  {updateStatus.error}
                </div>
              )}
            </div>
          </div>

          {/* General Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <SettingsIcon size={18} /> Genel Ayarlar
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-4">
              <ThemeSwitcher />
              <div>
                <button 
                  onClick={() => handleInputChange('showNextMonthDays', !formData.showNextMonthDays)} 
                  className="w-full flex items-center gap-3 text-left"
                >
                  {formData.showNextMonthDays 
                    ? <CheckSquare className="w-5 h-5 text-blue-500" /> 
                    : <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
                  <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                    Takvimde sonraki ayın günlerini göster
                  </span>
                </button>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Bazı küçük ekranlı mobil cihazlarda kapatılabilir.
                                        </p>
                                          </div>
                              <div>
                                <label htmlFor="deductBreakTime" className="flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    id="deductBreakTime"
                                    checked={formData.deductBreakTime}
                                    onChange={(e) => handleInputChange('deductBreakTime', e.target.checked)}
                                    className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                  />
                                  <span className="ml-3 text-gray-700 dark:text-gray-200">
                                    4857 sayılı İş Kanunu'na göre ara dinlenmesi fazla mesailere dahil degildir!
                                  </span>
                                </label>
                                                                <ul className="list-disc list-inside text-sm text-gray-500 dark:text-gray-400 ml-4">
                                                                <li>4 saat ile 7.5 saate kadar işlerde: 30 dakika</li>
                                                                <li>7.5 saatten fazla işlerde: 1 saat</li>
                                                                </ul>                              </div>            </div>
          </div>

          {/* Shift System Settings */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <Calendar size={18} /> Haftalık Vardiya Düzeni
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-4">
              <div>
                <button 
                  onClick={() => handleInputChange('shiftSystemEnabled', !formData.shiftSystemEnabled)} 
                  className="w-full flex items-center gap-3 text-left"
                >
                  {formData.shiftSystemEnabled 
                    ? <CheckSquare className="w-5 h-5 text-blue-500" /> 
                    : <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
                  <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                    Vardiya takibini aktif et
                  </span>
                </button>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Takvimde haftalık döngüye göre vardiya renklendirmesi yapar.
                </p>
              </div>

              {formData.shiftSystemEnabled && (
                <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                      Vardiya Sistemi
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleInputChange('shiftSystemType', '2-shift')}
                        className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                          formData.shiftSystemType === '2-shift'
                            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800'
                            : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400'
                        }`}
                      >
                        2 Vardiya (G-G)
                      </button>
                      <button
                        onClick={() => handleInputChange('shiftSystemType', '3-shift')}
                        className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                          formData.shiftSystemType === '3-shift'
                            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800'
                            : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400'
                        }`}
                      >
                        3 Vardiya (S-A-G)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                      Döngü Başlangıç Tarihi
                    </label>
                    <input 
                      type="date" 
                      value={formData.shiftStartDate} 
                      onChange={(e) => handleInputChange('shiftStartDate', e.target.value)} 
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                      Başlangıç Haftası Vardiyası
                    </label>
                    {formData.shiftSystemType === '3-shift' ? (
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleInputChange('shiftInitialType', 'morning')}
                          className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border transition-all ${
                            formData.shiftInitialType === 'morning'
                              ? 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/30 dark:border-orange-800'
                              : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400'
                          }`}
                        >
                          <Sun size={16} />
                          <span className="text-[10px] font-bold">SABAH</span>
                          <span className="text-[8px] opacity-70">08-16</span>
                        </button>
                        <button
                          onClick={() => handleInputChange('shiftInitialType', 'afternoon')}
                          className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border transition-all ${
                            formData.shiftInitialType === 'afternoon'
                              ? 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-800'
                              : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400'
                          }`}
                        >
                          <div className="flex items-center">
                            <Sun size={12} className="text-orange-400" />
                            <Moon size={12} className="text-indigo-400 -ml-1" />
                          </div>
                          <span className="text-[10px] font-bold">AKŞAM</span>
                          <span className="text-[8px] opacity-70">16-00</span>
                        </button>
                        <button
                          onClick={() => handleInputChange('shiftInitialType', 'night')}
                          className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg border transition-all ${
                            formData.shiftInitialType === 'night'
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800'
                              : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400'
                          }`}
                        >
                          <Moon size={16} />
                          <span className="text-[10px] font-bold">GECE</span>
                          <span className="text-[8px] opacity-70">00-08</span>
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => handleInputChange('shiftInitialType', 'day')}
                          className={`flex items-center justify-center gap-2 p-2 rounded-lg border transition-all ${
                            formData.shiftInitialType === 'day' || (formData.shiftInitialType !== 'day' && formData.shiftInitialType !== 'night')
                              ? 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-900/30 dark:border-orange-800'
                              : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400'
                          }`}
                        >
                          <Sun size={16} />
                          <span className="text-sm font-medium">Gündüz</span>
                        </button>
                        <button
                          onClick={() => handleInputChange('shiftInitialType', 'night')}
                          className={`flex items-center justify-center gap-2 p-2 rounded-lg border transition-all ${
                            formData.shiftInitialType === 'night'
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800'
                              : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400'
                          }`}
                        >
                          <Moon size={16} />
                          <span className="text-sm font-medium">Gece</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* User Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <User size={18} /> Kullanıcı Bilgileri
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Ad</label>
                  <input 
                    type="text" 
                    value={formData.firstName} 
                    onChange={(e) => handleInputChange('firstName', e.target.value)} 
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Soyad</label>
                  <input 
                    type="text" 
                    value={formData.lastName} 
                    onChange={(e) => handleInputChange('lastName', e.target.value)} 
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Salary & Overtime */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              <Briefcase size={18} /> Maaş ve Mesai
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Aylık Maaş (Net) ₺</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    value={formData.monthlyGrossSalary} 
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleInputChange('monthlyGrossSalary', e.target.value)} 
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Prim (₺)</label>
                  <input 
                    type="text" 
                    inputMode="decimal"
                    value={formData.bonus} 
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleInputChange('bonus', e.target.value)} 
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Aylık Çalışma Saati</label>
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={formData.monthlyWorkingHours} 
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleInputChange('monthlyWorkingHours', e.target.value)} 
                  className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Başlangıç Saati</label>
                  <input 
                    type="time" 
                    value={formData.defaultStartTime} 
                    onChange={(e) => handleInputChange('defaultStartTime', e.target.value)} 
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Bitiş Saati</label>
                  <input 
                    type="time" 
                    value={formData.defaultEndTime} 
                    onChange={(e) => handleInputChange('defaultEndTime', e.target.value)} 
                    className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white" 
                  />
                </div>
              </div>
              <div>
                <label htmlFor="isSaturdayWork" className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="isSaturdayWork"
                    checked={formData.isSaturdayWork}
                    onChange={(e) => handleInputChange('isSaturdayWork', e.target.checked)}
                    className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-200">
                    Cumartesi de hafta içi çalışma günlerine dahil
                  </span>
                </label>
              </div>
              <div className="pt-2 space-y-2">
                <button 
                  onClick={() => handleInputChange('hasSalaryAttachment', !formData.hasSalaryAttachment)} 
                  className="w-full flex items-center gap-3 text-left p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  {formData.hasSalaryAttachment ? <CheckSquare className="w-5 h-5 text-blue-500" /> : <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
                  <div>
                    <span className="block text-sm font-semibold text-gray-700 dark:text-gray-200">Maaş Haczi</span>
                    <span className="block text-[10px] text-gray-500 dark:text-gray-400">Aktif edilirse toplam kazançtan 1/4 oranında kesinti yapılır.</span>
                  </div>
                </button>

                <div className="flex flex-col gap-2 p-2 rounded-lg bg-white/30 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700">
                  <button 
                    onClick={() => handleInputChange('hasTES', !formData.hasTES)} 
                    className="w-full flex items-center gap-3 text-left"
                  >
                    {formData.hasTES ? <CheckSquare className="w-5 h-5 text-blue-500" /> : <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
                    <div>
                      <span className="block text-sm font-semibold text-gray-700 dark:text-gray-200">TES (Tamamlayıcı Emeklilik)</span>
                      <span className="block text-[10px] text-gray-500 dark:text-gray-400">Aktif edilirse sadece maaş üzerinden kesinti yapılır.</span>
                    </div>
                  </button>
                  {formData.hasTES && (
                    <div className="flex items-center gap-2 pl-8">
                      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Kesinti Oranı:</label>
                      <div className="relative flex-1 max-w-[80px]">
                        <input 
                          type="text" 
                          inputMode="decimal"
                          value={formData.tesRate} 
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleInputChange('tesRate', e.target.value)} 
                          className="w-full p-1 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white pr-4" 
                        />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-200 mb-2">Mesai Katsayıları</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Hafta İçi</label>
                    <input 
                      type="number" 
                      value={formData.weekdayMultiplier} 
                      onChange={(e) => handleInputChange('weekdayMultiplier', Number(e.target.value))} 
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Cumartesi</label>
                    <input 
                      type="number" 
                      value={formData.saturdayMultiplier} 
                      onChange={(e) => handleInputChange('saturdayMultiplier', Number(e.target.value))} 
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Pazar</label>
                    <input 
                      type="number" 
                      value={formData.sundayMultiplier} 
                      onChange={(e) => handleInputChange('sundayMultiplier', Number(e.target.value))} 
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Resmi Tatil</label>
                    <input 
                      type="number" 
                      value={formData.holidayMultiplier} 
                      onChange={(e) => handleInputChange('holidayMultiplier', Number(e.target.value))} 
                      className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex gap-3 border-t border-gray-200 dark:border-gray-700 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button 
            onClick={onClose} 
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium active:bg-gray-200 dark:active:bg-gray-500"
          >
            İptal
          </button>
          <button 
            onClick={handleSave} 
            className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-medium active:bg-blue-600"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};
