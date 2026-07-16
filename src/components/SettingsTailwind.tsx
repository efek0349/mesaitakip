import React from 'react';
import { X, Settings as SettingsIcon, Percent, RefreshCw, Info, Calendar, Clock, ShieldCheck, CreditCard, Briefcase, ArrowUpRight, ArrowDownLeft, Scale, FileText, Palmtree, Bell } from 'lucide-react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { FontSizeSwitcher } from './FontSizeSwitcher';
import { APP_VERSION } from '../constants';
import { TabButton } from './TabButton';
import { useAndroidSafeArea } from '../hooks/useAndroidSafeArea';
import { useSettingsLogic } from '../hooks/useSettingsLogic';
import { addHoursToTime, calculateDailyGrossHours } from '../utils/dateUtils';

interface SettingsTailwindProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
}

export const SettingsTailwind: React.FC<SettingsTailwindProps> = ({ isOpen, onClose, currentDate }) => {
  const { modalStyle, buttonContainerStyle } = useAndroidSafeArea();

  const {
    isWeb,
    activeTab, setActiveTab,
    formData,
    updateStatus,
    handleSave,
    checkUpdates,
    handleInputChange,
    handleNumericFocus,
    handleNumericBlur,
    handleBoundedIntegerBlur,
    severancePreview,
    noticePayPreview,
    annualLeavePreview,
    taxCalcGross, setTaxCalcGross,
    taxCalcCumulativeBase, setTaxCalcCumulativeBase,
    taxCalcResult,
    applyTaxCalcResultToSalary,
    resetTaxSettingsToDefault,
  } = useSettingsLogic(isOpen, onClose, currentDate);

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
          <div className="grid grid-cols-5 gap-2 bg-gray-200/50 dark:bg-gray-900/50 p-1.5 rounded-[20px] shadow-inner border border-gray-200/50 dark:border-gray-700/50">
            <TabButton id="general" label="Genel" icon={SettingsIcon} activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton id="salary" label="Maaş" icon={CreditCard} activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton id="tax" label="Vergi" icon={Percent} activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton id="severance" label="Kıdem" icon={Briefcase} activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton id="system" label="Sistem" icon={ShieldCheck} activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 custom-scrollbar relative w-full pt-1">

          {activeTab === 'general' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <section className="space-y-1.5">
                <h3 className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest pl-1">Profil Bilgileri</h3>
                <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[0.5625rem] font-black text-gray-400 uppercase ml-1">Adınız</label>
                      <input 
                        type="text" 
                        value={formData.firstName} 
                        onChange={(e) => handleInputChange('firstName', e.target.value)} 
                        className="w-full p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[0.5625rem] font-black text-gray-400 uppercase ml-1">Soyadınız</label>
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
                <h3 className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest pl-1">Vardiya Düzeni</h3>
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
                        <span className="block text-[0.5625rem] text-gray-500 dark:text-gray-400 italic mt-1 leading-none">Haftalık döngü renklendirmesi</span>
                      </div>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.shiftSystemEnabled ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.shiftSystemEnabled ? 'left-6' : 'left-1'}`} />
                    </div>
                  </button>

                  {formData.shiftSystemEnabled && (
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
                      <div>
                        <label className="block text-[0.5625rem] font-black text-gray-400 uppercase mb-2 ml-1">Sistem Tipi</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleInputChange('shiftSystemType', '2-shift')}
                            className={`p-2 rounded-xl border text-[0.625rem] font-bold transition-all ${
                              formData.shiftSystemType === '2-shift'
                                ? 'bg-blue-500 border-blue-500 text-white shadow-md'
                                : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-500'
                            }`}
                          >
                            2 VARDİYA (G-G)
                          </button>
                          <button
                            onClick={() => handleInputChange('shiftSystemType', '3-shift')}
                            className={`p-2 rounded-xl border text-[0.625rem] font-bold transition-all ${
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
                          <label className="block text-[0.5625rem] font-black text-gray-400 uppercase ml-1">Başlangıç Tarihi</label>
                          <div className="relative">
                            <input 
                              type="date" 
                              value={formData.shiftStartDate} 
                              onChange={(e) => handleInputChange('shiftStartDate', e.target.value)} 
                              className="w-full p-2.5 pr-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 outline-none" 
                            />
                            <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[0.5625rem] font-black text-gray-400 uppercase ml-1">İlk Hafta</label>
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

                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                        <label className="block text-[0.5625rem] font-black text-gray-400 uppercase mb-2 ml-1">Vardiya Başlangıç Saatleri</label>
                        <p className="text-[0.5625rem] text-gray-400 leading-tight mb-2 px-1">
                          Sadece başlangıç saatini gir — bitiş, "Çalışma Düzeni"ndeki Başlangıç-Bitiş arasındaki toplam süreye (mola dahil) göre otomatik hesaplanır.
                        </p>
                        <div className={`grid gap-2 ${formData.shiftSystemType === '3-shift' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                          {(formData.shiftSystemType === '3-shift'
                            ? [['morning', 'Sabah'], ['afternoon', 'Öğleden S.'], ['night', 'Gece']]
                            : [['day', 'Gündüz'], ['night', 'Gece']]
                          ).map(([type, label]) => {
                            const startValue = formData.shiftStartTimes?.[type as keyof typeof formData.shiftStartTimes] || formData.defaultStartTime;
                            const grossHours = calculateDailyGrossHours(formData.defaultStartTime, formData.defaultEndTime) || 9;
                            const endValue = addHoursToTime(startValue, grossHours);
                            return (
                              <div key={type} className="space-y-1">
                                <label className="block text-[0.5rem] font-bold text-gray-400 ml-1">{label}</label>
                                <div className="relative">
                                  <input
                                    type="time"
                                    value={startValue}
                                    onChange={(e) => handleInputChange('shiftStartTimes', { ...formData.shiftStartTimes, [type]: e.target.value } as any)}
                                    className="w-full p-2 pr-7 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 outline-none"
                                  />
                                  <Clock size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                                <span className="block text-[0.5rem] text-gray-400 text-center">→ {endValue}'te biter</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-1.5">
                <h3 className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest pl-1">Yasal Düzenlemeler</h3>
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
                        <span className="block text-[0.5625rem] text-gray-500 dark:text-gray-400 italic mt-1 leading-none">Mesai süresinden mola düşümü</span>
                      </div>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.deductBreakTime ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.deductBreakTime ? 'left-6' : 'left-1'}`} />
                    </div>
                  </button>
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                    <span className="block text-[0.625rem] text-gray-500 dark:text-gray-400 leading-tight pl-1">
                      4857 sayılı İş Kanunu'na göre ara dinlenmeleri fazla mesai süresinden düşülür.
                    </span>
                  </div>
                </div>
              </section>

              <section className="space-y-1.5 pt-1">
                <h3 className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest pl-1">Çalışma Düzeni</h3>
                <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 space-y-4 shadow-sm">
                  <div className="space-y-2">
                    <label className="text-[0.5625rem] font-black text-gray-400 uppercase ml-1 tracking-wider">Standart Mesai Saatleri</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[0.5625rem] font-black text-gray-400 uppercase ml-1">Başlangıç</label>
                        <div className="relative">
                          <input
                            type="time"
                            value={formData.defaultStartTime}
                            onChange={(e) => handleInputChange('defaultStartTime', e.target.value)}
                            className="w-full p-2.5 pr-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-black outline-none text-center text-gray-800 dark:text-white"
                          />
                          <Clock size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[0.5625rem] font-black text-gray-400 uppercase ml-1">Bitiş</label>
                        <div className="relative">
                          <input
                            type="time"
                            value={formData.defaultEndTime}
                            onChange={(e) => handleInputChange('defaultEndTime', e.target.value)}
                            className="w-full p-2.5 pr-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-black outline-none text-center text-gray-800 dark:text-white"
                          />
                          <Clock size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                    <p className="text-[0.5625rem] text-gray-500 dark:text-gray-400 font-bold italic px-1 flex items-center gap-1">
                      <Info size={10} />
                      Cumartesi otomatik tespiti ve aylık çalışma saati hesabı bu saatlere göre yapılır.
                    </p>
                  </div>

                  <div className="space-y-2 border-t border-gray-100 dark:border-gray-800 pt-3">
                    <label className="text-[0.5625rem] font-black text-gray-400 uppercase ml-1 tracking-wider">Cumartesi Çalışma Düzeni</label>
                    <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-gray-900/60 p-1 rounded-2xl border border-gray-200/50 dark:border-gray-800 shadow-inner">
                      <button
                        onClick={() => handleInputChange('isSaturdayWorkManual', false)}
                        className={`py-2 px-1 rounded-xl text-[0.625rem] font-black transition-all duration-300 ${!formData.isSaturdayWorkManual ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-100 dark:border-gray-700' : 'text-gray-500'}`}
                      >
                        OTOMATİK
                      </button>
                      <button
                        onClick={() => {
                          handleInputChange('isSaturdayWorkManual', true);
                          handleInputChange('isSaturdayWork', true);
                        }}
                        className={`py-2 px-1 rounded-xl text-[0.625rem] font-black transition-all duration-300 ${formData.isSaturdayWorkManual && formData.isSaturdayWork ? 'bg-blue-500 text-white shadow-md' : 'text-gray-500'}`}
                      >
                        ÇALIŞILIYOR
                      </button>
                      <button
                        onClick={() => {
                          handleInputChange('isSaturdayWorkManual', true);
                          handleInputChange('isSaturdayWork', false);
                        }}
                        className={`py-2 px-1 rounded-xl text-[0.625rem] font-black transition-all duration-300 ${formData.isSaturdayWorkManual && !formData.isSaturdayWork ? 'bg-orange-500 text-white shadow-md' : 'text-gray-500'}`}
                      >
                        TATİL
                      </button>
                    </div>
                    <p className="text-[0.5625rem] text-gray-500 dark:text-gray-400 font-bold italic px-1 flex items-center gap-1">
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
                      <label className="text-[0.5625rem] font-black text-gray-400 uppercase ml-1">Aylık Toplam Saat</label>
                      <div className="relative">
                        <input type="text" inputMode="decimal" value={formData.monthlyWorkingHours} onChange={(e) => handleInputChange('monthlyWorkingHours', e.target.value)} onFocus={handleNumericFocus} onBlur={handleNumericBlur('monthlyWorkingHours')} className="w-full p-2.5 pr-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none" />
                        <Clock size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[0.5625rem] font-black text-gray-400 uppercase ml-1">Günlük Standart</label>
                      <div className="relative">
                        <input type="text" inputMode="decimal" value={formData.dailyWorkingHours} onChange={(e) => handleInputChange('dailyWorkingHours', e.target.value)} onFocus={handleNumericFocus} onBlur={handleNumericBlur('dailyWorkingHours')} className="w-full p-2.5 pr-8 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none" />
                        <Clock size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'salary' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200 pb-4">
              <section className="space-y-1.5">
                <h3 className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest pl-1">Gelir Bilgileri</h3>
                <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 space-y-3 shadow-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[0.5625rem] font-black text-gray-400 uppercase ml-1">Aylık Net Maaş</label>
                      <div className="relative">
                        <input type="text" inputMode="decimal" value={formData.monthlyGrossSalary} onChange={(e) => handleInputChange('monthlyGrossSalary', e.target.value)} onFocus={handleNumericFocus} onBlur={handleNumericBlur('monthlyGrossSalary')} className="w-full p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold pointer-events-none">₺</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[0.5625rem] font-black text-gray-400 uppercase ml-1">Prim / İkramiye</label>
                      <div className="relative">
                        <input type="text" inputMode="decimal" value={formData.bonus} onChange={(e) => handleInputChange('bonus', e.target.value)} onFocus={handleNumericFocus} onBlur={handleNumericBlur('bonus')} className="w-full p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold pointer-events-none">₺</span>
                      </div>
                    </div>
                  </div>

                  {/* Yol/Yemek Bilgi Notu */}
                  <div className="flex gap-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/40 rounded-xl p-3">
                    <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-800/60 flex items-center justify-center">
                      <Info size={11} className="text-blue-500 dark:text-blue-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[0.6875rem] font-black text-blue-800 dark:text-blue-200 leading-tight">
                        Yol/Yemek ücretleri bu ekrandan ayarlanır
                      </p>
                      <p className="text-[0.625rem] text-blue-600/80 dark:text-blue-400/80 leading-snug">
                        Buraya girilen değerler <span className="font-black">tüm aylar</span> için geçerlidir. Belirli bir günde fiyat güncellemesi yapmak için <span className="font-black">mesai ekleme ekranını</span> kullanın — o tarih ve sonrası yeni fiyatla hesaplanır.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[0.5625rem] font-black text-gray-400 uppercase ml-1">Günlük Yemek</label>
                        <div className="relative">
                          <input type="text" inputMode="decimal" value={formData.dailyMealAllowance} onChange={(e) => handleInputChange('dailyMealAllowance', e.target.value)} onFocus={handleNumericFocus} onBlur={handleNumericBlur('dailyMealAllowance')} className="w-full p-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold pointer-events-none">₺</span>
                        </div>
                      </div>
                      <div className="space-y-1 flex flex-col justify-end">
                        <div className="p-2.5 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-xl">
                          <div className="flex justify-between items-center">
                            <span className="text-[0.5625rem] font-black text-blue-600 dark:text-blue-400 uppercase">Toplam Yol</span>
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
                          <span className="block text-[0.5625rem] text-gray-500 dark:text-gray-400 italic mt-1 leading-none">Yol/yemek detayını rapora ekle</span>
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
                          <label className="text-[0.5rem] font-black text-gray-500 uppercase">Gidiş Ücreti</label>
                        </div>
                        <div className="relative">
                          <input type="text" inputMode="decimal" value={formData.departureTravelAllowance} onChange={(e) => handleInputChange('departureTravelAllowance', e.target.value)} onFocus={handleNumericFocus} onBlur={handleNumericBlur('departureTravelAllowance')} className="w-full p-2 pr-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg text-xs font-bold text-gray-800 dark:text-white outline-none" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[0.625rem] text-gray-400 font-bold pointer-events-none">₺</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 ml-1">
                          <ArrowDownLeft size={10} className="text-blue-500" />
                          <label className="text-[0.5rem] font-black text-gray-500 uppercase">Dönüş Ücreti</label>
                        </div>
                        <div className="relative">
                          <input type="text" inputMode="decimal" value={formData.returnTravelAllowance} onChange={(e) => handleInputChange('returnTravelAllowance', e.target.value)} onFocus={handleNumericFocus} onBlur={handleNumericBlur('returnTravelAllowance')} className="w-full p-2 pr-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg text-xs font-bold text-gray-800 dark:text-white outline-none" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[0.625rem] text-gray-400 font-bold pointer-events-none">₺</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-1.5 pt-1">
                <h3 className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest pl-1">Yasal Kesintiler</h3>
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
                          <input type="text" inputMode="decimal" value={formData.salaryAttachmentRate} onChange={(e) => handleInputChange('salaryAttachmentRate', e.target.value)} onFocus={handleNumericFocus} onBlur={handleNumericBlur('salaryAttachmentRate')} className="w-full p-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg text-[0.625rem] font-black outline-none text-right pr-4 text-gray-800 dark:text-white" />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[0.5625rem] text-gray-400 font-bold pointer-events-none">%</span>
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
                          <input type="text" inputMode="decimal" value={formData.tesRate} onChange={(e) => handleInputChange('tesRate', e.target.value)} onFocus={handleNumericFocus} onBlur={handleNumericBlur('tesRate')} className="w-full p-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg text-[0.625rem] font-black outline-none text-right pr-4 text-gray-800 dark:text-white" />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[0.5625rem] text-gray-400 font-bold pointer-events-none">%</span>
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
                <h3 className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest pl-1">Mesai Katsayıları</h3>
                <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 shadow-sm">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[0.5625rem] font-black text-gray-500 uppercase">Haftaiçi</label>
                      <div className="relative w-16">
                        <input type="text" value={formData.weekdayMultiplier} onChange={(e) => handleInputChange('weekdayMultiplier', e.target.value)} className="w-full p-1.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg text-xs font-black outline-none text-right pr-4 text-gray-800 dark:text-white" />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[0.625rem] text-gray-400 font-bold pointer-events-none">x</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-[0.5625rem] font-black text-gray-500 uppercase">Cumartesi</label>
                      <div className="relative w-16">
                        <input type="text" value={formData.saturdayMultiplier} onChange={(e) => handleInputChange('saturdayMultiplier', e.target.value)} className="w-full p-1.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg text-xs font-black outline-none text-right pr-4 text-gray-800 dark:text-white" />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[0.625rem] text-gray-400 font-bold pointer-events-none">x</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-[0.5625rem] font-black text-gray-500 uppercase">Pazar</label>
                      <div className="relative w-16">
                        <input type="text" value={formData.sundayMultiplier} onChange={(e) => handleInputChange('sundayMultiplier', e.target.value)} className="w-full p-1.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg text-xs font-black outline-none text-right pr-4 text-gray-800 dark:text-white" />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[0.625rem] text-gray-400 font-bold pointer-events-none">x</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-[0.5625rem] font-black text-gray-500 uppercase">Bayram</label>
                      <div className="relative w-16">
                        <input type="text" value={formData.holidayMultiplier} onChange={(e) => handleInputChange('holidayMultiplier', e.target.value)} className="w-full p-1.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg text-xs font-black outline-none text-right pr-4 text-gray-800 dark:text-white" />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[0.625rem] text-gray-400 font-bold pointer-events-none">x</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'tax' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200 pb-4">
              <section className="space-y-1.5">
                <h3 className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest pl-1">Brüt / Net Maaş Hesaplayıcı</h3>
                <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 space-y-3 shadow-sm">
                  <p className="text-[0.5625rem] text-gray-500 dark:text-gray-400 font-bold italic px-0.5 flex items-center gap-1">
                    <Info size={10} />
                    Brüt maaşınızı girin; gelir vergisi dilimi otomatik tespit edilir.
                  </p>

                  <details className="group" open>
                    <summary className="text-[0.5625rem] font-black text-indigo-500 dark:text-indigo-400 uppercase cursor-pointer select-none">
                      Vergi Dilimleri / Asgari Ücret (Değiştir)
                    </summary>
                    <div className="mt-2 space-y-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-2.5">
                      <div className="space-y-1">
                        <label className="text-[0.5rem] font-black text-gray-400 uppercase ml-1">Asgari Ücret (Brüt)</label>
                        <div className="relative">
                          <input type="text" inputMode="decimal" value={formData.minimumWageGross} onChange={(e) => handleInputChange('minimumWageGross', e.target.value)} className="w-full p-2 pr-6 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-800 dark:text-white outline-none" />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold pointer-events-none text-[0.625rem]">₺</span>
                        </div>
                      </div>

                      {[1, 2, 3, 4].map((n) => (
                        <div key={n} className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[0.5rem] font-black text-gray-400 uppercase ml-1">{n}. Dilim Üst Sınırı</label>
                            <div className="relative">
                              <input type="text" inputMode="decimal" value={(formData as any)[`taxBracket${n}Limit`]} onChange={(e) => handleInputChange(`taxBracket${n}Limit` as any, e.target.value)} className="w-full p-2 pr-6 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-800 dark:text-white outline-none" />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold pointer-events-none text-[0.5625rem]">₺</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[0.5rem] font-black text-gray-400 uppercase ml-1">{n}. Dilim Oranı</label>
                            <div className="relative">
                              <input type="text" inputMode="decimal" value={(formData as any)[`taxBracket${n}Rate`]} onChange={(e) => handleInputChange(`taxBracket${n}Rate` as any, e.target.value)} className="w-full p-2 pr-5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-800 dark:text-white outline-none" />
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold pointer-events-none text-[0.5625rem]">%</span>
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="space-y-1 w-1/2">
                        <label className="text-[0.5rem] font-black text-gray-400 uppercase ml-1">5. Dilim Oranı (Sınırsız)</label>
                        <div className="relative">
                          <input type="text" inputMode="decimal" value={formData.taxBracket5Rate} onChange={(e) => handleInputChange('taxBracket5Rate', e.target.value)} className="w-full p-2 pr-5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-800 dark:text-white outline-none" />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold pointer-events-none text-[0.5625rem]">%</span>
                        </div>
                      </div>

                      <button
                        onClick={resetTaxSettingsToDefault}
                        className="w-full py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider active:scale-95 transition-all"
                      >
                        Varsayılanlara Sıfırla
                      </button>
                    </div>
                  </details>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[0.5625rem] font-black text-gray-400 uppercase ml-1">Brüt Maaş</label>
                      <div className="relative">
                        <input type="text" inputMode="decimal" placeholder="0" value={taxCalcGross} onChange={(e) => setTaxCalcGross(e.target.value)} className="w-full p-2.5 pr-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold pointer-events-none">₺</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[0.5625rem] font-black text-gray-400 uppercase ml-1">Yıl İçi Matrah (ops.)</label>
                      <div className="relative">
                        <input type="text" inputMode="decimal" placeholder="0" value={taxCalcCumulativeBase} onChange={(e) => setTaxCalcCumulativeBase(e.target.value)} className="w-full p-2.5 pr-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold pointer-events-none">₺</span>
                      </div>
                    </div>
                  </div>

                  {taxCalcResult && (
                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 space-y-2 shadow-inner">
                      <div className="flex justify-between items-center">
                        <span className="text-[0.625rem] font-bold text-gray-500 dark:text-gray-400">Gelir Vergisi Dilimi</span>
                        <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300">
                          %{(taxCalcResult.bracketRate * 100).toFixed(0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[0.6875rem]">
                        <span className="text-gray-500 dark:text-gray-400">SGK + İşsizlik</span>
                        <span className="font-bold text-gray-700 dark:text-gray-200">-₺{taxCalcResult.sgkAndUnemployment.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[0.6875rem]">
                        <span className="text-gray-500 dark:text-gray-400">Gelir Vergisi (istisna sonrası)</span>
                        <span className="font-bold text-gray-700 dark:text-gray-200">-₺{taxCalcResult.netIncomeTax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[0.6875rem] pb-2 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-gray-500 dark:text-gray-400">Damga Vergisi (istisna sonrası)</span>
                        <span className="font-bold text-gray-700 dark:text-gray-200">-₺{taxCalcResult.netStampTax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-gray-800 dark:text-white uppercase">Net Maaş</span>
                        <span className="text-lg font-black text-green-600 dark:text-green-400">
                          ₺{taxCalcResult.netSalary.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <button
                        onClick={applyTaxCalcResultToSalary}
                        className="w-full py-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl text-[0.625rem] font-black uppercase tracking-wider shadow-md active:scale-95 transition-all"
                      >
                        Aylık Net Maaş Alanına Uygula
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'severance' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200 pb-4">
              <section className="space-y-1.5">
                <h3 className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest pl-1">Hesaplama Parametreleri</h3>
                <div className="bg-amber-50/30 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800/20 p-3 space-y-3 shadow-sm">
                  <div className="space-y-1">
                    <label className="text-[0.5625rem] font-black text-amber-600 dark:text-amber-400 uppercase ml-1">İşe Giriş Tarihi</label>
                    <div className="relative">
                      <input type="date" value={formData.employmentStartDate || ''} onChange={(e) => handleInputChange('employmentStartDate', e.target.value)} className="w-full p-2.5 pr-8 bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-800 rounded-xl text-sm font-bold text-amber-900 dark:text-amber-100 outline-none" />
                      <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[0.5625rem] font-black text-amber-600 dark:text-amber-400 uppercase ml-1">Esas Brüt Maaş</label>
                    <div className="relative">
                      <input type="text" inputMode="decimal" value={formData.severanceBaseGross} onChange={(e) => handleInputChange('severanceBaseGross', e.target.value)} onFocus={handleNumericFocus} onBlur={handleNumericBlur('severanceBaseGross')} className="w-full p-2.5 bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-800 rounded-xl text-sm font-bold text-amber-900 dark:text-amber-100 outline-none" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold pointer-events-none">₺</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[0.5625rem] font-black text-amber-600 dark:text-amber-400 uppercase ml-1">Yasal Tavan</label>
                      <div className="relative">
                        <input type="text" value={formData.severanceCeiling} onChange={(e) => handleInputChange('severanceCeiling', e.target.value)} className="w-full p-2.5 pr-6 bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-800 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-100 outline-none" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold pointer-events-none">₺</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[0.5625rem] font-black text-amber-600 dark:text-amber-400 uppercase ml-1">Damga Vergisi</label>
                      <div className="relative">
                        <input type="text" value={formData.severanceStampTaxRate} onChange={(e) => handleInputChange('severanceStampTaxRate', e.target.value)} className="w-full p-2.5 bg-white dark:bg-gray-900 border border-amber-100 dark:border-amber-800 rounded-xl text-xs font-bold text-amber-900 dark:text-amber-100 outline-none" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold pointer-events-none">%</span>
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
                      <span className="block text-[0.5625rem] font-black opacity-70 uppercase">Net Tazminat ({severancePreview.years} Yıl)</span>
                      <span className="text-lg font-black">₺{severancePreview.netSeverance.toLocaleString('tr-TR')}</span>
                      {(severancePreview.months > 0 || severancePreview.days > 0) && (
                        <span className="block text-[0.5625rem] font-bold opacity-80 mt-0.5">
                          +{severancePreview.months > 0 ? `${severancePreview.months} AY ` : ''}{severancePreview.days > 0 ? `${severancePreview.days} GÜN ` : ''}EKSTRA: ₺{(severancePreview.monthNetSeverance + severancePreview.dayNetSeverance).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/20">
                    <button 
                      onClick={() => handleInputChange('showSeverancePay', !formData.showSeverancePay)}
                      className="w-full flex items-center justify-between text-left group"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="opacity-80" />
                        <span className="text-xs font-bold opacity-90">Ana ekranda göster (Kıdem + İhbar)</span>
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
                  <p className="text-[0.625rem] text-amber-800 dark:text-amber-300 font-bold leading-relaxed max-w-[200px] mx-auto">
                    1 yıllık çalışma süresi dolmadığı için tazminat hakkı henüz oluşmamıştır.
                  </p>
                </div>
              ) : null}

              <section className="space-y-1.5">
                <h3 className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest pl-1">İhbar (Bildirim) Tazminatı</h3>
                <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 space-y-3 shadow-sm">
                  <div className="space-y-1">
                    <label className="text-[0.5625rem] font-black text-gray-400 uppercase ml-1">Yıl İçi Matrah (opsiyonel)</label>
                    <div className="relative">
                      <input type="text" inputMode="decimal" placeholder="0" value={formData.noticePayCumulativeBase} onChange={(e) => handleInputChange('noticePayCumulativeBase', e.target.value)} className="w-full p-2.5 pr-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold pointer-events-none">₺</span>
                    </div>
                  </div>
                </div>
              </section>

              {noticePayPreview ? (
                <div className="p-3 bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl shadow-lg text-white">
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-1.5 bg-white/20 rounded-lg"><FileText size={18} /></div>
                    <div className="text-right">
                      <span className="block text-[0.5625rem] font-black opacity-70 uppercase">Net İhbar Tazminatı ({noticePayPreview.noticeWeeks} Hafta)</span>
                      <span className="text-lg font-black">₺{noticePayPreview.netNoticePay.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/20 space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold opacity-90">
                      <span>Brüt Tutar</span>
                      <span>₺{noticePayPreview.grossNoticePay.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold opacity-90">
                      <span>Gelir Vergisi</span>
                      <span>-₺{noticePayPreview.incomeTax.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold opacity-90">
                      <span>Damga Vergisi</span>
                      <span>-₺{noticePayPreview.stampTax.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 text-center py-4">
                  <p className="text-[0.625rem] text-gray-500 dark:text-gray-400 font-bold leading-relaxed max-w-[220px] mx-auto">
                    Hesaplama için işe giriş tarihi ve esas brüt maaşı girin.
                  </p>
                </div>
              )}

              <section className="space-y-1.5">
                <h3 className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest pl-1">Yıllık İzin</h3>
                {annualLeavePreview ? (
                  <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 space-y-3 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <Palmtree size={14} />
                      <span className="text-[0.5625rem] font-bold">
                        İzin dönemi: {annualLeavePreview.periodStartLabel} – {annualLeavePreview.periodEndLabel} ({annualLeavePreview.yearsOfService} yıl kıdem)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-2.5 text-center">
                        <span className="block text-[0.5rem] font-black text-gray-400 uppercase">Hak Edilen</span>
                        <span className="text-sm font-black text-gray-800 dark:text-white">{annualLeavePreview.entitledDays} gün</span>
                      </div>
                      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-2.5 text-center">
                        <span className="block text-[0.5rem] font-black text-gray-400 uppercase">Kalan</span>
                        <span className={`text-sm font-black ${annualLeavePreview.remainingDays < 0 ? 'text-red-500' : 'text-gray-800 dark:text-white'}`}>
                          {annualLeavePreview.remainingDays} gün
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[0.5625rem] font-black text-gray-400 uppercase ml-1">Kullanılan İzin (Bu Dönem)</label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.usedAnnualLeaveDays}
                          onChange={(e) => handleInputChange('usedAnnualLeaveDays', e.target.value)}
                          className="w-full p-2.5 pr-10 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.625rem] text-gray-400 font-bold pointer-events-none">gün</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
                    <p className="text-[0.625rem] text-gray-500 dark:text-gray-400 font-bold">
                      Yıllık izin hesaplaması için işe giriş tarihini girin.
                    </p>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <section className="space-y-1.5">
                <h3 className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest pl-1">Görünüm ve Kullanım</h3>
                <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 space-y-4 shadow-sm">
                  <ThemeSwitcher />
                  <FontSizeSwitcher />
                </div>
              </section>

              <section className="space-y-1.5 pt-1">
                <h3 className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest pl-1">Hatırlatıcılar</h3>
                <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 space-y-3 shadow-sm">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => handleInputChange('salaryReminderEnabled', !formData.salaryReminderEnabled)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-colors ${formData.salaryReminderEnabled ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                        <Bell size={16} />
                      </div>
                      <div>
                        <span className="block text-sm font-semibold text-gray-700 dark:text-gray-200 leading-none">Maaş Günü Hatırlatıcısı</span>
                        <span className="block text-[0.625rem] text-gray-500 dark:text-gray-400 mt-1 leading-none">Seçilen gün ve saatte bildirim gönderir</span>
                      </div>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.salaryReminderEnabled ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.salaryReminderEnabled ? 'left-6' : 'left-1'}`} />
                    </div>
                  </div>

                  {formData.salaryReminderEnabled && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[0.625rem] font-bold text-gray-500 dark:text-gray-400 mb-1 pl-1">Ayın Günü</label>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formData.salaryReminderDay ?? 1}
                            onChange={(e) => handleInputChange('salaryReminderDay', e.target.value as any)}
                            onFocus={handleNumericFocus}
                            onBlur={handleBoundedIntegerBlur('salaryReminderDay', 1, 31, 1)}
                            className="w-full p-2.5 pr-7 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none"
                          />
                          <Calendar size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[0.625rem] font-bold text-gray-500 dark:text-gray-400 mb-1 pl-1">Saat</label>
                        <div className="relative">
                          <input
                            type="time"
                            value={formData.salaryReminderTime ?? '09:00'}
                            onChange={(e) => handleInputChange('salaryReminderTime', e.target.value)}
                            className="w-full p-2.5 pr-7 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none"
                          />
                          <Clock size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                      <p className="col-span-2 text-[0.625rem] text-gray-400 leading-tight pl-1">
                        31 gibi kısa aylarda olmayan bir gün seçilirse, o ayın son gününde hatırlatılır.
                      </p>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => handleInputChange('workEndReminderEnabled', !formData.workEndReminderEnabled)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg transition-colors ${formData.workEndReminderEnabled ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}>
                          <Clock size={16} />
                        </div>
                        <div>
                          <span className="block text-sm font-semibold text-gray-700 dark:text-gray-200 leading-none">Mesai Bitiş Hatırlatıcısı</span>
                          <span className="block text-[0.625rem] text-gray-500 dark:text-gray-400 mt-1 leading-none">O günkü vardiyanın bitişine az kala bildirim gönderir</span>
                        </div>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.workEndReminderEnabled ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.workEndReminderEnabled ? 'left-6' : 'left-1'}`} />
                      </div>
                    </div>

                    {formData.workEndReminderEnabled && (
                      <div className="pt-3 space-y-3">
                        {/* Bu açıklama HER ZAMAN geçerli — aşağıdaki Pazar
                            kutucuğunun işaretli olup olmamasından tamamen
                            bağımsız. Karışıklığı önlemek için kutucuktan
                            ayrı, üstte tutuluyor. */}
                        <p className="text-[0.625rem] text-gray-400 leading-tight">
                          Vardiya bitiş saati, Genel sekmesindeki vardiya başlangıç saatlerine ve Maaş sekmesindeki günlük çalışma saatine göre otomatik hesaplanır. Resmi/dini tatiller ve "izin" olarak işaretlediğin günler her zaman otomatik atlanır.
                        </p>

                        <div>
                          <label className="block text-[0.625rem] font-bold text-gray-500 dark:text-gray-400 mb-1 pl-1">Kaç Dakika Önce</label>
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formData.workEndReminderMinutesBefore ?? 5}
                              onChange={(e) => handleInputChange('workEndReminderMinutesBefore', e.target.value as any)}
                              onFocus={handleNumericFocus}
                              onBlur={handleBoundedIntegerBlur('workEndReminderMinutesBefore', 1, 60, 5)}
                              className="w-full p-2.5 pr-7 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-800 dark:text-white outline-none"
                            />
                            <Clock size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        </div>

                        {formData.shiftSystemEnabled && (
                          <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
                            <label className="flex items-center gap-2.5 cursor-pointer pt-2">
                              <input
                                type="checkbox"
                                checked={!!formData.shiftIncludesSunday}
                                onChange={(e) => handleInputChange('shiftIncludesSunday', e.target.checked as any)}
                                className="w-4 h-4 rounded accent-orange-500"
                              />
                              <span className="text-[0.625rem] text-gray-600 dark:text-gray-300 leading-tight">
                                Sürekli/kesintisiz vardiya sistemi — Pazar günleri de çalışılıyor
                              </span>
                            </label>
                            <p className="text-[0.5625rem] text-gray-400 leading-tight pl-[1.625rem] mt-1">
                              Sadece Pazar günü için geçerlidir. İşaretlemezsen Pazar hiç çalışma günü sayılmaz ve o gün hatırlatma gelmez.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-1.5 pt-1">
                <h3 className="text-[0.625rem] font-bold text-gray-400 uppercase tracking-widest pl-1">Sürüm ve Güncelleme</h3>
                <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-3 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-500">
                        <Info size={16} />
                      </div>
                      <div>
                        <span className="block text-sm font-semibold text-gray-700 dark:text-gray-200 leading-none">Uygulama Sürümü</span>
                        <span className="block text-[0.625rem] text-gray-500 dark:text-gray-400 mt-1 leading-none">v{APP_VERSION}</span>
                      </div>
                    </div>
                    {!isWeb && (
                      <button 
                        onClick={checkUpdates}
                        disabled={updateStatus.loading}
                        className={`px-3 py-1.5 rounded-xl text-[0.625rem] font-black transition-all ${
                          updateStatus.loading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white shadow-md active:scale-95'
                        }`}
                      >
                        {updateStatus.loading ? 'KONTROL EDİLİYOR...' : 'GÜNCELLEMELERİ DENETLE'}
                      </button>
                    )}
                  </div>

                  {updateStatus.error && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl">
                      <p className="text-[0.625rem] text-red-600 dark:text-red-400 font-bold text-center leading-tight">{updateStatus.error}</p>
                    </div>
                  )}

                  {updateStatus.version && (
                    <div className={`mt-2 p-2 rounded-xl border animate-in fade-in zoom-in-95 duration-200 ${
                      updateStatus.isNew ? 'bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800/30' : 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/30'
                    }`}>
                      <p className={`text-[0.625rem] font-bold text-center leading-tight ${
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
          <button onClick={onClose} className="flex-1 group relative py-3.5 bg-gradient-to-br from-white to-gray-100 dark:from-gray-700 dark:to-gray-800 text-gray-500 dark:text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[0.625rem] shadow-md border-b-4 border-gray-300 dark:border-gray-950 active:translate-y-1 active:border-b-0 transition-all overflow-hidden">
            İptal
          </button>
          <button onClick={handleSave} className="flex-1 group relative py-3.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[0.625rem] shadow-lg border-b-4 border-indigo-900 active:translate-y-1 active:border-b-0 transition-all overflow-hidden">
            <span className="relative z-10">Kaydet</span>
          </button>
        </div>
      </div>
    </div>
  );
};
