import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Settings as SettingsIcon, Percent, RefreshCw, Info, Calendar, Clock, ShieldCheck, CreditCard, Briefcase, ArrowUpRight, ArrowDownLeft, Scale, FileText } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useSalarySettings } from '../hooks/useSalarySettings';
import { SalarySettings as SalarySettingsType } from '../types/overtime';
import { ThemeSwitcher } from './ThemeSwitcher';
import { APP_VERSION } from '../constants';
import { getMonthKey, isSaturdayWorkday, calculateDailyGrossHours, calculateEffectiveHours, TURKISH_MONTHS } from '../utils/dateUtils';
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
  // Platform kontrolü için daha güvenli yaklaşım
  const isWeb = useMemo(() => {
    try {
      return Capacitor.getPlatform() === 'web';
    } catch (e) {
      return true;
    }
  }, []);

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
    severanceBaseGross: settings.severanceBaseGross ?? 33030.00,
    departureTravelAllowance: settings.departureTravelAllowance ?? (settings.dailyTravelAllowance ? settings.dailyTravelAllowance / 2 : 0),
    returnTravelAllowance: settings.returnTravelAllowance ?? (settings.dailyTravelAllowance ? settings.dailyTravelAllowance / 2 : 0)
  }));

  const [updateStatus, setUpdateStatus] = useState<{
    loading: boolean;
    version?: string;
    isNew?: boolean;
    error?: string;
  }>({ loading: false });

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
        severanceBaseGross: settings.severanceBaseGross ?? 33030.00,
        departureTravelAllowance: settings.departureTravelAllowance ?? (settings.dailyTravelAllowance ? settings.dailyTravelAllowance / 2 : 0),
        returnTravelAllowance: settings.returnTravelAllowance ?? (settings.dailyTravelAllowance ? settings.dailyTravelAllowance / 2 : 0)
      });
    }
  }, [isOpen, settings, currentDate, getSalaryForDate, getShiftSettingsForDate]);

  const handleSave = () => {
    const monthKey = getMonthKey(currentDate);
    updateSettings(formData, monthKey, true); // true = settings ekranından, history'ye yazma
    onClose();
  };

  const checkUpdates = async () => {
    if (isWeb) return;
    setUpdateStatus({ loading: true, error: undefined, version: undefined });
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch('https://api.github.com/repos/efek0349/mesaitakip/releases/latest', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Güncelleme kontrolü başarısız.');

      const data = await response.json();
      const latestVersion = (data.tag_name || '').replace('v', '');
      
      if (!latestVersion) throw new Error('Versiyon bilgisi alınamadı.');

      // Versiyon karşılaştırma logic
      const v1Parts = latestVersion.split('.').map(Number);
      const v2Parts = APP_VERSION.split('.').map(Number);
      let isNew = false;

      for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
        const p1 = v1Parts[i] || 0;
        const p2 = v2Parts[i] || 0;
        if (p1 > p2) { isNew = true; break; }
        if (p1 < p2) { isNew = false; break; }
      }

      setUpdateStatus({
        loading: false,
        version: latestVersion,
        isNew: isNew
      });
    } catch (error: any) {
      setUpdateStatus({ 
        loading: false, 
        error: error.name === 'AbortError' ? 'Bağlantı zaman aşımına uğradı.' : 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.' 
      });
    }
  };

  const handleInputChange = useCallback(<K extends keyof SalarySettingsType>(field: K, value: SalarySettingsType[K]) => {
    const numericFields: (keyof SalarySettingsType)[] = [
      'monthlyGrossSalary', 'bonus', 'monthlyWorkingHours', 'dailyWorkingHours', 
      'tesRate', 'salaryAttachmentRate', 'dailyMealAllowance', 'dailyTravelAllowance', 
      'departureTravelAllowance', 'returnTravelAllowance',
      'severanceCeiling', 'severanceStampTaxRate', 'severanceBaseGross',
      'weekdayMultiplier', 'saturdayMultiplier', 'sundayMultiplier', 'holidayMultiplier'
    ];

    if (numericFields.includes(field)) {
      let stringValue = String(value).replace(/[^0-9.,]/g, '').replace(',', '.');
      const parts = stringValue.split('.');
      if (parts.length > 2) {
        stringValue = parts[0] + '.' + parts.slice(1).join('');
      }
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
        const gross = calculateDailyGrossHours(next.defaultStartTime, next.defaultEndTime);
        next.dailyWorkingHours = calculateEffectiveHours(gross, next.deductBreakTime);
        return next;
      });
      return;
    }

    if (field === 'defaultStartTime' || field === 'defaultEndTime' || field === 'shiftInitialType') {
      setFormData(prev => {
        const next = { ...prev, [field]: value };
        next.isSaturdayWork = isSaturdayWorkday(next);
        const gross = calculateDailyGrossHours(next.defaultStartTime, next.defaultEndTime);
        next.dailyWorkingHours = calculateEffectiveHours(gross, next.deductBreakTime);
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

  // Telefonda sayısal alanlara dokunulduğunda "0" değerini temizler,
  // imleci sağa kaydırmak zorunda kalmadan direkt yazmaya başlanabilir.
  const handleNumericFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value === '0' || e.target.value === '0.00' || e.target.value === '0.0') {
      e.target.value = '';
    }
    // Aynı tick içinde React state ile senkron kalması için
    requestAnimationFrame(() => e.target.select());
  }, []);

  // Alan boş bırakılıp çıkılırsa "0" olarak geri ayarla
  const handleNumericBlur = useCallback(<K extends keyof SalarySettingsType>(field: K) => (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.target.value.trim() === '') {
      setFormData(prev => ({ ...prev, [field]: '0' as any }));
    }
  }, []);

  const severancePreview = useMemo(() => {
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

        <div className="flex-shrink-0 p-3 pt-1">
          <div className="grid grid-cols-4 gap-2 bg-gray-200/50 dark:bg-gray-900/50 p-1.5 rounded-[20px] shadow-inner border border-gray-200/50 dark:border-gray-700/50">
            <TabButton id="general" label="Genel" icon={SettingsIcon} activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton id="salary" label="Maaş" icon={CreditCard} activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton id="severance" label="Kıdem" icon={Briefcase} activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton id="system" label="Sistem" icon={ShieldCheck} activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>
        </div>

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
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'salary' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200 pb-4">
              <section className="space-y-1.5">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Gelir Bilgileri</h3>
                <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 space-y-3 shadow-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Aylık Net Maaş</label>
                      <div className="relative">
                        <input type="text" inputMode="decimal" value={formData.monthlyGrossSalary} onChange={(e) => handleInputChange('monthlyGrossSalary', e.target.value)} onFocus={handleNumericFocus} onBlur={handleNumericBlur('monthlyGrossSalary')} className="w-full p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₺</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Prim / İkramiye</label>
                      <div className="relative">
                        <input type="text" inputMode="decimal" value={formData.bonus} onChange={(e) => handleInputChange('bonus', e.target.value)} onFocus={handleNumericFocus} onBlur={handleNumericBlur('bonus')} className="w-full p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₺</span>
                      </div>
                    </div>
                  </div>

                  {/* Yol/Yemek Bilgi Notu */}
                  <div className="flex gap-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/40 rounded-xl p-3">
                    <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-800/60 flex items-center justify-center">
                      <Info size={11} className="text-blue-500 dark:text-blue-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] font-black text-blue-800 dark:text-blue-200 leading-tight">
                        Yol/Yemek ücretleri bu ekrandan ayarlanır
                      </p>
                      <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 leading-snug">
                        Buraya girilen değerler <span className="font-black">tüm aylar</span> için geçerlidir. Belirli bir günde fiyat güncellemesi yapmak için <span className="font-black">mesai ekleme ekranını</span> kullanın — o tarih ve sonrası yeni fiyatla hesaplanır.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Günlük Yemek</label>
                        <div className="relative">
                          <input type="text" inputMode="decimal" value={formData.dailyMealAllowance} onChange={(e) => handleInputChange('dailyMealAllowance', e.target.value)} onFocus={handleNumericFocus} onBlur={handleNumericBlur('dailyMealAllowance')} className="w-full p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₺</span>
                        </div>
                      </div>
                      <div className="space-y-1 flex flex-col justify-end">
                        <div className="p-2.5 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase">Toplam Yol</span>
                            <span className="text-sm font-black text-blue-700 dark:text-blue-300">
                              ₺{(Number(formData.departureTravelAllowance || 0) + Number(formData.returnTravelAllowance || 0)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleInputChange('showMealInExport', !formData.showMealInExport)}
                      className="w-full flex items-center justify-between text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg transition-colors ${formData.showMealInExport ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                          <FileText size={16} />
                        </div>
                        <div>
                          <span className="block text-sm font-semibold text-gray-700 dark:text-gray-200 leading-none">Çıktıda Göster</span>
                          <span className="block text-[9px] text-gray-500 dark:text-gray-400 italic mt-1 leading-none">Yol/yemek detayını rapora ekle</span>
                        </div>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.showMealInExport ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${formData.showMealInExport ? 'left-6' : 'left-1'}`} />
                      </div>
                    </button>
                    
                    <div className="grid grid-cols-2 gap-3 bg-gray-100/50 dark:bg-gray-900/30 p-2 rounded-2xl border border-gray-200/50 dark:border-gray-800/50 shadow-inner">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 ml-1">
                          <ArrowUpRight size={10} className="text-emerald-500" />
                          <label className="text-[8px] font-black text-gray-500 uppercase">Gidiş Ücreti</label>
                        </div>
                        <input type="text" inputMode="decimal" value={formData.departureTravelAllowance} onChange={(e) => handleInputChange('departureTravelAllowance', e.target.value)} onFocus={handleNumericFocus} onBlur={handleNumericBlur('departureTravelAllowance')} className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg text-xs font-bold text-gray-800 dark:text-white outline-none" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 ml-1">
                          <ArrowDownLeft size={10} className="text-blue-500" />
                          <label className="text-[8px] font-black text-gray-500 uppercase">Dönüş Ücreti</label>
                        </div>
                        <input type="text" inputMode="decimal" value={formData.returnTravelAllowance} onChange={(e) => handleInputChange('returnTravelAllowance', e.target.value)} onFocus={handleNumericFocus} onBlur={handleNumericBlur('returnTravelAllowance')} className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg text-xs font-bold text-gray-800 dark:text-white outline-none" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-1.5 pt-1">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Yasal Kesintiler</h3>
                <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-2.5 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-left">
                      <div className={`p-1.5 rounded-lg transition-colors ${formData.hasSalaryAttachment ? 'bg-red-50 dark:bg-red-900/30 text-red-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                        <Scale size={14} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Maaş Haczi</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {formData.hasSalaryAttachment && (
                        <div className="relative w-16 animate-in fade-in slide-in-from-right-2 duration-200">
                          <input type="text" inputMode="decimal" value={formData.salaryAttachmentRate} onChange={(e) => handleInputChange('salaryAttachmentRate', e.target.value)} onFocus={handleNumericFocus} onBlur={handleNumericBlur('salaryAttachmentRate')} className="w-full p-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg text-[10px] font-black outline-none text-right pr-4" />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 font-bold">%</span>
                        </div>
                      )}
                      <button onClick={() => handleInputChange('hasSalaryAttachment', !formData.hasSalaryAttachment)} className={`w-8 h-4 rounded-full relative transition-colors ${formData.hasSalaryAttachment ? 'bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${formData.hasSalaryAttachment ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-2.5">
                    <div className="flex items-center gap-2 text-left">
                      <div className={`p-1.5 rounded-lg transition-colors ${formData.hasTES ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                        <ShieldCheck size={14} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">TES (BES) Kesintisi</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {formData.hasTES && (
                        <div className="relative w-16 animate-in fade-in slide-in-from-right-2 duration-200">
                          <input type="text" inputMode="decimal" value={formData.tesRate} onChange={(e) => handleInputChange('tesRate', e.target.value)} onFocus={handleNumericFocus} onBlur={handleNumericBlur('tesRate')} className="w-full p-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg text-[10px] font-black outline-none text-right pr-4" />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 font-bold">%</span>
                        </div>
                      )}
                      <button onClick={() => handleInputChange('hasTES', !formData.hasTES)} className={`w-8 h-4 rounded-full relative transition-colors ${formData.hasTES ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${formData.hasTES ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-1.5 pt-1">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Mesai Katsayıları</h3>
                <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 shadow-sm">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black text-gray-500 uppercase">Haftaiçi</label>
                      <div className="relative w-16">
                        <input type="text" value={formData.weekdayMultiplier} onChange={(e) => handleInputChange('weekdayMultiplier', e.target.value)} className="w-full p-1.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg text-xs font-black outline-none text-right pr-4" />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">x</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black text-gray-500 uppercase">Cumartesi</label>
                      <div className="relative w-16">
                        <input type="text" value={formData.saturdayMultiplier} onChange={(e) => handleInputChange('saturdayMultiplier', e.target.value)} className="w-full p-1.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg text-xs font-black outline-none text-right pr-4" />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">x</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black text-gray-500 uppercase">Pazar</label>
                      <div className="relative w-16">
                        <input type="text" value={formData.sundayMultiplier} onChange={(e) => handleInputChange('sundayMultiplier', e.target.value)} className="w-full p-1.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg text-xs font-black outline-none text-right pr-4" />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">x</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black text-gray-500 uppercase">Bayram</label>
                      <div className="relative w-16">
                        <input type="text" value={formData.holidayMultiplier} onChange={(e) => handleInputChange('holidayMultiplier', e.target.value)} className="w-full p-1.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg text-xs font-black outline-none text-right pr-4" />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">x</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-1.5 pt-1">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Çalışma Düzeni</h3>
                <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 space-y-4 shadow-sm">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-1 tracking-wider">Cumartesi Çalışma Düzeni</label>
                    <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-gray-900/60 p-1 rounded-2xl border border-gray-200/50 dark:border-gray-800 shadow-inner">
                      <button
                        onClick={() => handleInputChange('isSaturdayWorkManual', false)}
                        className={`py-2 px-1 rounded-xl text-[10px] font-black transition-all duration-300 ${!formData.isSaturdayWorkManual ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-100 dark:border-gray-700' : 'text-gray-500'}`}
                      >
                        OTOMATİK
                      </button>
                      <button
                        onClick={() => {
                          handleInputChange('isSaturdayWorkManual', true);
                          handleInputChange('isSaturdayWork', true);
                        }}
                        className={`py-2 px-1 rounded-xl text-[10px] font-black transition-all duration-300 ${formData.isSaturdayWorkManual && formData.isSaturdayWork ? 'bg-blue-500 text-white shadow-md' : 'text-gray-500'}`}
                      >
                        ÇALIŞILIYOR
                      </button>
                      <button
                        onClick={() => {
                          handleInputChange('isSaturdayWorkManual', true);
                          handleInputChange('isSaturdayWork', false);
                        }}
                        className={`py-2 px-1 rounded-xl text-[10px] font-black transition-all duration-300 ${formData.isSaturdayWorkManual && !formData.isSaturdayWork ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500'}`}
                      >
                        TATİL
                      </button>
                    </div>
                    <p className="text-[9px] text-gray-500 dark:text-gray-400 font-bold italic px-1 flex items-center gap-1">
                      <Info size={10} />
                      {!formData.isSaturdayWorkManual 
                        ? "Sistem çalışma saatinize göre otomatik belirler." 
                        : formData.isSaturdayWork 
                          ? "Cumartesi her zaman iş günü sayılır." 
                          : "Cumartesi her zaman tatil sayılır."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-gray-100 dark:border-gray-800 pt-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Aylık Toplam Saat</label>
                      <input type="text" inputMode="decimal" value={formData.monthlyWorkingHours} onChange={(e) => handleInputChange('monthlyWorkingHours', e.target.value)} onFocus={handleNumericFocus} onBlur={handleNumericBlur('monthlyWorkingHours')} className="w-full p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Günlük Standart</label>
                      <input type="text" inputMode="decimal" value={formData.dailyWorkingHours} onChange={(e) => handleInputChange('dailyWorkingHours', e.target.value)} onFocus={handleNumericFocus} onBlur={handleNumericBlur('dailyWorkingHours')} className="w-full p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none" />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'severance' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200 pb-4">
              <section className="space-y-1.5">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Hesaplama Parametreleri</h3>
                <div className="bg-amber-50/30 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800/20 p-3 space-y-3 shadow-sm">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase ml-1">İşe Giriş Tarihi</label>
                    <input type="date" value={formData.employmentStartDate || ''} onChange={(e) => handleInputChange('employmentStartDate', e.target.value)} className="w-full p-2.5 bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-800 rounded-xl text-sm font-bold text-amber-900 dark:text-amber-100 outline-none" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase ml-1">Esas Brüt Maaş</label>
                    <div className="relative">
                      <input type="text" inputMode="decimal" value={formData.severanceBaseGross} onChange={(e) => handleInputChange('severanceBaseGross', e.target.value)} onFocus={handleNumericFocus} onBlur={handleNumericBlur('severanceBaseGross')} className="w-full p-2.5 bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-800 rounded-xl text-sm font-bold text-amber-900 dark:text-amber-100 outline-none" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold">₺</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase ml-1">Yasal Tavan</label>
                      <input type="text" value={formData.severanceCeiling} onChange={(e) => handleInputChange('severanceCeiling', e.target.value)} className="w-full p-2.5 bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-800 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-100 outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase ml-1">Damga Vergisi</label>
                      <div className="relative">
                        <input type="text" value={formData.severanceStampTaxRate} onChange={(e) => handleInputChange('severanceStampTaxRate', e.target.value)} className="w-full p-2.5 bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-800 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-100 outline-none" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {severancePreview && severancePreview.eligible ? (
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg text-white">
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-1.5 bg-white/20 rounded-lg"><Briefcase size={18} /></div>
                    <div className="text-right">
                      <span className="block text-[9px] font-black opacity-70 uppercase">Net Tazminat ({severancePreview.years} Yıl)</span>
                      <span className="text-lg font-black">₺{severancePreview.netSeverance.toLocaleString('tr-TR')}</span>
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
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.showSeverancePay ? 'translate-x-4' : 'translate-x-0'} shadow-sm`} />
                      </div>
                    </button>
                  </div>
                </div>
              ) : severancePreview && !severancePreview.eligible ? (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/30 animate-in fade-in zoom-in-95 duration-200 shadow-sm text-center py-4">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center mx-auto mb-2 text-amber-600 dark:text-amber-400">
                    <Info size={20} />
                  </div>
                  <p className="text-[10px] text-amber-800 dark:text-amber-300 font-bold leading-relaxed max-w-[200px] mx-auto">
                    1 yıllık çalışma süresi dolmadığı için tazminat hakkı henüz oluşmamıştır.
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <section className="space-y-1.5">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Görünüm ve Kullanım</h3>
                <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 space-y-4 shadow-sm">
                  <ThemeSwitcher />
                </div>
              </section>

              <section className="space-y-1.5 pt-1">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Sürüm ve Güncelleme</h3>
                <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-500">
                        <Info size={16} />
                      </div>
                      <div>
                        <span className="block text-sm font-semibold text-gray-700 dark:text-gray-200 leading-none">Uygulama Sürümü</span>
                        <span className="block text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-none">v{APP_VERSION}</span>
                      </div>
                    </div>
                    {!isWeb && (
                      <button 
                        onClick={checkUpdates}
                        disabled={updateStatus.loading}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${
                          updateStatus.loading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white shadow-md active:scale-95'
                        }`}
                      >
                        {updateStatus.loading ? 'KONTROL EDİLİYOR...' : 'GÜNCELLEMELERİ DENETLE'}
                      </button>
                    )}
                  </div>

                  {updateStatus.error && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl">
                      <p className="text-[10px] text-red-600 dark:text-red-400 font-bold text-center leading-tight">{updateStatus.error}</p>
                    </div>
                  )}

                  {updateStatus.version && (
                    <div className={`mt-2 p-2 rounded-xl border animate-in fade-in zoom-in-95 duration-200 ${
                      updateStatus.isNew ? 'bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800/30' : 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/30'
                    }`}>
                      <p className={`text-[10px] font-bold text-center leading-tight ${
                        updateStatus.isNew ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        {updateStatus.isNew 
                          ? `Yeni bir sürüm mevcut (v${updateStatus.version})! Lütfen güncelleyin.` 
                          : 'Uygulamanız güncel durumda.'}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 flex gap-4 border-t border-gray-100 dark:border-gray-800 p-4 pt-2" style={buttonContainerStyle}>
          <button onClick={onClose} className="flex-1 group relative py-3.5 bg-gradient-to-br from-white to-gray-100 dark:from-gray-700 dark:to-gray-800 text-gray-500 dark:text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-md border-b-4 border-gray-300 dark:border-gray-950 active:translate-y-1 active:border-b-0 transition-all overflow-hidden">
            İptal
          </button>
          <button onClick={handleSave} className="flex-1 group relative py-3.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg border-b-4 border-indigo-900 active:translate-y-1 active:border-b-0 transition-all overflow-hidden">
            <span className="relative z-10">Kaydet</span>
          </button>
        </div>
      </div>
    </div>
  );
};
