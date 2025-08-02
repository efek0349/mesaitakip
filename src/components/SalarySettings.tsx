import React, { useState, useEffect } from 'react';
import { X, Settings, DollarSign } from 'lucide-react';
import { useSalarySettings } from '../hooks/useSalarySettings';
import { useAndroidSafeArea } from '../hooks/useAndroidSafeArea';
import { SalarySettings as SalarySettingsType } from '../types/overtime';

interface SalarySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SalarySettings: React.FC<SalarySettingsProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, getHourlyRate } = useSalarySettings();
  const { getModalStyle, getButtonContainerStyle, isAndroid } = useAndroidSafeArea();
  const [formData, setFormData] = useState<SalarySettingsType>(settings);

  // Update form data when settings change or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(settings);
    }
  }, [settings, isOpen]);

  const handleSave = () => {
    updateSettings(formData);
    onClose();
  };

  const handleInputChange = (field: keyof SalarySettingsType, value: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  const grossHourlyRate = formData.monthlyGrossSalary / formData.monthlyWorkingHours;
  
  // Net saatlik ücret hesaplama (örnek olarak normal mesai için)
  let netOvertimeRate = 0;
  
  if (formData.monthlyGrossSalary > 0 && formData.monthlyWorkingHours > 0) {
    const grossOvertimeRate = grossHourlyRate * formData.weekdayMultiplier;
    const sgkAndUnemployment = grossOvertimeRate * 0.15;
    const afterSgk = grossOvertimeRate - sgkAndUnemployment;
    const incomeTax = afterSgk * 0.15;
    const stampTax = grossOvertimeRate * 0.00759;
    netOvertimeRate = Math.max(0, grossOvertimeRate - sgkAndUnemployment - incomeTax - stampTax);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div 
        className={`
          bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto
          ${isAndroid ? 'modal-android android-safe-modal' : 'max-h-[85vh] mb-safe'}
        `}
        style={isAndroid ? getModalStyle() : undefined}
      >
        {/* Sabit Header */}
        <div className="sticky top-0 bg-white z-10 border-b border-gray-100 p-4 sm:p-6 pb-3 sm:pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <div className="w-6 h-6 text-green-600 flex items-center justify-center text-lg font-bold">₺</div>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Maaş Ayarları</h2>
            </div>
            <button
              onClick={onClose}
              className="p-3 rounded-lg active:bg-gray-100 transition-colors touch-manipulation"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 pt-2 sm:pt-3">
          <div className="space-y-4 sm:space-y-6">
            {/* Kişisel Bilgiler */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-3 sm:mb-4">Kişisel Bilgiler</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ad
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Adınızı girin"
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Soyad
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Soyadınızı girin"
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  />
                </div>
              </div>
            </div>
            {/* Maaş Bilgileri */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-3 sm:mb-4">Maaş Bilgileri</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aylık Brüt Maaş (₺)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.monthlyGrossSalary}
                    onChange={(e) => handleInputChange('monthlyGrossSalary', Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    onTouchStart={(e) => {
                      // Android için özel davranış
                      setTimeout(() => {
                        e.currentTarget.select();
                      }, 100);
                    }}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  />
                </div>


                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aylık Çalışma Saati
                  </label>
                  <input
                    type="number"
                    value={formData.monthlyWorkingHours}
                    onChange={(e) => handleInputChange('monthlyWorkingHours', Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    onTouchStart={(e) => {
                      // Android için özel davranış
                      setTimeout(() => {
                        e.currentTarget.select();
                      }, 100);
                    }}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  />
                </div>
              </div>
            </div>

            {/* Vergi ve Kesinti Oranları */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-3 sm:mb-4">Vergi ve Kesinti Oranları (%)</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SGK + İşsizlik (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.sgkRate}
                      onChange={(e) => handleInputChange('sgkRate', Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      onTouchStart={(e) => {
                        setTimeout(() => {
                          e.currentTarget.select();
                        }, 100);
                      }}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gelir Vergisi (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.incomeTaxRate}
                      onChange={(e) => handleInputChange('incomeTaxRate', Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      onTouchStart={(e) => {
                        setTimeout(() => {
                          e.currentTarget.select();
                        }, 100);
                      }}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Damga Vergisi (%0,759)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.stampTaxRate}
                    onChange={(e) => handleInputChange('stampTaxRate', Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    onTouchStart={(e) => {
                      setTimeout(() => {
                        e.currentTarget.select();
                      }, 100);
                    }}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                  />
                </div>

                <div className="space-y-2">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-blue-700 font-semibold text-center text-sm">
                      Brüt Saatlik Ücret: ₺{(grossHourlyRate || 0).toFixed(2)}
                    </p>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-green-700 font-semibold text-center text-sm">
                      Net Mesai Ücreti (Normal): ₺{(netOvertimeRate || 0).toFixed(2)}/saat
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mesai Katsayıları */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-3 sm:mb-4">Mesai Katsayıları</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hafta İçi (Pzt-Cum)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.weekdayMultiplier}
                      onChange={(e) => handleInputChange('weekdayMultiplier', Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      onTouchStart={(e) => {
                        setTimeout(() => {
                          e.currentTarget.select();
                        }, 100);
                      }}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cumartesi
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.saturdayMultiplier}
                      onChange={(e) => handleInputChange('saturdayMultiplier', Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      onTouchStart={(e) => {
                        setTimeout(() => {
                          e.currentTarget.select();
                        }, 100);
                      }}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pazar
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.sundayMultiplier}
                      onChange={(e) => handleInputChange('sundayMultiplier', Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      onTouchStart={(e) => {
                        setTimeout(() => {
                          e.currentTarget.select();
                        }, 100);
                      }}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Resmi Tatil
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.holidayMultiplier}
                      onChange={(e) => handleInputChange('holidayMultiplier', Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      onTouchStart={(e) => {
                        setTimeout(() => {
                          e.currentTarget.select();
                        }, 100);
                      }}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Mola Kesintisi Ayarı */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-3 sm:mb-4">Mola Ayarları</h3>
              
              <div className="flex items-start gap-3">
                <button
                  onClick={() => setFormData(prev => ({ ...prev, deductBreakTime: !prev.deductBreakTime }))}
                  className="flex-shrink-0 mt-1"
                >
                  {formData.deductBreakTime ? (
                    <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>
                  )}
                </button>
                
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    8+ saat mesailerde 1 saatlik mola kesintisi
                  </label>
                  <p className="text-xs text-gray-500">
                    Bu seçenek aktif olduğunda, 8 saat ve üzeri mesai girişlerinde otomatik olarak 1 saat mola kesintisi yapılır ve ücret hesaplamasında bu düşülmüş saat dikkate alınır.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div 
            className={`
              flex flex-col sm:flex-row gap-3 mt-4 sm:mt-6
              ${isAndroid ? 'android-safe-button' : 'pb-safe'}
            `}
            style={isAndroid ? getButtonContainerStyle() : undefined}
          >
            <button
              onClick={onClose}
              className={`
                flex-1 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium 
                active:bg-gray-200 transition-colors touch-manipulation
                ${isAndroid ? 'android-button' : 'py-4 min-h-[48px]'}
              `}
            >
              İptal
            </button>
            
            <button
              onClick={handleSave}
              className={`
                flex-1 px-4 bg-blue-500 text-white rounded-lg font-medium 
                active:bg-blue-600 transition-colors touch-manipulation
                ${isAndroid ? 'android-button' : 'py-4 min-h-[48px]'}
              `}
            >
              Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
