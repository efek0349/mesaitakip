import React from 'react';
import { Clock, CheckCircle, Briefcase, ChevronDown, Info, Shield } from 'lucide-react';
import { formatHours, TURKISH_MONTHS } from '../utils/dateUtils';
import { Dialog } from '@capacitor/dialog';
import { YEARLY_LIMIT_HOURS } from '../constants';
import { useMonthlyStatsLogic } from '../hooks/useMonthlyStatsLogic';

interface MonthlyStatsTailwindProps {
  currentDate: Date;
  onOpenSettings: () => void;
  onOpenDataBackup: () => void;
}

export const MonthlyStatsTailwind: React.FC<MonthlyStatsTailwindProps> = ({ currentDate }) => {
  const {
    ready, isLoading,
    year, month,
    monthlyTotal, yearlyTotal, isOverLimit,
    overtimeStats, allowanceData, severanceData,
    bonus, salaryBase,
    currentTesRate, tesDeduction,
    netOvertimePayment, netOvertimeHours,
    attachmentRate, attachmentDeduction, finalEarnings,
    settings,
    showLimitInfo, setShowLimitInfo,
    showSeveranceDetails, setShowSeveranceDetails,
    showOvertimeDetails, setShowOvertimeDetails,
  } = useMonthlyStatsLogic(currentDate);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-dark-bg rounded-2xl shadow-lg p-2 mb-4 animate-pulse">
        <div className="w-3/4 h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        <div className="flex gap-4 mb-4">
          <div className="flex-1 h-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          <div className="flex-1 h-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-bg rounded-2xl shadow-lg p-2 mb-4">
      <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-2 ml-1">
        {TURKISH_MONTHS[month]} {year} Özeti
      </h3>

      <div className="flex gap-3 mb-4 items-stretch px-1">
        {/* Mesai Kartı */}
        <div className="flex-1 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-[22px] p-3 text-white shadow-lg border-b-4 border-indigo-900 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-blue-100 text-[0.5625rem] font-black uppercase tracking-widest opacity-80">Toplam Mesai</p>
              <div className="p-1.5 bg-white/10 rounded-lg shadow-inner">
                <Clock className="w-3.5 h-3.5 text-blue-100" />
              </div>
            </div>
            <div className="flex items-end justify-end gap-1 mb-3">
              <span className="text-2xl font-black leading-none tracking-tight">{formatHours(monthlyTotal)}</span>
              <span className="text-[0.625rem] text-blue-100 font-bold mb-0.5">saat</span>
            </div>
            <div className="space-y-2">
              {overtimeStats.mahsup.hours > 0 && (
                <div className="space-y-1.5 p-2 rounded-xl border bg-black/10 border-white/5 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 flex items-center justify-center text-blue-200 font-black text-xs">-</span>
                      <span className="text-[0.5625rem] font-black leading-none text-blue-100 uppercase">Mahsup</span>
                    </div>
                    <span className="text-[0.625rem] font-black leading-none text-white">-{formatHours(overtimeStats.mahsup.hours)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-1">
                    <span className="text-[0.5625rem] font-black leading-none text-indigo-200 uppercase tracking-tighter">Kalan Mesai</span>
                    <span className="text-[0.625rem] font-black leading-none text-white">{formatHours(netOvertimeHours)}</span>
                  </div>
                </div>
              )}
              <div
                onClick={() => setShowLimitInfo(true)}
                className={`group flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all duration-300 transform active:scale-95 shadow-inner ${isOverLimit ? 'bg-red-500/30 border-red-400/40 hover:bg-red-500/40' : 'bg-black/10 border-white/5 hover:bg-black/20 hover:ring-1 hover:ring-white/20'}`}
              >
                <div className="flex items-center gap-2">
                  <Shield className={`w-3.5 h-3.5 flex-shrink-0 ${isOverLimit ? 'text-red-300 animate-pulse' : 'text-indigo-200'}`} />
                  <span className={`text-[0.625rem] font-black leading-none ${isOverLimit ? 'text-red-200' : 'text-white'}`}>
                    {formatHours(yearlyTotal).replace(' s', 's')} (Yıllık)
                  </span>
                </div>
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20 shadow-inner ring-1 ring-white/10 group-hover:bg-white/30 transition-all">
                  <Info size={12} className="text-amber-300" />
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl border bg-black/10 border-white/5 shadow-inner">
                <CheckCircle className="w-3.5 h-3.5 text-blue-200 flex-shrink-0" />
                <span className="text-[0.625rem] font-black leading-none text-white">
                  {allowanceData.netTotalWorkingDays} İş Günü
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Kazanç Kartı */}
        <div className="flex-1 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-[22px] p-3 text-white shadow-lg border-b-4 border-teal-900 relative overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
          <div className="relative z-10 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="text-emerald-100 text-[0.5625rem] font-black uppercase tracking-widest opacity-80">Net Kazanç</p>
              <div className="w-6 h-6 bg-white/15 rounded-lg flex items-center justify-center text-[0.625rem] font-black shadow-inner">₺</div>
            </div>
            <div className="flex items-end justify-end gap-1 mb-3">
              <span className="text-2xl font-black leading-none tracking-tighter">
                ₺{finalEarnings.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex-1 flex flex-col justify-end gap-1.5">
              <div className="flex flex-col gap-1.5 p-2 rounded-xl border bg-black/10 border-white/5 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-[0.625rem] text-emerald-100 font-bold leading-none">Mesai (Net)</span>
                  <span className="text-[0.6875rem] font-black leading-none text-white">
                    ₺{netOvertimePayment.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
                {allowanceData.total > 0 && settings.showMealInExport && (
                  <div className="flex items-center justify-between border-t border-white/5 pt-1.5">
                    <span className="text-[0.625rem] text-emerald-100 font-bold leading-none">Yol/Yem</span>
                    <span className="text-[0.6875rem] font-black leading-none text-white">
                      ₺{allowanceData.total.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-white/5 pt-1.5">
                  <span className="text-[0.625rem] text-emerald-100 font-bold leading-none">Maaş</span>
                  <span className="text-[0.6875rem] font-black leading-none text-white">
                    ₺{salaryBase.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </div>
                {bonus > 0 && (
                  <div className="flex items-center justify-between border-t border-white/5 pt-1.5">
                    <span className="text-[0.625rem] text-emerald-100 font-bold leading-none">Prim</span>
                    <span className="text-[0.6875rem] font-black leading-none text-white">
                      ₺{bonus.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                )}
                {overtimeStats.leave.hours > 0 && (
                  <div className="flex items-center justify-between border-t border-white/5 pt-1.5">
                    <span className="text-[0.625rem] text-orange-200 font-black leading-none">İzin</span>
                    <span className="text-[0.6875rem] font-black leading-none text-orange-100">
                      -₺{overtimeStats.leave.deduction.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                )}
                {tesDeduction > 0 && (
                  <div className="flex items-center justify-between border-t border-white/5 pt-1.5">
                    <span className="text-[0.625rem] text-indigo-200 font-black leading-none uppercase">TES (%{currentTesRate})</span>
                    <span className="text-[0.6875rem] font-black leading-none text-indigo-100">
                      -₺{tesDeduction.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                )}
                {attachmentDeduction > 0 && (
                  <div className="flex items-center justify-between border-t border-white/5 pt-1.5">
                    <span className="text-[0.625rem] text-red-200 font-black leading-none uppercase">HACİZ (%{attachmentRate})</span>
                    <span className="text-[0.6875rem] font-black leading-none text-red-100">
                      -₺{attachmentDeduction.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Batarya İlerleme */}
      <div className="px-1 mb-6">
        <div className="bg-gray-100 dark:bg-gray-900/40 rounded-xl p-2 border border-gray-200 dark:border-gray-800">
          <div className="h-4 bg-gray-200 dark:bg-black/40 rounded-lg border-2 border-gray-300 dark:border-emerald-900/50 overflow-hidden relative mb-1">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-1000" style={{ width: `${Math.min(100, allowanceData.completionPercentage)}%` }} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[0.5625rem] font-black text-slate-800 dark:text-slate-100 uppercase">{allowanceData.totalRequiredHours} / {Math.round(allowanceData.workedHoursOnStandardDays)} SAAT</span>
            </div>
          </div>
          <div className="flex justify-between px-1">
            <span className="text-[0.5625rem] font-black text-emerald-800/80 dark:text-emerald-400/80 uppercase">ÇALIŞMA GÜNÜ: {allowanceData.workedDays}</span>
            <span className="text-[0.625rem] font-black text-emerald-600 dark:text-emerald-400">%{Math.round(allowanceData.completionPercentage)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-1 flex gap-3 mb-4">
        <button 
          onClick={() => { setShowOvertimeDetails(!showOvertimeDetails); setShowSeveranceDetails(false); }}
          className={`flex-1 py-3 px-4 rounded-[20px] transition-all border-b-4 ${showOvertimeDetails ? 'bg-indigo-600 text-white border-indigo-900 shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-300 dark:border-gray-950'}`}
        >
          <div className="flex items-center gap-2">
            <Clock size={16} />
            <span className="text-[0.6875rem] font-black uppercase">Mesai Detay</span>
            <ChevronDown size={14} className={`ml-auto transition-transform ${showOvertimeDetails ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {settings.showSeverancePay && severanceData?.eligible && (
          <button 
            onClick={() => { setShowSeveranceDetails(!showSeveranceDetails); setShowOvertimeDetails(false); }}
            className={`flex-1 py-3 px-4 rounded-[20px] transition-all border-b-4 ${showSeveranceDetails ? 'bg-emerald-600 text-white border-emerald-900 shadow-lg' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-300 dark:border-gray-950'}`}
          >
            <div className="flex items-center gap-2">
              <Briefcase size={16} />
              <span className="text-[0.6875rem] font-black uppercase">Kıdem Tazm.</span>
              <ChevronDown size={14} className={`ml-auto transition-transform ${showSeveranceDetails ? 'rotate-180' : ''}`} />
            </div>
          </button>
        )}
      </div>

      {/* Detail Sections */}
      {showOvertimeDetails && (
        <div className="px-1 pb-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-3 bg-white dark:bg-gray-900/50 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 space-y-2.5 shadow-sm">
            <div className="flex items-center gap-2 px-1 mb-2">
              <div className="w-1 h-3 bg-indigo-500 rounded-full" />
              <span className="text-[0.625rem] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">Mesai Dökümü</span>
            </div>
            {overtimeStats.normal.hours > 0 && (
              <div className="bg-blue-50/50 dark:bg-blue-900/30 rounded-xl p-3 border border-blue-100/50 dark:border-blue-800/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-800 dark:text-blue-200 font-bold text-sm">Haftaiçi Mesailer</p>
                    <p className="text-blue-600 dark:text-blue-300 text-[0.625rem] font-medium uppercase">Katsayı: {settings.weekdayMultiplier}x</p>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-800 dark:text-blue-200 font-black">{formatHours(overtimeStats.normal.hours)}</p>
                    <p className="text-blue-600 dark:text-blue-300 text-xs font-bold">₺{overtimeStats.normal.payment.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            )}
            {overtimeStats.sunday.hours > 0 && (
              <div className="bg-purple-50/50 dark:bg-purple-900/30 rounded-xl p-3 border border-purple-100/50 dark:border-purple-800/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-800 dark:text-purple-200 font-bold text-sm">Pazar Mesaileri</p>
                    <p className="text-purple-600 dark:text-purple-300 text-[0.625rem] font-medium uppercase">Katsayı: {settings.sundayMultiplier}x</p>
                  </div>
                  <div className="text-right">
                    <p className="text-purple-800 dark:text-purple-200 font-black">{formatHours(overtimeStats.sunday.hours)}</p>
                    <p className="text-purple-600 dark:text-purple-300 text-xs font-bold">₺{overtimeStats.sunday.payment.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            )}
            {overtimeStats.holiday.hours > 0 && (
              <div className="bg-red-50/50 dark:bg-red-900/30 rounded-xl p-3 border border-red-100/50 dark:border-red-800/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-800 dark:text-red-200 font-bold text-sm">Dini & Resmi Tatil</p>
                    <p className="text-red-600 dark:text-red-300 text-[0.625rem] font-medium uppercase">Katsayı: {settings.holidayMultiplier}x</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-800 dark:text-red-200 font-black">{formatHours(overtimeStats.holiday.hours)}</p>
                    <p className="text-red-600 dark:text-red-300 text-xs font-bold">₺{overtimeStats.holiday.payment.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            )}
            {overtimeStats.mahsup.hours > 0 && (
              <div className="bg-indigo-50/50 dark:bg-indigo-900/30 rounded-xl p-3 border border-indigo-100/50 dark:border-indigo-800/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-indigo-800 dark:text-indigo-200 font-bold text-sm">Mesaiden Mahsup</p>
                    <p className="text-indigo-600 dark:text-indigo-300 text-[0.625rem] font-medium uppercase">Mesai Havuzundan Düşülen</p>
                  </div>
                  <div className="text-right">
                    <p className="text-indigo-800 dark:text-indigo-200 font-black">{formatHours(overtimeStats.mahsup.hours)}</p>
                    <p className="text-indigo-600 dark:text-indigo-300 text-xs font-bold">-₺{overtimeStats.mahsup.payment.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            )}
            {overtimeStats.leave.hours > 0 && (
              <div className="bg-orange-50/50 dark:bg-orange-900/30 rounded-xl p-3 border border-orange-100/50 dark:border-orange-800/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-800 dark:text-orange-200 font-bold text-sm">Ücretsiz İzin / Kesinti</p>
                    <p className="text-orange-600 dark:text-orange-300 text-[0.625rem] font-medium uppercase">Maaştan Düşülen</p>
                  </div>
                  <div className="text-right">
                    <p className="text-orange-800 dark:text-orange-200 font-black">{formatHours(overtimeStats.leave.hours)}</p>
                    <p className="text-orange-600 dark:text-orange-300 text-xs font-bold">-₺{overtimeStats.leave.deduction.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            )}
            {overtimeStats.normal.hours === 0 && overtimeStats.sunday.hours === 0 && overtimeStats.holiday.hours === 0 && overtimeStats.leave.hours === 0 && (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-2 opacity-50">
                  <Clock className="text-gray-400" size={24} />
                </div>
                <p className="text-[0.6875rem] text-gray-400 font-black uppercase tracking-tighter">Henüz mesai kaydı bulunmuyor</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showSeveranceDetails && severanceData && (
        <div className="px-1 pb-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="p-4 bg-white dark:bg-gray-900/50 rounded-2xl border border-emerald-100 dark:border-emerald-800/50 space-y-3 shadow-sm">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                <span className="text-[0.625rem] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest">Kıdem Detayları</span>
              </div>
              <span className="text-[0.625rem] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-lg">{severanceData.years} YIL</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl">
                <span className="text-[0.625rem] font-bold text-gray-500 uppercase">Yıllık Tutar</span>
                <span className="text-xs font-black text-gray-700 dark:text-gray-200">₺{severanceData.netSeverance.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              </div>
              
              {(severanceData.months > 0 || severanceData.days > 0) && (
                <div className="flex justify-between items-center p-2 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl">
                  <span className="text-[0.625rem] font-bold text-gray-500 uppercase">
                    +{severanceData.months > 0 ? `${severanceData.months} AY ` : ''}{severanceData.days > 0 ? `${severanceData.days} GÜN ` : ''}EKSTRA
                  </span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">₺{(severanceData.monthNetSeverance + severanceData.dayNetSeverance).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
              )}

              <div className="pt-2 border-t border-dashed border-gray-200 dark:border-gray-700 space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[0.625rem] font-bold text-amber-600 uppercase tracking-tighter">Damga Vergisi Kesintisi</span>
                  <span className="text-[0.625rem] font-bold text-amber-600">-₺{severanceData.totalStampTax.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center px-1 pt-1">
                  <span className="text-xs font-black text-gray-900 dark:text-white uppercase">Toplam Net</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">₺{severanceData.totalNetSeverance.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLimitInfo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-[28px] w-full max-w-xs shadow-2xl p-6 text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4"><Shield className="w-8 h-8 text-blue-600" /></div>
            <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Yasal Sınır</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">İş Kanunu'nun 41'nci maddesinde, yıllık fazla çalışma süresinin bir yılda <span className="font-bold text-blue-600">{YEARLY_LIMIT_HOURS} saati</span> aşamayacağı belirtilmiştir!</p>
            <button onClick={() => setShowLimitInfo(false)} className="mt-6 w-full py-3 bg-blue-500 text-white rounded-2xl font-black">ANLADIM</button>
          </div>
        </div>
      )}
    </div>
  );
};
