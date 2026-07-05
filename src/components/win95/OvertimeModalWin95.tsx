import React from 'react';
import { Modal, TextArea, Input, Checkbox, Frame, TitleBar, Button } from '@react95/core';
import { getHolidayColorClass } from '../../utils/holidayUtils';
import { useOvertimeModalLogic } from '../../hooks/useOvertimeModalLogic';
import { useModalCenterPosition } from '../../hooks/useModalCenterPosition';

interface OvertimeModalWin95Props {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
}

/**
 * OvertimeModalWin95 — mesai/izin giriş formunun Win95 görünümü.
 *
 * Tasarım kararı: orijinal Tailwind versiyonu çok katmanlı renkli kartlar
 * (gradient arka planlar, gölgeler, rounded-2xl köşeler) kullanıyordu.
 * Win95'in flat estetiğinde bunun karşılığı: her bölüm bir Frame (boxShadow
 * "in" — çökük panel hissi), Mesai/İzin seçimi Tabs ile, sayısal alanlar
 * Input, checkbox'lar React95 Checkbox ile. Pencere React95 Modal — gerçek
 * bir Win95 diyalog penceresi (kapatma butonu, başlık çubuğu dahil).
 */
export const OvertimeModalWin95: React.FC<OvertimeModalWin95Props> = React.memo(({ isOpen, onClose, selectedDate }) => {
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
    departureLocked,
    noteInputRef,
    handleNumericChange,
    handleSave, handleDelete, adjustHours, adjustMinutes, handleFullDayToggle,
  } = useOvertimeModalLogic(isOpen, selectedDate, onClose);

  // Hook'lar early return'den ÖNCE çağrılmalı (React Hooks Rules) —
  // ready=false olsa bile bu hook her render'da aynı sırada çalışmalı.
  const position = useModalCenterPosition(340);

  if (!ready) return null;

  const titleText = existingEntryForCurrentType
    ? (type === 'overtime' ? 'Mesai Düzenle' : 'İzin Düzenle')
    : (type === 'overtime' ? 'Mesai Ekle' : 'İzin Ekle');

  return (
    <Modal
      key={`overtime-modal-${position.orientationKey}`}
      id="overtime-modal"
      title={titleText}
      titleBarOptions={[
        <Modal.Minimize key="minimize" />,
        <TitleBar.Close key="close" onClick={onClose} />,
      ]}
      buttons={[
        ...(existingEntryForCurrentType
          ? [{ value: 'Sil', onClick: handleDelete }]
          : []),
        { value: existingEntryForCurrentType ? 'Güncelle' : 'Kaydet', onClick: handleSave },
      ]}
      dragOptions={{ defaultPosition: position }}
      style={{ width: 340 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 4, maxHeight: position.maxHeight, overflowY: 'auto' }}>

        {/* Tarih + Tatil rozeti */}
        <Frame boxShadow="in" style={{ padding: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{formattedDate}</span>
          {holiday && (
            <span style={{ fontSize: '0.625rem', fontWeight: 700, padding: '2px 6px', backgroundColor: holiday.type === 'religious' ? '#d1fae5' : '#fee2e2' }}>
              {holiday.shortName}
            </span>
          )}
        </Frame>

        {/* Arife günü bilgi */}
        {holiday?.isHalfDay && (
          <Frame boxShadow="in" style={{ padding: 6, fontSize: '0.625rem' }}>
            ⚠ Resmi tatil saat 13:00'te başlar. Bu saatten sonraki çalışma bayram mesaisi sayılır.
          </Frame>
        )}

        {/* Pazar mesaisi bilgisi */}
        {sundayInfo && (
          <Frame boxShadow="in" style={{ padding: 6, fontSize: '0.625rem' }}>
            Pazar Katsayısı: <b>{sundayInfo.multiplier}</b> — Haftalık: {sundayInfo.currentTotal.toFixed(1)} sa
            {sundayInfo.isQualified ? ' (45 saati aştı)' : ' (45 saatin altında)'}
          </Frame>
        )}

        {/* Mesai/İzin seçici — "mesai/izin butonlarının
            altında, arka plan renginde, çerçeveli boş blok" sorununun
            GERÇEK kök sebebi React95'in kendi Tabs implementasyonunda:
            Tabs, seçili sekmenin children'ını göstermek için kendi
            içinde OTOMATİK olarak ikinci bir "navContainer" Frame'i
            oluşturuyor (gerçek kaynaktan doğrulandı — bu Frame padding
            + box-shadow + background-color içeriyor, yani children boş
            olsa BİLE görünür bir panel/blok render ediyor). Tab'lara
            children vermemek bu sorunu çözmüyordu çünkü sorun benim
            children'ımda değil, Tabs'ın kendi mimarisinde.
            Çözüm: Tabs/Tab'ı hiç kullanmıyoruz, kendi basit iki-butonlu
            seçicimizi kuruyoruz (Button + arka plan rengiyle seçili
            durum gösterimi — daha önceki düzeltmelerle tutarlı yaklaşım,
            bkz. boxShadow prop'unun Button'ın varsayılan bevel'ini
            ezdiği sorunu). */}
        <div style={{ display: 'flex', gap: 4 }}>
          <Button
            onClick={() => setType('overtime')}
            style={{
              flex: 1, fontSize: '0.6875rem', fontWeight: 700, padding: '6px 0',
              backgroundColor: type === 'overtime' ? '#000e7a' : undefined,
              color: type === 'overtime' ? '#ffffff' : '#1a1a1a',
            }}
          >
            Mesai
          </Button>
          <Button
            onClick={() => setType('leave')}
            style={{
              flex: 1, fontSize: '0.6875rem', fontWeight: 700, padding: '6px 0',
              backgroundColor: type === 'leave' ? '#000e7a' : undefined,
              color: type === 'leave' ? '#ffffff' : '#1a1a1a',
            }}
          >
            İzin
          </Button>
        </div>

        {/* Ödeme bilgisi — artık KOŞULSUZ her zaman
            gösteriliyor (önceden `currentTotalHours > 0 || isFullDay`
            koşuluyla sadece saat girilince beliriyordu, bu da pencereyi
            saat girilir girilmez aniden büyütüyordu — "render" hissi
            yaratıyordu). Artık mesai saati 0 iken de katsayı + "₺0.00"
            görünüyor, kullanıcı saat girdiğinde SADECE tutar değişiyor,
            pencere boyu hiç değişmiyor. */}
        <Frame boxShadow="in" style={{ padding: 6, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.625rem', color: '#1a1a1a' }}>{type === 'overtime' ? `${(overtimeRate / (hourlyRate || 1)).toFixed(1).replace('.0', '')}x katsayı` : 'İzin'}</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1a1a1a' }}>
            {type === 'overtime' ? '+' : '-'}₺{totalPayment.toFixed(2)}
          </span>
        </Frame>

        {/* Arife yarım gün toggle */}
        {type === 'overtime' && holiday?.isHalfDay && (
          <Checkbox
            checked={workedHalfDay}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWorkedHalfDay(e.target.checked)}
            label="Yarım gün çalışma yok (yol/yemek verilmez)"
          />
        )}

        {/* İzin: Tam gün */}
        {type === 'leave' && (
          <>
            <Checkbox
              checked={isFullDay}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFullDayToggle(e.target.checked)}
              label={`Tam gün izinli (${settings.dailyWorkingHours} saat)`}
            />
            {!isPaid && (
              <Checkbox
                checked={deductFromOvertime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeductFromOvertime(e.target.checked)}
                label="Mesaiden mahsup et"
              />
            )}
          </>
        )}

        {/* Yol/yemek verilmedi */}
        {type === 'overtime' && hasAllowanceConfigured && (
          <Checkbox
            checked={noAllowance}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNoAllowance(e.target.checked)}
            label="Yol/yemek verilmedi"
          />
        )}

        {/* Saat/Dakika ayarlayıcı */}
        <Frame boxShadow="in" style={{ padding: 6, opacity: isFullDay ? 0.5 : 1, pointerEvents: isFullDay ? 'none' : 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#1a1a1a' }}>SAAT</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button onClick={() => adjustHours(-1)} style={{ width: 28, color: '#1a1a1a' }}>-</Button>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, width: 24, textAlign: 'center', color: '#1a1a1a' }}>{hours}</span>
              <Button onClick={() => adjustHours(1)} style={{ width: 28, color: '#1a1a1a' }}>+</Button>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#1a1a1a' }}>DAKİKA</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Button onClick={() => adjustMinutes(-15)} style={{ width: 28, color: '#1a1a1a' }}>-</Button>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, width: 24, textAlign: 'center', color: '#1a1a1a' }}>{minutes}</span>
              <Button onClick={() => adjustMinutes(15)} style={{ width: 28, color: '#1a1a1a' }}>+</Button>
            </div>
          </div>
        </Frame>

        {/* Prim/İkramiye + Yol/Yemek — sadece mesai sekmesinde */}
        {type === 'overtime' && (
          <>
            <Frame boxShadow="in" style={{ padding: 6 }}>
              <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 4 }}>PRİM / İKRAMİYE (Tüm ay)</div>
              <Input
                type="text"
                inputMode="decimal"
                value={monthlyBonus}
                onChange={(e) => handleNumericChange(setMonthlyBonus)(e.target.value)}
                style={{ width: '100%' }}
                placeholder="0.00"
              />
            </Frame>

            {hasAllowanceConfigured && (
              <Frame boxShadow="in" style={{ padding: 6 }}>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 4 }}>
                  YOL / YEMEK {departureLocked && '(Gidiş kilitli)'}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                  <div>
                    <div style={{ fontSize: '0.5625rem', marginBottom: 2 }}>Yemek</div>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={dailyMeal}
                      onChange={(e) => handleNumericChange(setDailyMeal)(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.5625rem', marginBottom: 2 }}>Gidiş</div>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={departureTravel}
                      readOnly={departureLocked}
                      onChange={(e) => !departureLocked && handleNumericChange(setDepartureTravel)(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.5625rem', marginBottom: 2 }}>Dönüş</div>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={returnTravel}
                      onChange={(e) => handleNumericChange(setReturnTravel)(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </Frame>
            )}
          </>
        )}

        {/* Not alanı */}
        <Frame boxShadow="in" style={{ padding: 6 }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 4 }}>NOT ({note.length}/200)</div>
          <TextArea
            ref={noteInputRef}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Mesai açıklaması..."
            maxLength={200}
            rows={3}
            style={{ width: '100%', resize: 'none' }}
          />
        </Frame>
      </div>
    </Modal>
  );
});

OvertimeModalWin95.displayName = 'OvertimeModalWin95';
