import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Square } from 'lucide-react';
import { useSalarySettings } from '../hooks/useSalarySettings';
import { SalarySettings as SalarySettingsType } from '../types/overtime';
import { ThemeSwitcher } from './ThemeSwitcher';

interface SalarySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SalarySettings: React.FC<SalarySettingsProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useSalarySettings();
  const [formData, setFormData] = useState<SalarySettingsType>(settings);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...settings,
        tesRate: settings.tesRate ?? 3 // Eğer veri tabanında/localStorage'da yoksa 3 yap
      });
    }
  }, [settings, isOpen]);

  const handleSave = () => {
    updateSettings(formData);
    onClose();
  };

  const handleInputChange = (field: keyof SalarySettingsType, value: any) => {
    // Sayısal alanlar için özel kontrol
    if (field === 'monthlyGrossSalary' || field === 'bonus' || field === 'monthlyWorkingHours' || field === 'tesRate') {
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
            <div className="w-6 h-6 text-green-600 dark:text-green-400 flex items-center justify-center text-lg font-bold">₺</div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Maaş Ayarları</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full active:bg-gray-100 dark:active:bg-gray-600"><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Theme Switcher */}
          <ThemeSwitcher />

          {/* User Info */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-gray-800 dark:text-white">Kullanıcı Bilgileri</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Ad</label>
                <input type="text" value={formData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Soyad</label>
                <input type="text" value={formData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
              </div>
            </div>
          </div>

          {/* Salary Info */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-gray-800 dark:text-white">Maaş Bilgileri</h3>
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
          </div>

          {/* Multipliers */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-gray-800 dark:text-white">Mesai Katsayıları</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Hafta İçi</label>
                <input type="number" value={formData.weekdayMultiplier} onChange={(e) => handleInputChange('weekdayMultiplier', Number(e.target.value))} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Cumartesi</label>
                <input type="number" value={formData.saturdayMultiplier} onChange={(e) => handleInputChange('saturdayMultiplier', Number(e.target.value))} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Pazar</label>
                <input type="number" value={formData.sundayMultiplier} onChange={(e) => handleInputChange('sundayMultiplier', Number(e.target.value))} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Resmi Tatil</label>
                <input type="number" value={formData.holidayMultiplier} onChange={(e) => handleInputChange('holidayMultiplier', Number(e.target.value))} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
              </div>
            </div>
          </div>

          {/* Break Time Deduction */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <button onClick={() => handleInputChange('deductBreakTime', !formData.deductBreakTime)} className="w-full flex items-center gap-3 text-left">
              {formData.deductBreakTime ? <CheckSquare className="w-5 h-5 text-blue-500" /> : <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
              <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">4857 sayılı İş Kanunu'na göre ara dinlenmesi fazla mesailere dahil degildir!</span>
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              4 saate kadar işlerde: 15 dakika
              <br />
              4 saatten fazla ve 7.5 saate kadar işlerde: 30 dakika
              <br />
              7.5 saatten fazla işlerde: 1 saat
            </p>
          </div>

          {/* Calendar Display Settings */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <button onClick={() => handleInputChange('showNextMonthDays', !formData.showNextMonthDays)} className="w-full flex items-center gap-3 text-left">
              {formData.showNextMonthDays ? <CheckSquare className="w-5 h-5 text-blue-500" /> : <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />}
              <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">Takvimde sonraki ayın günlerini göster</span>
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Bu ayın son haftasında sonraki ayın günlerini gösterir. Küçük ekranlarda yer kazanmak için kapatılabilir.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex gap-3 border-t border-gray-200 dark:border-gray-700 p-4">
          <button onClick={onClose} className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium active:bg-gray-200 dark:active:bg-gray-500">
            İptal
          </button>
          <button onClick={handleSave} className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-medium active:bg-blue-600">
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};
