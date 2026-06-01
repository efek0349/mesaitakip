import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Settings as SettingsIcon, Percent, RefreshCw, Info, Calendar, Clock, ShieldCheck, CreditCard, Briefcase } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useSalarySettings } from '../hooks/useSalarySettings';
import { SalarySettings as SalarySettingsType } from '../types/overtime';
import { ThemeSwitcher } from './ThemeSwitcher';
import { APP_VERSION } from '../constants';
import { getMonthKey, isSaturdayWorkday } from '../utils/dateUtils';
import { calculateSeverancePay } from '../utils/salaryUtils';
import { TabButton } from './TabButton';
import { useAndroidSafeArea } from '../hooks/useAndroidSafeArea';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
}

type SettingsTab = 'general' | 'salary' | 'severance' | 'system';

export const Settings: React.FC<SettingsProps> = ({ isOpen, onClose, currentDate }) => {
  const isWeb = Capacitor.getPlatform() === 'web';
  const { settings, updateSettings, getSalaryForDate, getShiftSettingsForDate } = useSalarySettings();
  const { modalStyle, buttonContainerStyle } = useAndroidSafeArea();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  
  const [formData, setFormData] = useState<SalarySettingsType>(() => ({
    ...settings,
    shiftSystemEnabled: settings.shiftSystemEnabled ?? false,
    shiftSystemType: settings.shiftSystemType ?? '2-shift',
    shiftStartDate: settings.shiftStartDate ?? new Date().toISOString().split('T')[0],
    shiftInitialType: settings.shiftInitialType ?? 'day',
    severanceCeiling: settings.severanceCeiling ?? 64948.77,
    severanceStampTaxRate: settings.severanceStampTaxRate ?? 0.759,
    severanceBaseGross: settings.severanceBaseGross ?? 33030.00
  }));

  const [updateStatus, setUpdateStatus] = useState<{
    loading: boolean;
    version?: string;
    isNew?: boolean;
    error?: string;
  }>({ loading: false });

  // Sync formData with settings when modal opens or external settings change
  useEffect(() => {
    if (isOpen) {
      const monthSalary = getSalaryForDate(currentDate);
      const shiftForDate = getShiftSettingsForDate(currentDate);
      
      setFormData({
        ...settings,
        monthlyGrossSalary: monthSalary.monthlyGrossSalary,
        bonus: monthSalary.bonus,
        tesRate: settings.tesRate ?? 3,
        shiftSystemEnabled: settings.shiftSystemEnabled ?? false,
        shiftSystemType: shiftForDate?.systemType || settings.shiftSystemType || '2-shift',
        shiftStartDate: shiftForDate?.startDate || settings.shiftStartDate || new Date().toISOString().split('T')[0],
        shiftInitialType: shiftForDate?.initialType || settings.shiftInitialType || 'day',
        severanceCeiling: settings.severanceCeiling ?? 64948.77,
        severanceStampTaxRate: settings.severanceStampTaxRate ?? 0.759,
        severanceBaseGross: settings.severanceBaseGross ?? 33030.00
      });
    }
  }, [isOpen, settings, currentDate, getSalaryForDate, getShiftSettingsForDate]);

  const handleSave = () => {
    const monthKey = getMonthKey(currentDate);
    updateSettings(formData, monthKey);
    onClose();
  };

  const checkUpdates = async () => {
    if (isWeb) return;
    setUpdateStatus({ loading: true });
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch('https://api.github.com/repos/efek0349/mesaitakip/releases/latest', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Güncelleme kontrolü başarısız.');

      const data = await response.json();
      const latestVersion = data.tag_name?.replace('v', '');
      
      if (!latestVersion) throw new Error('Versiyon bilgisi alınamadı.');

      const compareVersions = (v1: string, v2: string) => {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);

        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
          const p1 = parts1[i] || 0;
          const p2 = parts2[i] || 0;
          if (p1 > p2) return 1;
          if (p1 < p2) return -1;
        }
        return 0;
      };

      const hasNewVersion = compareVersions(latestVersion, APP_VERSION) === 1;

      setUpdateStatus({
        loading: false,
        version: latestVersion,
        isNew: hasNewVersion
      });
    } catch (error) {
      const isTimeout = error instanceof DOMException && error.name === 'AbortError';
      setUpdateStatus({ 
        loading: false, 
        error: isTimeout ? 'Bağlantı zaman aşımına uğradı.' : 'Sunucuya ulaşılamadı. Lütfen internet bağlantınızı kontrol edin.' 
      });
    }
  };

  const handleInputChange = useCallback(<K extends keyof SalarySettingsType>(field: K, value: SalarySettingsType[K]) => {
    const numericFields: (keyof SalarySettingsType)[] = [
      'monthlyGrossSalary', 'bonus', 'monthlyWorkingHours', 'dailyWorkingHours', 
      'tesRate', 'salaryAttachmentRate', 'dailyMealAllowance', 'dailyTravelAllowance', 
      'severanceCeiling', 'severanceStampTaxRate', 'severanceBaseGross',
      'weekdayMultiplier', 'saturdayMultiplier', 'sundayMultiplier', 'holidayMultiplier'
    ];

    if (numericFields.includes(field)) {
      let stringValue = String(value).replace(/[^0-9.,]/g, '').replace(',', '.');
      const parts = stringValue.split('.');
      if (parts.length > 2) {
        stringValue = parts[0] + '.' + parts.slice(1).join('');
      }
      // UI'da akıcılık için string olarak tutuyoruz, as any kullanımı geçici bir çözüm
      setFormData(prev => ({ ...prev, [field]: stringValue as any }));
      return;
    }

    if (field === 'shiftSystemType') {
      const newType = value as '2-shift' | '3-shift';
      setFormData(prev => {
        const next = { ...prev, shiftSystemType: newType };
        if (newType === '3-shift') {
          next.defaultStartTime = '08:05';
          next.defaultEndTime = '16:05';
        } else {
          next.defaultStartTime = '08:05';
          next.defaultEndTime = '18:05';
        }
        next.isSaturdayWork = isSaturdayWorkday(next);
        next.dailyWorkingHours = next.isSaturdayWork ? 7.5 : 9;
        return next;
      });
      return;
    }

    if (field === 'defaultStartTime' || field === 'defaultEndTime' || field === 'shiftInitialType') {
      setFormData(prev => {
        const next = { ...prev, [field]: value };
        next.isSaturdayWork = isSaturdayWorkday(next);
        next.dailyWorkingHours = next.isSaturdayWork ? 7.5 : 9;
        return next;
      });
      return;
    }

    if (field === 'hasSalaryAttachment' && value === true) {
      setFormData(prev => {
        const hasRate = prev.salaryAttachmentRate && Number(prev.salaryAttachmentRate) > 0;
        return { 
          ...prev, 
          hasSalaryAttachment: true, 
          salaryAttachmentRate: hasRate ? prev.salaryAttachmentRate : (25 as any) 
        };
      });
      return;
    }

    if (field === 'hasTES' && value === true) {
      setFormData(prev => {
        const hasRate = prev.tesRate && Number(prev.tesRate) > 0;
        return { 
          ...prev, 
          hasTES: true, 
          tesRate: hasRate ? prev.tesRate : (3 as any) 
        };
      });
      return;
    }

    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const severancePreview = useMemo(() => {
    // getSalaryForDate referansı hook'tan geliyor, monthSalary'yi formData'dan türetmek daha güvenli olabilir
    // ancak tarihsel doğruluk için settings'ten o ayın baz verilerini almak gerekebilir.
    const monthSalary = getSalaryForDate(currentDate);
    return calculateSeverancePay(formData, monthSalary);
  }, [formData, currentDate, getSalaryForDate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div 
        className="bg-gray-50 dark:bg-dark-bg rounded-[32px] w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] border border-white/10 overflow-hidden relative transition-all duration-300"
        style={modalStyle}
      >

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 pb-1">
          <div className="flex items-center gap-2">
            <div className="relative p-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-[0_4px_10px_-2px_rgba(59,130,246,0.5),inset_0_1px_2px_rgba(255,255,255,0.4)] border-b-2 border-blue-800 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
              <SettingsIcon className="w-4 h-4 relative z-10" />
            </div>
            <h2 className="text-lg font-black text-gray-800 dark:text-white tracking-tight uppercase">Ayarlar</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-xl bg-white dark:bg-gray-800 shadow-md active:scale-90 transition-all border border-gray-100 dark:border-gray-800"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Tab Navigation - 3D Container */}
        <div className="flex-shrink-0 p-3 pt-1">
          <div className="grid grid-cols-4 gap-2 bg-gray-200/50 dark:bg-gray-900/50 p-1.5 rounded-[20px] shadow-inner border border-gray-200/50 dark:border-gray-700/50">
            <TabButton id="general" label="Genel" icon={SettingsIcon} activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton id="salary" label="Maaş" icon={CreditCard} activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton id="severance" label="Kıdem" icon={Briefcase} activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton id="system" label="Sistem" icon={ShieldCheck} activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 custom-scrollbar relative w-full pt-1">

          {activeTab === 'general' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <section className="space-y-1.5">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Profil Bilgileri</h3>
                <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Adınız</label>
                      <input 
                        type="text" 
                        value={formData.firstName} 
                        onChange={(e) => handleInputChange('firstName', e.target.value)} 
                        className="w-full p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Soyadınız</label>
                      <input 
                        type="text" 
                        value={formData.lastName} 
                        onChange={(e) => handleInputChange('lastName', e.target.value)} 
                        className="w-full p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none" 
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Vardiya Sistemi */}
              <section className="space-y-1.5">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Vardiya Düzeni</h3>
                <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 space-y-3">
                  <button 
                    onClick={() => handleInputChange('shiftSystemEnabled', !formData.shiftSystemEnabled)} 
                    className="w-full flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-colors ${formData.shiftSystemEnabled ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                        <RefreshCw size={16} className={formData.shiftSystemEnabled ? 'animate-spin-slow' : ''} />
                      </div>
                      <div>
                        <span className="block text-sm font-semibold text-gray-700 dark:text-gray-200 leading-none">Vardiya Takibi</span>
                        <span className="block text-[9px] text-gray-500 dark:text-gray-400 italic mt-1 leading-none">Haftalık döngü renklendirmesi</span>
                      </div>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.shiftSystemEnabled ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.shiftSystemEnabled ? 'left-6' : 'left-1'}`} />
                    </div>
                  </button>

                  {formData.shiftSystemEnabled && (
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                      <div>
                        <label className="block text-[9px] font-black text-gray-400 uppercase mb-2 ml-1">Sistem Tipi</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleInputChange('shiftSystemType', '2-shift')}
                            className={`p-2 rounded-xl border text-[10px] font-bold transition-all ${
                              formData.shiftSystemType === '2-shift'
                                ? 'bg-blue-500 border-blue-500 text-white shadow-md'
                                : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500'
                            }`}
                          >
                            2 VARDİYA (G-G)
                          </button>
                          <button
                            onClick={() => handleInputChange('shiftSystemType', '3-shift')}
                            className={`p-2 rounded-xl border text-[10px] font-bold transition-all ${
                              formData.shiftSystemType === '3-shift'
                                ? 'bg-blue-500 border-blue-500 text-white shadow-md'
                                : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500'
                            }`}
                          >
                            3 VARDİYA (S-A-G)
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-gray-400 uppercase ml-1">Başlangıç Tarihi</label>
                          <input 
                            type="date" 
                            value={formData.shiftStartDate} 
                            onChange={(e) => handleInputChange('shiftStartDate', e.target.value)} 
                            className="w-full p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 outline-none" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-gray-400 uppercase ml-1">İlk Hafta</label>
                          <select
                            value={formData.shiftInitialType}
                            onChange={(e) => handleInputChange('shiftInitialType', e.target.value as any)}
                            className="w-full p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 outline-none"
                          >
                            {formData.shiftSystemType === '3-shift' ? (
                              <>
                                <option value="morning">SABAH (08-16)</option>
                                <option value="afternoon">AKŞAM (16-00)</option>
                                <option value="night">GECE (00-08)</option>
                              </>
                            ) : (
                              <>
                                <option value="day">GÜNDÜZ</option>
                                <option value="night">GECE</option>
                              </>
                            )}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Yasal Düzenlemeler</h3>
                <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 space-y-3">
                  <button 
                    onClick={() => handleInputChange('deductBreakTime', !formData.deductBreakTime)} 
                    className="w-full flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-colors ${formData.deductBreakTime ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                        <Clock size={16} />
                      </div>
                      <div>
                        <span className="block text-sm font-semibold text-gray-700 dark:text-gray-200 leading-none">Ara Dinlenmesi</span>
                        <span className="block text-[9px] text-gray-500 dark:text-gray-400 italic mt-1 leading-none">Mesai süresinden mola düşümü</span>
                      </div>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.deductBreakTime ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.deductBreakTime ? 'left-6' : 'left-1'}`} />
                    </div>
                  </button>

                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                    <span className="block text-[10px] text-gray-500 dark:text-gray-400 leading-tight pl-1">
                      4857 sayılı İş Kanunu'na göre ara dinlenmeleri fazla mesai süresinden düşülür.
                    </span>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="p-1.5 bg-white dark:bg-gray-900 rounded-lg text-[9px] text-gray-500 border border-gray-100 dark:border-gray-800">
                        <span className="font-bold text-gray-700 dark:text-gray-300">4-7.5s:</span> 30 Dk
                      </div>
                      <div className="p-1.5 bg-white dark:bg-gray-900 rounded-lg text-[9px] text-gray-500 border border-gray-100 dark:border-gray-800">
                        <span className="font-bold text-gray-700 dark:text-gray-300">7.5s+:</span> 1 Saat
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'salary' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <section className="space-y-1.5">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Gelir Bilgileri</h3>
                <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Aylık Net Maaş</label>
                      <div className="relative group">
                        <input 
                          type="text" 
                          inputMode="decimal"
                          value={formData.monthlyGrossSalary} 
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleInputChange('monthlyGrossSalary', e.target.value)} 
                          className="w-full p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none" 
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₺</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Prim / İkramiye</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          inputMode="decimal"
                          value={formData.bonus} 
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleInputChange('bonus', e.target.value)} 
                          className="w-full p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none" 
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₺</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Günlük Yemek</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          inputMode="decimal"
                          value={formData.dailyMealAllowance} 
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleInputChange('dailyMealAllowance', e.target.value)} 
                          className="w-full p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none" 
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₺</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Günlük Yol</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          inputMode="decimal"
                          value={formData.dailyTravelAllowance} 
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleInputChange('dailyTravelAllowance', e.target.value)} 
                          className="w-full p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none" 
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₺</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Çalışma Düzeni</h3>
                <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Aylık Toplam Saat</label>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        value={formData.monthlyWorkingHours} 
                        onChange={(e) => handleInputChange('monthlyWorkingHours', e.target.value)} 
                        className="w-full p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Günlük Standart</label>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        value={formData.dailyWorkingHours} 
                        readOnly
                        className="w-full p-2.5 bg-gray-100 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-500 dark:text-gray-400 outline-none cursor-not-allowed" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Başlangıç Saati</label>
                      <input 
                        type="time" 
                        value={formData.defaultStartTime} 
                        onChange={(e) => handleInputChange('defaultStartTime', e.target.value)} 
                        className="w-full p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Bitiş Saati</label>
                      <input 
                        type="time" 
                        value={formData.defaultEndTime} 
                        onChange={(e) => handleInputChange('defaultEndTime', e.target.value)} 
                        className="w-full p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none" 
                      />
                    </div>
                  </div>

                  <div className="px-1">
                    <div className={`flex items-center gap-2 p-2.5 rounded-xl border ${formData.isSaturdayWork ? 'bg-blue-50/50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/50' : 'bg-green-50/50 border-green-100 dark:bg-green-900/20 dark:border-green-800/50'}`}>
                      <Info size={12} className={formData.isSaturdayWork ? 'text-blue-500' : 'text-green-500'} />
                      <span className="text-[9px] font-bold text-gray-600 dark:text-gray-300 leading-tight">
                        {formData.isSaturdayWork 
                          ? 'Günde 8 saat veya altı çalışma (Cumartesi iş günü)' 
                          : 'Günde 10 saat veya üstü çalışma (Cumartesi tatil)'}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Mesai Katsayıları</h3>
                <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Hafta İçi</label>
                      <div className="flex items-center gap-2 p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
                        <span className="text-gray-400 text-xs font-bold">x</span>
                        <input 
                          type="number" 
                          value={formData.weekdayMultiplier} 
                          onChange={(e) => handleInputChange('weekdayMultiplier', Number(e.target.value))} 
                          className="flex-1 bg-transparent text-sm font-bold text-gray-800 dark:text-white outline-none" 
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Cumartesi</label>
                      <div className="flex items-center gap-2 p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
                        <span className="text-gray-400 text-xs font-bold">x</span>
                        <input 
                          type="number" 
                          value={formData.saturdayMultiplier} 
                          onChange={(e) => handleInputChange('saturdayMultiplier', Number(e.target.value))} 
                          className="flex-1 bg-transparent text-sm font-bold text-gray-800 dark:text-white outline-none" 
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Pazar (45s+)</label>
                      <div className="flex items-center gap-2 p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
                        <span className="text-gray-400 text-xs font-bold">x</span>
                        <input 
                          type="text"
                          inputMode="decimal"
                          value={formData.sundayMultiplier} 
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleInputChange('sundayMultiplier', e.target.value)} 
                          className="flex-1 bg-transparent text-sm font-bold text-gray-800 dark:text-white outline-none" 
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Resmi Tatil</label>
                      <div className="flex items-center gap-2 p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl">
                        <span className="text-gray-400 text-xs font-bold">x</span>
                        <input 
                          type="number" 
                          value={formData.holidayMultiplier} 
                          onChange={(e) => handleInputChange('holidayMultiplier', Number(e.target.value))} 
                          className="flex-1 bg-transparent text-sm font-bold text-gray-800 dark:text-white outline-none" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Kesintiler</h3>
                <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 space-y-3">
                  {/* Maaş Haczi */}
                  <div className="p-2.5 bg-white dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                    <button 
                      onClick={() => handleInputChange('hasSalaryAttachment', !formData.hasSalaryAttachment)} 
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${formData.hasSalaryAttachment ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                          <Percent size={14} />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Maaş Haczi</span>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.hasSalaryAttachment ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.hasSalaryAttachment ? 'left-6' : 'left-1'}`} />
                      </div>
                    </button>
                    {formData.hasSalaryAttachment && (
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between animate-in slide-in-from-top-1 duration-200">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Kesinti Oranı (%25)</span>
                        <div className="relative w-20">
                          <input 
                            type="text" 
                            inputMode="decimal"
                            value={formData.salaryAttachmentRate || '25'} 
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleInputChange('salaryAttachmentRate', e.target.value)} 
                            className="w-full p-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg text-xs font-black text-right pr-6 text-red-600 dark:text-red-400 outline-none" 
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-400">%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* TES */}
                  <div className="p-2.5 bg-white dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                    <button 
                      onClick={() => handleInputChange('hasTES', !formData.hasTES)} 
                      className="w-full flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${formData.hasTES ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                          <ShieldCheck size={14} />
                        </div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">TES (Emeklilik)</span>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.hasTES ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.hasTES ? 'left-6' : 'left-1'}`} />
                      </div>
                    </button>
                    {formData.hasTES && (
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between animate-in slide-in-from-top-1 duration-200">
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Kesinti Oranı (%3)</span>
                        <div className="relative w-20">
                          <input 
                            type="text" 
                            inputMode="decimal"
                            value={formData.tesRate || '3'} 
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleInputChange('tesRate', e.target.value)} 
                            className="w-full p-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg text-xs font-black text-right pr-6 text-indigo-600 dark:text-indigo-400 outline-none" 
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-400">%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'severance' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <section className="space-y-1.5">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Hesaplama Parametreleri</h3>
                <div className="bg-amber-50/30 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800/20 p-3 space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase ml-1">İşe Giriş Tarihi</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        value={formData.employmentStartDate || ''} 
                        onChange={(e) => handleInputChange('employmentStartDate', e.target.value)} 
                        className="w-full p-2.5 bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-800 rounded-xl text-sm font-bold text-amber-900 dark:text-amber-100 outline-none" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase ml-1">Esas Brüt Maaş</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        inputMode="decimal"
                        value={formData.severanceBaseGross} 
                        onChange={(e) => handleInputChange('severanceBaseGross', e.target.value)} 
                        className="w-full p-2.5 bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-800 rounded-xl text-sm font-bold text-amber-900 dark:text-amber-100 outline-none" 
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold">₺</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase ml-1">Yasal Tavan</label>
                      <input 
                        type="text" 
                        value={formData.severanceCeiling} 
                        onChange={(e) => handleInputChange('severanceCeiling', e.target.value)} 
                        className="w-full p-2.5 bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-800 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-100 outline-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase ml-1">Damga Vergisi</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={formData.severanceStampTaxRate} 
                          onChange={(e) => handleInputChange('severanceStampTaxRate', e.target.value)} 
                          className="w-full p-2.5 bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-800 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-100 outline-none" 
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Kıdem Tazminatı Özet Bilgisi */}
              {severancePreview && severancePreview.eligible ? (
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg shadow-amber-500/20 text-white">
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-1.5 bg-white/20 rounded-lg">
                      <Briefcase size={18} />
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] font-black opacity-70 uppercase tracking-tighter">Net Tazminat ({severancePreview.years} Yıl)</span>
                      <span className="text-lg font-black">₺{severancePreview.netSeverance.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/20">
                    <button 
                      onClick={() => handleInputChange('showSeverancePay', !formData.showSeverancePay)}
                      className="w-full flex items-center justify-between text-left group"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="opacity-80" />
                        <span className="text-xs font-bold opacity-90">Ana ekranda göster</span>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors bg-black/20 shadow-inner`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.showSeverancePay ? 'left-6' : 'left-1'} shadow-sm`} />
                      </div>
                    </button>
                  </div>
                </div>
              ) : severancePreview && !severancePreview.eligible ? (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/30 animate-in fade-in zoom-in-95 duration-200">
                  <p className="text-[10px] text-amber-800 dark:text-amber-300 font-bold text-center leading-relaxed">
                    ⚠️ 1 yıllık çalışma süresi dolmadığı için tazminat hakkı henüz oluşmamıştır.
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <section className="space-y-1.5">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Görünüm ve Kullanım</h3>
                <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 space-y-4">
                  <ThemeSwitcher />
                </div>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Uygulama Bilgileri</h3>
                <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-lg">
                        <Info size={16} />
                      </div>
                      <div>
                        <span className="block text-sm font-semibold text-gray-700 dark:text-gray-200 leading-none">Versiyon</span>
                        <span className="block text-[9px] text-gray-400 font-mono mt-1">v{APP_VERSION}</span>
                      </div>
                    </div>
                    {!isWeb && (
                      <button 
                        onClick={checkUpdates}
                        disabled={updateStatus.loading}
                        className="px-2.5 py-1.5 bg-blue-500 text-white text-[9px] font-bold rounded-lg active:scale-95 transition-transform disabled:opacity-50"
                      >
                        {updateStatus.loading ? '...' : 'GÜNCELLE'}
                      </button>
                    )}
                  </div>

                  {!isWeb && updateStatus.version && (
                    <div className={`mt-3 p-2.5 rounded-xl flex items-center justify-between ${updateStatus.isNew ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                      <span className={`text-[9px] font-bold ${updateStatus.isNew ? 'text-orange-600' : 'text-green-600'}`}>
                        {updateStatus.isNew ? `YENİ SÜRÜM: v${updateStatus.version}` : 'SÜRÜM GÜNCEL'}
                      </span>
                      {updateStatus.isNew && (
                        <a href="https://github.com/efek0349/mesaitakip/releases" target="_blank" rel="noopener noreferrer" className="text-[9px] text-orange-600 underline font-black">İNDİR</a>
                      )}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer Buttons - 3D Style */}
        <div 
          className="flex-shrink-0 flex gap-4 border-t border-gray-100 dark:border-gray-800 p-4 pt-2"
          style={buttonContainerStyle}
        >
          <button 
            onClick={onClose} 
            className="flex-1 group relative py-3.5 bg-gradient-to-br from-white to-gray-100 dark:from-gray-700 dark:to-gray-800 text-gray-500 dark:text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-md border-b-4 border-gray-300 dark:border-gray-950 active:translate-y-1 active:border-b-0 transition-all overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            İptal
          </button>
          <button 
            onClick={handleSave} 
            className="flex-1 group relative py-3.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-[0_6px_12px_-2px_rgba(59,130,246,0.4),inset_0_2px_4px_rgba(255,255,255,0.3)] border-b-4 border-indigo-900 active:translate-y-1 active:border-b-0 transition-all overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
            <span className="relative z-10">Kaydet</span>
          </button>
        </div>
      </div>
    </div>
  );
};
