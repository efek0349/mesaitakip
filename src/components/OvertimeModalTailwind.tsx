import React from 'react';
import { X, Plus, Minus, Clock, Edit3, Info, Sun, Moon, ChevronLeft, CreditCard, ArrowUpRight, ArrowDownLeft, Lock, Unlock } from 'lucide-react';
import { useAndroidSafeArea } from '../hooks/useAndroidSafeArea';
import { getHolidayColorClass } from '../utils/holidayUtils';
import { useOvertimeModalLogic } from '../hooks/useOvertimeModalLogic';

interface OvertimeModalTailwindProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
}

export const OvertimeModalTailwind: React.FC<OvertimeModalTailwindProps> = React.memo(({ isOpen, onClose, selectedDate }) => {
  const { modalStyle, buttonContainerStyle } = useAndroidSafeArea();

  const {
    ready,
    holiday, formattedDate, isSaturday, isSunday, shiftType,
    hasAllowanceConfigured, currentTotalHours, overtimeRate, hourlyRate, totalPayment,
    existingEntryForCurrentType, sundayInfo, settings,
    type, setType,
    hours, minutes,
    isFullDay,
    isPaid,
    deductFromOvertime, setDeductFromOvertime,
    workedHalfDay, setWorkedHalfDay,
    noAllowance, setNoAllowance,
    note, setNote,
    showNoteSection, setShowNoteSection,
    monthlyBonus, setMonthlyBonus,
    dailyMeal, setDailyMeal,
    departureTravel, setDepartureTravel,
    returnTravel, setReturnTravel,
    departureLocked, setDepartureLocked,
    noteInputRef,
    handleNumericFocus, handleNumericBlur, handleNumericChange,
    handleSave, handleDelete, adjustHours, adjustMinutes, handleFullDayToggle,
  } = useOvertimeModalLogic(isOpen, selectedDate, onClose);

  if (!ready) return null;

  const renderHalfDayInfo = () => {
    if (!holiday?.isHalfDay) return null;
    let message = "Resmi tatil bugün saat 13:00'te başlamaktadır.";
    let subMessage = "Bu saatten sonraki çalışmalar bayram mesaisi sayılır.";
    let icon = <Info className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
    if (shiftType) {
      if (shiftType === 'night') {
        message = "Gece vardiyası 13:00'ten sonra başladığı için tamamı bayram sayılır.";
        subMessage = "Bu geceki çalışmanızın tamamı resmi tatil mesaisi (katsayılı) olarak hesaplanmalıdır.";
        icon = <Moon className="w-5 h-5 text-indigo-500" />;
      } else if (shiftType === 'afternoon') {
        message = "Öğle vardiyası 13:00'ten sonra başladığı için tamamı bayram sayılır.";
        subMessage = "Vardiya başlangıcınız tatil saatine denk geldiği için mesainiz bayram statüsündedir.";
        icon = <Sun className="w-5 h-5 text-yellow-500" />;
      } else if (shiftType === 'morning' || shiftType === 'day') {
        message = "Sabah vardiyası için tatil 13:00'te başlar.";
        subMessage = "13:00'e kadar normal, 13:00'ten sonraki saatleriniz bayram mesaisi sayılır.";
        icon = <Sun className="w-5 h-5 text-orange-500" />;
      }
    }
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3 flex gap-3 items-start animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1">
          <p className="text-xs font-bold text-amber-900 dark:text-amber-200">{message}</p>
          <p className="text-[0.625rem] text-amber-700 dark:text-amber-400 mt-0.5">{subMessage}</p>
        </div>
      </div>
    );
  };

  // sundayInfo: useOvertimeModalLogic hook'undan gelir (currentTotal, isQualified, multiplier).
  // Pazar günü değilse veya tatilse hook zaten null döner.
  const renderSundayInfo = () => {
    if (!sundayInfo) return null;
    const { currentTotal, isQualified, multiplier } = sundayInfo;
    return (
      <div className={`border rounded-xl p-3 flex gap-3 items-start animate-in fade-in slide-in-from-top-2 duration-300 ${
        isQualified 
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40' 
          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40'
      }`}>
        <div className="mt-0.5">
          <Info className={`w-5 h-5 ${isQualified ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`} />
        </div>
        <div className="flex-1">
          <p className={`text-xs font-bold ${isQualified ? 'text-green-900 dark:text-green-200' : 'text-blue-900 dark:text-blue-200'}`}>
            Pazar Mesaisi Katsayısı: {multiplier}
          </p>
          <p className={`text-[0.625rem] mt-0.5 ${isQualified ? 'text-green-700 dark:text-green-400' : 'text-blue-700 dark:text-blue-400'}`}>
            Haftalık çalışma süreniz: <span className="font-bold">{currentTotal.toFixed(1)} sa</span>. 
            {isQualified 
              ? ` 45 saati aştığınız için ${multiplier} katı uygulanıyor.` 
              : ` 45 saatin altında kaldığınız için ${multiplier} katı uygulanıyor.`}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 h-screen-dynamic hardware-accelerated">
      <div 
        className="bg-white dark:bg-dark-bg rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-full transition-all duration-300"
        style={modalStyle}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
          {showNoteSection ? (
            // Not modundayken geri butonu
            <button
              onClick={() => setShowNoteSection(false)}
              className="flex items-center gap-1 text-blue-500 active:opacity-60 transition-opacity"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-bold">Geri</span>
            </button>
          ) : (
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">
              {existingEntryForCurrentType
                ? (type === 'overtime' ? 'Mesai Düzenle' : 'İzin Düzenle')
                : (type === 'overtime' ? 'Mesai Ekle' : 'İzin Ekle')}
            </h2>
          )}
          <button onClick={onClose} className="p-2 rounded-full active:bg-gray-100 dark:active:bg-gray-600">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Not modu açıkken sadece textarea göster */}
          {showNoteSection ? (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <label className="text-[0.625rem] font-black text-gray-400 uppercase tracking-widest pl-1">
                {note.trim() ? 'Notu Düzenle' : 'Not Ekle'}
              </label>
              <textarea
                ref={noteInputRef}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Mesai açıklaması (proje, görev, vb.)"
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none resize-none shadow-inner"
                maxLength={200}
                rows={6}
              />
              <div className="text-[0.625rem] text-gray-400 font-black text-right pr-1 uppercase tracking-widest">
                {note.length} / 200
              </div>
            </div>
          ) : (
            <>
              {renderHalfDayInfo()}
              {renderSundayInfo()}

              {/* Type Toggle */}
              <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl shadow-inner border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setType('overtime')}
                  className={`flex-1 py-2.5 text-sm font-black rounded-xl transition-all duration-300 relative overflow-hidden ${
                    type === 'overtime'
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-[0_4px_10px_-2px_rgba(59,130,246,0.5),inset_0_1px_2px_rgba(255,255,255,0.4)] border-b-2 border-blue-800'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {type === 'overtime' && <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />}
                  <span className="relative z-10">Mesai</span>
                </button>
                <button
                  onClick={() => setType('leave')}
                  className={`flex-1 py-2.5 text-sm font-black rounded-xl transition-all duration-300 relative overflow-hidden ${
                    type === 'leave'
                      ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-[0_4px_10px_-2px_rgba(249,115,22,0.5),inset_0_1px_2px_rgba(255,255,255,0.4)] border-b-2 border-orange-800'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {type === 'leave' && <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />}
                  <span className="relative z-10">İzin</span>
                </button>
              </div>

              {/* Date & Payment Info */}
              <div className="flex items-center justify-between flex-wrap gap-2 px-1">
                <div className="flex items-center gap-2">
                  <Clock className={`w-5 h-5 ${type === 'overtime' ? 'text-blue-500' : 'text-orange-500'}`} />
                  <span className="text-base text-gray-700 dark:text-gray-200 font-bold">{formattedDate}</span>
                  {type === 'overtime' && (
                    <div className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[0.625rem] font-black px-2 py-0.5 rounded-lg border border-indigo-200/50 dark:border-indigo-800/50 shadow-sm">
                      {(() => {
                        const rate = overtimeRate;
                        const baseRate = hourlyRate;
                        const multiplier = baseRate > 0 ? (rate / baseRate).toFixed(1).replace('.0', '') : '0';
                        return `${multiplier}x`;
                      })()}
                    </div>
                  )}
                  {holiday && (
                    <div className={`text-[0.625rem] px-2.5 py-1 rounded-full font-black uppercase tracking-tighter shadow-sm border ${getHolidayColorClass(holiday)} dark:bg-opacity-30`}>
                      {holiday.shortName}
                    </div>
                  )}
                </div>
                {(currentTotalHours > 0 || isFullDay) && (
                  <div className={`px-3 py-1.5 rounded-xl border-b-2 shadow-sm ${
                    type === 'overtime' 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40 text-green-700 dark:text-green-300' 
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300'
                  }`}>
                    <span className="text-xs font-black">
                      {type === 'overtime' ? '₺' : '-₺'}
                      {totalPayment.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Arife Günü Yarım Gün Toggle */}
              {type === 'overtime' && holiday?.isHalfDay && (
                <div className="flex items-center justify-between p-4 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-900/10 rounded-2xl border border-amber-200/50 dark:border-amber-800/30 shadow-inner animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-amber-900 dark:text-amber-200">Yarım Gün Çalışma Yok</span>
                    <span className="text-[0.625rem] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-tighter">Yol ve yemek ücreti verilmez</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={workedHalfDay}
                      onChange={(e) => setWorkedHalfDay(e.target.checked)}
                    />
                    <div className="w-12 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-amber-500 shadow-inner"></div>
                  </label>
                </div>
              )}

              {/* Tam Gün İzinli */}
              {type === 'leave' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-900/10 rounded-2xl border border-orange-200/50 dark:border-orange-800/30 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-orange-100 dark:bg-orange-800/40 rounded-lg text-orange-600 dark:text-orange-400">
                        <Sun className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[0.6875rem] font-black text-orange-900 dark:text-orange-200 uppercase tracking-tighter leading-none">Tam Gün İzinli</span>
                        <span className="text-[0.5625rem] text-orange-600/70 dark:text-orange-400/60 font-bold italic mt-0.5">{settings.dailyWorkingHours} saat</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={isFullDay}
                        onChange={(e) => handleFullDayToggle(e.target.checked)}
                      />
                      <div className="w-10 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500 shadow-inner"></div>
                    </label>
                  </div>

                  {!isPaid && (
                    <div className="flex items-center justify-between p-3 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-900/20 dark:to-indigo-900/10 rounded-2xl border border-indigo-200/50 dark:border-indigo-800/30 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 dark:bg-indigo-800/40 rounded-lg text-indigo-600 dark:text-indigo-400">
                          <Minus className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[0.6875rem] font-black text-indigo-900 dark:text-indigo-200 uppercase tracking-tighter leading-none">Mesaiden Mahsup</span>
                          <span className="text-[0.5625rem] text-indigo-600/70 dark:text-indigo-400/60 font-bold italic mt-0.5">Maaştan değil, mesai alacağından düşer</span>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={deductFromOvertime}
                          onChange={(e) => setDeductFromOvertime(e.target.checked)}
                        />
                        <div className="w-10 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-500 shadow-inner"></div>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Yol/Yemek Verilmedi — sadece mesai sekmesinde ve yol/yemek tanımlıysa */}
              {type === 'overtime' && hasAllowanceConfigured && (
              <div className="flex items-center justify-between p-3 bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-900/20 dark:to-rose-900/10 rounded-2xl border border-rose-200/50 dark:border-rose-800/30 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-rose-100 dark:bg-rose-800/40 rounded-lg text-rose-600 dark:text-rose-400">
                    <Minus className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[0.6875rem] font-black text-rose-900 dark:text-rose-200 uppercase tracking-tighter leading-none">Yol/Yemek Verilmedi</span>
                    <span className="text-[0.5625rem] text-rose-600/70 dark:text-rose-400/60 font-bold italic mt-0.5">Bu güne ait yol/yemek düşülür</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={noAllowance}
                    onChange={(e) => setNoAllowance(e.target.checked)}
                  />
                  <div className="w-10 h-5 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-rose-500 shadow-inner"></div>
                </label>
              </div>
              )}

              {/* Time Adjusters */}
              <div className={`transition-opacity px-1 ${isFullDay ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                  <div className="flex items-center justify-between py-1.5 px-3 border-b border-gray-100 dark:border-gray-800/60">
                    <span className="text-sm font-black text-gray-500 uppercase tracking-widest">Saat</span>
                    <div className="flex items-center gap-4">
                      <button onClick={() => adjustHours(-1)} className="group relative w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 border-b-4 border-gray-300 dark:border-gray-950 shadow-md active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                        <Minus className="w-5 h-5 text-gray-700 dark:text-white relative z-10" />
                      </button>
                      <span className="text-2xl font-black w-10 text-center text-gray-800 dark:text-white">{hours}</span>
                      <button onClick={() => adjustHours(1)} className="group relative w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 border-b-4 border-gray-300 dark:border-gray-950 shadow-md active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                        <Plus className="w-5 h-5 text-gray-700 dark:text-white relative z-10" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-1.5 px-3">
                    <span className="text-sm font-black text-gray-500 uppercase tracking-widest">Dakika</span>
                    <div className="flex items-center gap-4">
                      <button onClick={() => adjustMinutes(-15)} className="group relative w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 border-b-4 border-gray-300 dark:border-gray-950 shadow-md active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                        <Minus className="w-5 h-5 text-gray-700 dark:text-white relative z-10" />
                      </button>
                      <span className="text-2xl font-black w-10 text-center text-gray-800 dark:text-white">{minutes}</span>
                      <button onClick={() => adjustMinutes(15)} className="group relative w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 border-b-4 border-gray-300 dark:border-gray-950 shadow-md active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                        <Plus className="w-5 h-5 text-gray-700 dark:text-white relative z-10" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Bonus Section */}
              {type === 'overtime' && (
                <div className="space-y-2">
                  <div className="pt-2 px-1">
                    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-800/30 p-3 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-amber-100 dark:bg-amber-800/40 rounded-lg">
                          <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[0.6875rem] font-black text-amber-900 dark:text-amber-200 uppercase tracking-tighter leading-none">Prim / İkramiye</span>
                          <span className="text-[0.5625rem] text-amber-600/70 dark:text-amber-400/60 font-bold italic mt-0.5">Tüm ay için geçerli</span>
                        </div>
                      </div>
                      <div className="relative w-32">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-600 dark:text-amber-400 font-bold text-xs pointer-events-none">₺</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={monthlyBonus}
                          onChange={(e) => {
                            let val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                            const parts = val.split('.');
                            if (parts.length > 2) {
                              val = parts[0] + '.' + parts.slice(1).join('');
                            }
                            setMonthlyBonus(val);
                          }}
                          onFocus={handleNumericFocus}
                          onBlur={handleNumericBlur(setMonthlyBonus)}
                          className="w-full pl-6 pr-3 py-2 bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700/50 rounded-xl text-amber-900 dark:text-white font-black text-sm focus:ring-2 focus:ring-amber-500 outline-none text-right shadow-sm"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Yol / Yemek Mini Güncelleme — yol/yemek tanımlıysa göster */}
                  {hasAllowanceConfigured && (
                  <div className="pt-1 px-1">
                    <div className="bg-slate-50 dark:bg-slate-900/20 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 p-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
                      {/* Başlık */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <ArrowUpRight className="w-3 h-3 text-slate-400" />
                        <span className="text-[0.5625rem] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Yol / Yemek</span>
                        {departureLocked ? (
                          <button
                            onClick={() => setDepartureLocked(false)}
                            className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-400 dark:text-blue-500 active:scale-95 transition-all"
                          >
                            <Unlock size={9} />
                            <span className="text-[0.5rem] font-bold">Gidişi düzenle</span>
                          </button>
                        ) : (
                          <span className="text-[0.5rem] text-slate-400 dark:text-slate-500 italic ml-auto">Bu tarihten itibaren</span>
                        )}
                      </div>
                      {/* 3 alan yan yana */}
                      <div className="grid grid-cols-3 gap-1.5">
                        {/* Yemek */}
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[0.5rem] font-black text-emerald-500 pointer-events-none">Y</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={dailyMeal}
                            onChange={(e) => {
                              let val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                              const parts = val.split('.');
                              if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
                              setDailyMeal(val);
                            }}
                            onFocus={handleNumericFocus}
                            onBlur={handleNumericBlur(setDailyMeal)}
                            className="w-full pl-5 pr-1.5 py-2 bg-white dark:bg-gray-800/80 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-slate-900 dark:text-white font-black text-xs focus:ring-2 focus:ring-emerald-400 outline-none text-right"
                          />
                        </div>
                        {/* Gidiş */}
                        <div className="relative">
                          {departureLocked
                            ? <Lock className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-300 pointer-events-none" />
                            : <ArrowUpRight className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-blue-400 pointer-events-none" />
                          }
                          <input
                            type="text"
                            inputMode="decimal"
                            value={departureTravel}
                            readOnly={departureLocked}
                            onChange={(e) => {
                              if (departureLocked) return;
                              let val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                              const parts = val.split('.');
                              if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
                              setDepartureTravel(val);
                            }}
                            onFocus={handleNumericFocus}
                            onBlur={handleNumericBlur(setDepartureTravel)}
                            className={`w-full pl-6 pr-1.5 py-2 border rounded-xl font-black text-xs outline-none text-right transition-colors ${
                              departureLocked
                                ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                : 'bg-white dark:bg-gray-800/80 border-blue-200 dark:border-blue-800/40 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-400'
                            }`}
                          />
                        </div>
                        {/* Dönüş */}
                        <div className="relative">
                          <ArrowDownLeft className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-purple-400 pointer-events-none" />
                          <input
                            type="text"
                            inputMode="decimal"
                            value={returnTravel}
                            onChange={(e) => {
                              let val = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
                              const parts = val.split('.');
                              if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
                              setReturnTravel(val);
                            }}
                            onFocus={handleNumericFocus}
                            onBlur={handleNumericBlur(setReturnTravel)}
                            className="w-full pl-6 pr-1.5 py-2 bg-white dark:bg-gray-800/80 border border-purple-200 dark:border-purple-800/40 rounded-xl text-slate-900 dark:text-white font-black text-xs focus:ring-2 focus:ring-purple-400 outline-none text-right"
                          />
                        </div>
                      </div>
                      {/* Etiketler */}
                      <div className="grid grid-cols-3 gap-1.5 mt-1">
                        <span className="text-[0.5rem] font-bold text-emerald-500 text-center">Yemek</span>
                        <span className="text-[0.5rem] font-bold text-blue-400 text-center">Gidiş</span>
                        <span className="text-[0.5rem] font-bold text-purple-400 text-center">Dönüş</span>
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              )}

              {/* Not Ekle Butonu */}
              <div className="pt-2 px-1">
                <button 
                  onClick={() => setShowNoteSection(true)} 
                  className="w-full flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-3 rounded-xl border border-blue-100 dark:border-blue-800/30 active:scale-95 transition-all font-bold text-sm"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{note.trim() ? 'Notu Düzenle' : 'Not Ekle'}</span>
                  {note.trim() && (
                    <span className="ml-1 text-[0.625rem] bg-blue-100 dark:bg-blue-800/40 text-blue-500 px-2 py-0.5 rounded-full font-black">
                      {note.length}
                    </span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer Buttons */}
        <div 
          className="flex-shrink-0 flex gap-4 border-t border-gray-100 dark:border-gray-800 p-4"
          style={buttonContainerStyle}
        >
          {!showNoteSection && existingEntryForCurrentType && (
            <button 
              onClick={handleDelete} 
              className="group relative flex-1 py-4 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-[18px] font-black uppercase tracking-widest text-xs shadow-[0_8px_16px_-4px_rgba(239,68,68,0.4),inset_0_2px_4px_rgba(255,255,255,0.3)] border-b-4 border-red-900 active:translate-y-1 active:border-b-0 transition-all overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
              <span className="relative z-10">Sil</span>
            </button>
          )}
          <button
            onClick={showNoteSection ? () => setShowNoteSection(false) : handleSave}
            className={`group relative flex-1 py-4 text-white rounded-[18px] font-black uppercase tracking-widest text-xs border-b-4 active:translate-y-1 active:border-b-0 transition-all overflow-hidden ${
              showNoteSection
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-[0_8px_16px_-4px_rgba(59,130,246,0.4),inset_0_2px_4px_rgba(255,255,255,0.3)] border-blue-900'
                : 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-[0_8px_16px_-4px_rgba(59,130,246,0.4),inset_0_2px_4px_rgba(255,255,255,0.3)] border-blue-900'
            }`}
          >
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
            <span className="relative z-10">
              {showNoteSection ? 'Tamam' : (existingEntryForCurrentType ? 'Güncelle' : 'Kaydet')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
});

OvertimeModalTailwind.displayName = 'OvertimeModalTailwind';
