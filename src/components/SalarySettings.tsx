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
      setFormData(settings);
    }
  }, [settings, isOpen]);

  const handleSave = () => {
    updateSettings(formData);
    onClose();
  };

  const handleInputChange = (field: keyof SalarySettingsType, value: number | string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  const grossHourlyRate = (formData.monthlyGrossSalary / formData.monthlyWorkingHours) || 0;

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
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Aylık Brüt Maaş (₺)</label>
              <input type="number" value={formData.monthlyGrossSalary} onChange={(e) => handleInputChange('monthlyGrossSalary', Number(e.target.value))} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Aylık Çalışma Saati</label>
              <input type="number" value={formData.monthlyWorkingHours} onChange={(e) => handleInputChange('monthlyWorkingHours', Number(e.target.value))} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
            </div>
            <div className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 rounded-lg p-2 text-center text-sm font-medium">
              Brüt Saatlik Ücret: ₺{grossHourlyRate.toFixed(2)}
            </div>
          </div>

          {/* Tax Info */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-gray-800 dark:text-white">Vergi ve Kesintiler (%)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">SGK</label>
                <input type="number" value={formData.sgkRate} onChange={(e) => handleInputChange('sgkRate', Number(e.target.value))} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Gelir V.</label>
                <input type="number" value={formData.incomeTaxRate} onChange={(e) => handleInputChange('incomeTaxRate', Number(e.target.value))} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Damga V.</label>
                <input type="number" value={formData.stampTaxRate} onChange={(e) => handleInputChange('stampTaxRate', Number(e.target.value))} className="w-full p-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
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
              <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">7.5+ saatlik mesailerde 1 saat mola kesintisi uygula</span>
            </button>
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