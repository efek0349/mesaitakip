import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { Modal, TitleBar, Tabs, Tab, Frame, Input, Checkbox, Button, Range } from '@react95/core';
import { useTheme, FontScale } from '../../hooks/useTheme';
import { APP_VERSION } from '../../constants';
import { useSettingsLogic, SettingsTab } from '../../hooks/useSettingsLogic';
import { useModalCenterPosition } from '../../hooks/useModalCenterPosition';

interface SettingsWin95Props {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
}

const TAB_LABELS: Record<SettingsTab, string> = {
  general: 'Genel',
  salary: 'Maaş',
  tax: 'Vergi',
  severance: 'Kıdem',
  system: 'Sistem',
};

const TAB_BY_LABEL: Record<string, SettingsTab> = {
  'Genel': 'general',
  'Maaş': 'salary',
  'Vergi': 'tax',
  'Kıdem': 'severance',
  'Sistem': 'system',
};

/**
 * SettingsWin95 — ayarlar formunun Win95 görünümü.
 *
 * Tasarım kararı: orijinal Tailwind versiyonu özel tasarlanmış gradient
 * toggle switch'ler kullanıyordu. Win95'te bunun karşılığı: gerçek React95
 * `Checkbox` (klasik kare kutucuk + tik işareti) — Win95 hiçbir zaman
 * "ios-style toggle switch" kullanmadı, bu yüzden Checkbox estetik olarak
 * daha doğru. 4 sekme React95 `Tabs`/`Tab` ile, her sekme içeriği `Frame
 * boxShadow="in"` panellerine bölünmüş.
 */
export const SettingsWin95: React.FC<SettingsWin95Props> = ({ isOpen, onClose, currentDate }) => {
  const {
    isWeb,
    activeTab, setActiveTab,
    formData,
    updateStatus,
    handleSave,
    checkUpdates,
    handleInputChange,
    severancePreview,
    noticePayPreview,
    annualLeavePreview,
    taxCalcGross, setTaxCalcGross,
    taxCalcCumulativeBase, setTaxCalcCumulativeBase,
    taxCalcResult,
    applyTaxCalcResultToSalary,
    resetTaxSettingsToDefault,
  } = useSettingsLogic(isOpen, onClose, currentDate);

  const position = useModalCenterPosition(360);

  if (!isOpen) return null;

  return (
    // ÖNEMLİ: Modal'a maxHeight/overflowY VERİLMİYOR. Sebep: Modal'ın gerçek
    // DOM yapısında TitleBar de Modal'ın doğrudan child'ı (içerik ile aynı
    // seviyede), Modal'ın kendisine scroll verilirse TitleBar de scroll
    // alanının içine girip kayıyor ("Kapat/Ayarlar yazısı
    // sabit değil, scroll ile birlikte kayıyor" sorunu tam buydu). Çözüm:
    // Modal sınırsız büyüsün (TitleBar her zaman üstte sabit), scroll
    // sınırını SADECE içerik div'ine (aşağıda) veriyoruz — bu sınır artık
    // useModalCenterPosition'dan gelen GERÇEK (TaskBar'a göre hesaplanmış)
    // maxHeight, sabit bir tahmin değil. Böylece Genel ↔ Maaş gibi farklı
    // uzunluktaki sekmeler arasında geçince Modal'ın konumu/kapsamı asla
    // TaskBar'ın altına taşmıyor.
    <Modal
      key={`settings-modal-${position.orientationKey}`}
      id="settings-modal"
      title="Ayarlar"
      titleBarOptions={[
        <Modal.Minimize key="minimize" />,
        <TitleBar.Close key="close" onClick={onClose} />,
      ]}
      buttons={[
        { value: 'İptal', onClick: onClose },
        { value: 'Kaydet', onClick: handleSave },
      ]}
      dragOptions={{ defaultPosition: position }}
      style={{ width: 360 }}
    >
      <div style={{ padding: 4, maxHeight: position.maxHeight, overflowY: 'auto' }}>
        <Tabs
          defaultActiveTab={TAB_LABELS[activeTab]}
          onChange={((label: string) => setActiveTab(TAB_BY_LABEL[label] ?? 'general')) as any}
        >
          {/* ─── GENEL ─────────────────────────────────────────────────── */}
          <Tab title="Genel">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 6 }}>
              <Frame boxShadow="in" style={{ padding: 6 }}>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 4 }}>PROFİL BİLGİLERİ</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div>
                    <div style={{ fontSize: '0.5625rem', marginBottom: 2 }}>Adınız</div>
                    <Input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.5625rem', marginBottom: 2 }}>Soyadınız</div>
                    <Input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </Frame>

              <Frame boxShadow="in" style={{ padding: 6 }}>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 4 }}>VARDİYA DÜZENİ</div>
                <Checkbox
                  checked={formData.shiftSystemEnabled}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('shiftSystemEnabled', e.target.checked)}
                  label="Vardiya Takibi (haftalık döngü renklendirmesi)"
                />

                {formData.shiftSystemEnabled && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #868a8e', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button
                        onClick={() => handleInputChange('shiftSystemType', '2-shift')}
                        style={{
                          flex: 1, fontSize: '0.5625rem', padding: '4px 2px',
                          backgroundColor: formData.shiftSystemType === '2-shift' ? '#000e7a' : undefined,
                          color: formData.shiftSystemType === '2-shift' ? '#ffffff' : '#1a1a1a',
                        }}
                      >
                        2 VARDİYA (G-G)
                      </Button>
                      <Button
                        onClick={() => handleInputChange('shiftSystemType', '3-shift')}
                        style={{
                          flex: 1, fontSize: '0.5625rem', padding: '4px 2px',
                          backgroundColor: formData.shiftSystemType === '3-shift' ? '#000e7a' : undefined,
                          color: formData.shiftSystemType === '3-shift' ? '#ffffff' : '#1a1a1a',
                        }}
                      >
                        3 VARDİYA (S-A-G)
                      </Button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <div>
                        <div style={{ fontSize: '0.5625rem', marginBottom: 2 }}>Başlangıç Tarihi</div>
                        <div style={{ position: 'relative' }}>
                          <Input
                            type="date"
                            value={formData.shiftStartDate}
                            onChange={(e) => handleInputChange('shiftStartDate', e.target.value)}
                            style={{ width: '100%', paddingRight: 18 }}
                          />
                          <Calendar size={11} style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', color: '#5a5a5a', pointerEvents: 'none' }} />
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.5625rem', marginBottom: 2 }}>İlk Hafta</div>
                        <Frame boxShadow="in" style={{ padding: 0, width: '100%' }}>
                          <select
                            value={formData.shiftInitialType}
                            onChange={(e) => handleInputChange('shiftInitialType', e.target.value as any)}
                            style={{
                              width: '100%',
                              border: 'none',
                              outline: 'none',
                              backgroundColor: '#ffffff',
                              fontFamily: 'inherit',
                              fontSize: '0.75rem',
                              padding: '2px 4px',
                            }}
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
                        </Frame>
                      </div>
                    </div>
                  </div>
                )}
              </Frame>

              <Frame boxShadow="in" style={{ padding: 6 }}>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 4 }}>YASAL DÜZENLEMELER</div>
                <Checkbox
                  checked={formData.deductBreakTime}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('deductBreakTime', e.target.checked)}
                  label="Ara Dinlenmesi (mesaiden mola düşümü)"
                />
                <p style={{ fontSize: '0.5625rem', marginTop: 6 }}>
                  4857 sayılı İş Kanunu'na göre ara dinlenmeleri fazla mesai süresinden düşülür.
                </p>
              </Frame>

              {/* ÇALIŞMA DÜZENİ — Maaş sekmesinden buraya
                  (Genel sekmesinin sonuna) taşındı; Aylık Toplam Saat ve
                  Günlük Standart alanları da birlikte taşındı. */}
              <Frame boxShadow="in" style={{ padding: 6 }}>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 4 }}>ÇALIŞMA DÜZENİ</div>

                <div style={{ fontSize: '0.5625rem', marginBottom: 4 }}>Standart Mesai Saatleri</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 4 }}>
                  <div>
                    <div style={{ fontSize: '0.5rem', marginBottom: 2, opacity: 0.7 }}>Başlangıç</div>
                    <div style={{ position: 'relative' }}>
                      <Input
                        type="time"
                        value={formData.defaultStartTime}
                        onChange={(e) => handleInputChange('defaultStartTime', e.target.value)}
                        style={{ width: '100%', paddingRight: 18 }}
                      />
                      <Clock size={11} style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', color: '#5a5a5a', pointerEvents: 'none' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.5rem', marginBottom: 2, opacity: 0.7 }}>Bitiş</div>
                    <div style={{ position: 'relative' }}>
                      <Input
                        type="time"
                        value={formData.defaultEndTime}
                        onChange={(e) => handleInputChange('defaultEndTime', e.target.value)}
                        style={{ width: '100%', paddingRight: 18 }}
                      />
                      <Clock size={11} style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', color: '#5a5a5a', pointerEvents: 'none' }} />
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: '0.5rem', marginBottom: 6, opacity: 0.8 }}>
                  ℹ Cumartesi otomatik tespiti ve aylık çalışma saati hesabı bu saatlere göre yapılır.
                </p>

                <div style={{ fontSize: '0.5625rem', marginBottom: 4, borderTop: '1px dashed #868a8e', paddingTop: 6 }}>Cumartesi Çalışma Düzeni</div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <Button
                    onClick={() => handleInputChange('isSaturdayWorkManual', false)}
                    style={{
                      flex: 1, fontSize: '0.5625rem', padding: '4px 2px',
                      backgroundColor: !formData.isSaturdayWorkManual ? '#000e7a' : undefined,
                      color: !formData.isSaturdayWorkManual ? '#ffffff' : '#1a1a1a',
                    }}
                  >
                    OTOMATİK
                  </Button>
                  <Button
                    onClick={() => { handleInputChange('isSaturdayWorkManual', true); handleInputChange('isSaturdayWork', true); }}
                    style={{
                      flex: 1, fontSize: '0.5625rem', padding: '4px 2px',
                      backgroundColor: (formData.isSaturdayWorkManual && formData.isSaturdayWork) ? '#000e7a' : undefined,
                      color: (formData.isSaturdayWorkManual && formData.isSaturdayWork) ? '#ffffff' : '#1a1a1a',
                    }}
                  >
                    ÇALIŞILIYOR
                  </Button>
                  <Button
                    onClick={() => { handleInputChange('isSaturdayWorkManual', true); handleInputChange('isSaturdayWork', false); }}
                    style={{
                      flex: 1, fontSize: '0.5625rem', padding: '4px 2px',
                      backgroundColor: (formData.isSaturdayWorkManual && !formData.isSaturdayWork) ? '#000e7a' : undefined,
                      color: (formData.isSaturdayWorkManual && !formData.isSaturdayWork) ? '#ffffff' : '#1a1a1a',
                    }}
                  >
                    TATİL
                  </Button>
                </div>
                <p style={{ fontSize: '0.5625rem', marginBottom: 6 }}>
                  ℹ {!formData.isSaturdayWorkManual
                    ? "Sistem çalışma saatinize göre otomatik belirler."
                    : formData.isSaturdayWork
                      ? "Cumartesi her zaman iş günü sayılır."
                      : "Cumartesi her zaman tatil sayılır."}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, borderTop: '1px dashed #868a8e', paddingTop: 6 }}>
                  <div>
                    <div style={{ fontSize: '0.5625rem', marginBottom: 2 }}>Aylık Toplam Saat</div>
                    <div style={{ position: 'relative' }}>
                      <Input type="text" inputMode="decimal" value={formData.monthlyWorkingHours} onChange={(e) => handleInputChange('monthlyWorkingHours', e.target.value)} style={{ width: '100%', paddingRight: 18 }} />
                      <Clock size={11} style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', color: '#5a5a5a', pointerEvents: 'none' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.5625rem', marginBottom: 2 }}>Günlük Standart</div>
                    <div style={{ position: 'relative' }}>
                      <Input type="text" inputMode="decimal" value={formData.dailyWorkingHours} onChange={(e) => handleInputChange('dailyWorkingHours', e.target.value)} style={{ width: '100%', paddingRight: 18 }} />
                      <Clock size={11} style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', color: '#5a5a5a', pointerEvents: 'none' }} />
                    </div>
                  </div>
                </div>
              </Frame>
            </div>
          </Tab>

          {/* ─── MAAŞ ──────────────────────────────────────────────────── */}
          <Tab title="Maaş">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 6 }}>
              <Frame boxShadow="in" style={{ padding: 6 }}>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 4 }}>GELİR BİLGİLERİ</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: '0.5625rem', marginBottom: 2 }}>Aylık Net Maaş</div>
                    <div style={{ position: 'relative' }}>
                      <Input type="text" inputMode="decimal" value={formData.monthlyGrossSalary} onChange={(e) => handleInputChange('monthlyGrossSalary', e.target.value)} style={{ width: '100%', paddingRight: 16 }} />
                      <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: '0.5625rem', fontWeight: 700, color: '#5a5a5a', pointerEvents: 'none' }}>₺</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.5625rem', marginBottom: 2 }}>Prim / İkramiye</div>
                    <div style={{ position: 'relative' }}>
                      <Input type="text" inputMode="decimal" value={formData.bonus} onChange={(e) => handleInputChange('bonus', e.target.value)} style={{ width: '100%', paddingRight: 16 }} />
                      <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: '0.5625rem', fontWeight: 700, color: '#5a5a5a', pointerEvents: 'none' }}>₺</span>
                    </div>
                  </div>
                </div>

                <Frame boxShadow="out" style={{ padding: 6, marginBottom: 6, fontSize: '0.5625rem' }}>
                  ℹ Yol/Yemek ücretleri buradan ayarlanır; tüm aylar için geçerlidir. Belirli bir günde fiyat güncellemesi için mesai ekleme ekranını kullanın.
                </Frame>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: '0.5625rem', marginBottom: 2 }}>Günlük Yemek</div>
                    <div style={{ position: 'relative' }}>
                      <Input type="text" inputMode="decimal" value={formData.dailyMealAllowance} onChange={(e) => handleInputChange('dailyMealAllowance', e.target.value)} style={{ width: '100%', paddingRight: 16 }} />
                      <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: '0.5625rem', fontWeight: 700, color: '#5a5a5a', pointerEvents: 'none' }}>₺</span>
                    </div>
                  </div>
                  <Frame boxShadow="in" style={{ padding: 4, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '0.5rem', fontWeight: 700 }}>TOPLAM YOL</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                      ₺{(Number(formData.departureTravelAllowance || 0) + Number(formData.returnTravelAllowance || 0)).toFixed(2)}
                    </div>
                  </Frame>
                </div>

                <Checkbox
                  checked={formData.showMealInExport}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('showMealInExport', e.target.checked)}
                  label="Çıktıda Göster (yol/yemek detayını rapora ekle)"
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 6 }}>
                  <div>
                    <div style={{ fontSize: '0.5rem', marginBottom: 2 }}>↗ Gidiş Ücreti</div>
                    <div style={{ position: 'relative' }}>
                      <Input type="text" inputMode="decimal" value={formData.departureTravelAllowance} onChange={(e) => handleInputChange('departureTravelAllowance', e.target.value)} style={{ width: '100%', paddingRight: 16 }} />
                      <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: '0.5625rem', fontWeight: 700, color: '#5a5a5a', pointerEvents: 'none' }}>₺</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.5rem', marginBottom: 2 }}>↙ Dönüş Ücreti</div>
                    <div style={{ position: 'relative' }}>
                      <Input type="text" inputMode="decimal" value={formData.returnTravelAllowance} onChange={(e) => handleInputChange('returnTravelAllowance', e.target.value)} style={{ width: '100%', paddingRight: 16 }} />
                      <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: '0.5625rem', fontWeight: 700, color: '#5a5a5a', pointerEvents: 'none' }}>₺</span>
                    </div>
                  </div>
                </div>
              </Frame>

              <Frame boxShadow="in" style={{ padding: 6 }}>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 4 }}>YASAL KESİNTİLER</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Checkbox
                    checked={formData.hasSalaryAttachment}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('hasSalaryAttachment', e.target.checked)}
                    label="Maaş Haczi"
                  />
                  {formData.hasSalaryAttachment && (
                    <div style={{ position: 'relative' }}>
                      <Input type="text" inputMode="decimal" value={formData.salaryAttachmentRate} onChange={(e) => handleInputChange('salaryAttachmentRate', e.target.value)} style={{ width: 50, paddingRight: 14 }} />
                      <span style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', fontSize: '0.5rem', fontWeight: 700, color: '#5a5a5a', pointerEvents: 'none' }}>%</span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px dashed #868a8e', paddingTop: 6 }}>
                  <Checkbox
                    checked={formData.hasTES}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('hasTES', e.target.checked)}
                    label="TES (BES) Kesintisi"
                  />
                  {formData.hasTES && (
                    <div style={{ position: 'relative' }}>
                      <Input type="text" inputMode="decimal" value={formData.tesRate} onChange={(e) => handleInputChange('tesRate', e.target.value)} style={{ width: 50, paddingRight: 14 }} />
                      <span style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', fontSize: '0.5rem', fontWeight: 700, color: '#5a5a5a', pointerEvents: 'none' }}>%</span>
                    </div>
                  )}
                </div>
              </Frame>

              <Frame boxShadow="in" style={{ padding: 6 }}>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 4 }}>MESAİ KATSAYILARI</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.5625rem' }}>Haftaiçi</span>
                    <div style={{ position: 'relative' }}>
                      <Input type="text" value={formData.weekdayMultiplier} onChange={(e) => handleInputChange('weekdayMultiplier', e.target.value)} style={{ width: 50, paddingRight: 14 }} />
                      <span style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', fontSize: '0.5rem', fontWeight: 700, color: '#5a5a5a', pointerEvents: 'none' }}>x</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.5625rem' }}>Cumartesi</span>
                    <div style={{ position: 'relative' }}>
                      <Input type="text" value={formData.saturdayMultiplier} onChange={(e) => handleInputChange('saturdayMultiplier', e.target.value)} style={{ width: 50, paddingRight: 14 }} />
                      <span style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', fontSize: '0.5rem', fontWeight: 700, color: '#5a5a5a', pointerEvents: 'none' }}>x</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.5625rem' }}>Pazar</span>
                    <div style={{ position: 'relative' }}>
                      <Input type="text" value={formData.sundayMultiplier} onChange={(e) => handleInputChange('sundayMultiplier', e.target.value)} style={{ width: 50, paddingRight: 14 }} />
                      <span style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', fontSize: '0.5rem', fontWeight: 700, color: '#5a5a5a', pointerEvents: 'none' }}>x</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.5625rem' }}>Bayram</span>
                    <div style={{ position: 'relative' }}>
                      <Input type="text" value={formData.holidayMultiplier} onChange={(e) => handleInputChange('holidayMultiplier', e.target.value)} style={{ width: 50, paddingRight: 14 }} />
                      <span style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', fontSize: '0.5rem', fontWeight: 700, color: '#5a5a5a', pointerEvents: 'none' }}>x</span>
                    </div>
                  </div>
                </div>
              </Frame>
            </div>
          </Tab>

          {/* ─── VERGİ ─────────────────────────────────────────────────── */}
          <Tab title="Vergi">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 6 }}>
              <Frame boxShadow="in" style={{ padding: 6 }}>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 4 }}>BRÜT / NET MAAŞ HESAPLAYICI</div>
                <p style={{ fontSize: '0.5rem', marginBottom: 6, opacity: 0.75 }}>
                  Brüt maaşınızı girin; gelir vergisi dilimi otomatik tespit edilir.
                </p>

                <details open style={{ marginBottom: 6 }}>
                  <summary style={{ fontSize: '0.5625rem', fontWeight: 700, cursor: 'pointer' }}>Vergi Dilimleri / Asgari Ücret (Değiştir)</summary>
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: '0.5625rem', marginBottom: 2 }}>Asgari Ücret (Brüt)</div>
                    <div style={{ position: 'relative', marginBottom: 6 }}>
                      <Input type="text" inputMode="decimal" value={formData.minimumWageGross} onChange={(e) => handleInputChange('minimumWageGross', e.target.value)} style={{ width: '100%', paddingRight: 16 }} />
                      <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: '0.5625rem', fontWeight: 700, color: '#5a5a5a', pointerEvents: 'none' }}>₺</span>
                    </div>

                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 4 }}>
                        <div>
                          <div style={{ fontSize: '0.5rem', marginBottom: 2, opacity: 0.7 }}>{n}. Dilim Üst Sınırı</div>
                          <div style={{ position: 'relative' }}>
                            <Input type="text" inputMode="decimal" value={(formData as any)[`taxBracket${n}Limit`]} onChange={(e) => handleInputChange(`taxBracket${n}Limit` as any, e.target.value)} style={{ width: '100%', paddingRight: 16 }} />
                            <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: '0.5rem', fontWeight: 700, color: '#5a5a5a', pointerEvents: 'none' }}>₺</span>
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.5rem', marginBottom: 2, opacity: 0.7 }}>{n}. Dilim Oranı</div>
                          <div style={{ position: 'relative' }}>
                            <Input type="text" inputMode="decimal" value={(formData as any)[`taxBracket${n}Rate`]} onChange={(e) => handleInputChange(`taxBracket${n}Rate` as any, e.target.value)} style={{ width: '100%', paddingRight: 14 }} />
                            <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: '0.5rem', fontWeight: 700, color: '#5a5a5a', pointerEvents: 'none' }}>%</span>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: '0.5rem', marginBottom: 2, opacity: 0.7 }}>5. Dilim Oranı (Sınırsız)</div>
                      <div style={{ position: 'relative', width: '50%' }}>
                        <Input type="text" inputMode="decimal" value={formData.taxBracket5Rate} onChange={(e) => handleInputChange('taxBracket5Rate', e.target.value)} style={{ width: '100%', paddingRight: 14 }} />
                        <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: '0.5rem', fontWeight: 700, color: '#5a5a5a', pointerEvents: 'none' }}>%</span>
                      </div>
                    </div>

                    <Button onClick={resetTaxSettingsToDefault} style={{ width: '100%', fontSize: '0.5rem', padding: '3px 2px' }}>
                      VARSAYILANLARA SIFIRLA
                    </Button>
                  </div>
                </details>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: '0.5625rem', marginBottom: 2 }}>Brüt Maaş</div>
                    <div style={{ position: 'relative' }}>
                      <Input type="text" inputMode="decimal" placeholder="0" value={taxCalcGross} onChange={(e) => setTaxCalcGross(e.target.value)} style={{ width: '100%', paddingRight: 16 }} />
                      <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: '0.5625rem', fontWeight: 700, color: '#5a5a5a', pointerEvents: 'none' }}>₺</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.5625rem', marginBottom: 2 }}>Yıl İçi Matrah (opsiyonel)</div>
                    <div style={{ position: 'relative' }}>
                      <Input type="text" inputMode="decimal" placeholder="0" value={taxCalcCumulativeBase} onChange={(e) => setTaxCalcCumulativeBase(e.target.value)} style={{ width: '100%', paddingRight: 16 }} />
                      <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: '0.5625rem', fontWeight: 700, color: '#5a5a5a', pointerEvents: 'none' }}>₺</span>
                    </div>
                  </div>
                </div>

                {taxCalcResult && (
                  <Frame boxShadow="out" style={{ padding: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.5625rem' }}>Gelir Vergisi Dilimi</span>
                      <span style={{ fontSize: '0.625rem', fontWeight: 700 }}>%{(taxCalcResult.bracketRate * 100).toFixed(0)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.5625rem' }}>SGK + İşsizlik</span>
                      <span style={{ fontSize: '0.625rem' }}>-₺{taxCalcResult.sgkAndUnemployment.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.5625rem' }}>Gelir Vergisi (istisna sonrası)</span>
                      <span style={{ fontSize: '0.625rem' }}>-₺{taxCalcResult.netIncomeTax.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, borderBottom: '1px dashed #868a8e', paddingBottom: 6 }}>
                      <span style={{ fontSize: '0.5625rem' }}>Damga Vergisi (istisna sonrası)</span>
                      <span style={{ fontSize: '0.625rem' }}>-₺{taxCalcResult.netStampTax.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.625rem', fontWeight: 700 }}>NET MAAŞ</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>₺{taxCalcResult.netSalary.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <Button onClick={applyTaxCalcResultToSalary} style={{ width: '100%', fontSize: '0.5625rem', padding: '4px 2px' }}>
                      AYLIK NET MAAŞ ALANINA UYGULA
                    </Button>
                  </Frame>
                )}
              </Frame>
            </div>
          </Tab>

          {/* ─── KIDEM ─────────────────────────────────────────────────── */}
          <Tab title="Kıdem">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 6 }}>
              <Frame boxShadow="in" style={{ padding: 6 }}>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 4 }}>HESAPLAMA PARAMETRELERİ</div>
                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: '0.5625rem', marginBottom: 2 }}>İşe Giriş Tarihi</div>
                  <div style={{ position: 'relative' }}>
                    <Input type="date" value={formData.employmentStartDate || ''} onChange={(e) => handleInputChange('employmentStartDate', e.target.value)} style={{ width: '100%', paddingRight: 18 }} />
                    <Calendar size={11} style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', color: '#5a5a5a', pointerEvents: 'none' }} />
                  </div>
                </div>
                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: '0.5625rem', marginBottom: 2 }}>Esas Brüt Maaş</div>
                  <div style={{ position: 'relative' }}>
                    <Input type="text" inputMode="decimal" value={formData.severanceBaseGross} onChange={(e) => handleInputChange('severanceBaseGross', e.target.value)} style={{ width: '100%', paddingRight: 16 }} />
                    <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: '0.5625rem', fontWeight: 700, color: '#5a5a5a', pointerEvents: 'none' }}>₺</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div>
                    <div style={{ fontSize: '0.5625rem', marginBottom: 2 }}>Yasal Tavan</div>
                    <div style={{ position: 'relative' }}>
                      <Input type="text" value={formData.severanceCeiling} onChange={(e) => handleInputChange('severanceCeiling', e.target.value)} style={{ width: '100%', paddingRight: 16 }} />
                      <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: '0.5625rem', fontWeight: 700, color: '#5a5a5a', pointerEvents: 'none' }}>₺</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.5625rem', marginBottom: 2 }}>Damga Vergisi</div>
                    <div style={{ position: 'relative' }}>
                      <Input type="text" value={formData.severanceStampTaxRate} onChange={(e) => handleInputChange('severanceStampTaxRate', e.target.value)} style={{ width: '100%', paddingRight: 16 }} />
                      <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: '0.5625rem', fontWeight: 700, color: '#5a5a5a', pointerEvents: 'none' }}>%</span>
                    </div>
                  </div>
                </div>
              </Frame>

              {severancePreview && severancePreview.eligible ? (
                <Frame boxShadow="out" style={{ padding: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: '0.5625rem', fontWeight: 700 }}>NET TAZMİNAT ({severancePreview.years} YIL)</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>₺{severancePreview.netSeverance.toLocaleString('tr-TR')}</span>
                  </div>
                  {(severancePreview.months > 0 || severancePreview.days > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.5625rem' }}>
                      <span>+{severancePreview.months > 0 ? `${severancePreview.months} AY ` : ''}{severancePreview.days > 0 ? `${severancePreview.days} GÜN ` : ''}EKSTRA</span>
                      <span style={{ fontWeight: 700 }}>₺{(severancePreview.monthNetSeverance + severancePreview.dayNetSeverance).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                  )}
                  <Checkbox
                    checked={formData.showSeverancePay}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('showSeverancePay', e.target.checked)}
                    label="Ana ekranda göster (Kıdem + İhbar)"
                  />
                </Frame>
              ) : severancePreview && !severancePreview.eligible ? (
                <Frame boxShadow="in" style={{ padding: 12, textAlign: 'center' }}>
                  <p style={{ fontSize: '0.625rem' }}>
                    ℹ 1 yıllık çalışma süresi dolmadığı için tazminat hakkı henüz oluşmamıştır.
                  </p>
                </Frame>
              ) : null}

              <Frame boxShadow="in" style={{ padding: '6px 6px 3px 6px' }}>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 4 }}>İHBAR (BİLDİRİM) TAZMİNATI</div>
                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: '0.5625rem', marginBottom: 2 }}>Yıl İçi Matrah (opsiyonel)</div>
                  <div style={{ position: 'relative' }}>
                    <Input type="text" inputMode="decimal" placeholder="0" value={formData.noticePayCumulativeBase} onChange={(e) => handleInputChange('noticePayCumulativeBase', e.target.value)} style={{ width: '100%', paddingRight: 16 }} />
                    <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: '0.5625rem', fontWeight: 700, color: '#5a5a5a', pointerEvents: 'none' }}>₺</span>
                  </div>
                </div>

                {noticePayPreview ? (
                  <Frame boxShadow="out" style={{ padding: '6px 8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: '0.5625rem' }}>Bildirim Süresi</span>
                      <span style={{ fontSize: '0.625rem', fontWeight: 700 }}>{noticePayPreview.noticeWeeks} hafta ({noticePayPreview.noticeDays} gün)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: '0.5625rem' }}>Brüt İhbar Tazminatı</span>
                      <span style={{ fontSize: '0.625rem' }}>₺{noticePayPreview.grossNoticePay.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: '0.5625rem' }}>Gelir Vergisi</span>
                      <span style={{ fontSize: '0.625rem' }}>-₺{noticePayPreview.incomeTax.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, borderBottom: '1px dashed #868a8e', paddingBottom: 4 }}>
                      <span style={{ fontSize: '0.5625rem' }}>Damga Vergisi</span>
                      <span style={{ fontSize: '0.625rem' }}>-₺{noticePayPreview.stampTax.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.625rem', fontWeight: 700 }}>NET İHBAR TAZMİNATI</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>₺{noticePayPreview.netNoticePay.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </Frame>
                ) : (
                  <Frame boxShadow="in" style={{ padding: 12, textAlign: 'center' }}>
                    <p style={{ fontSize: '0.625rem' }}>
                      ℹ Hesaplama için işe giriş tarihi ve esas brüt maaşı girin.
                    </p>
                  </Frame>
                )}
              </Frame>

              {annualLeavePreview ? (
                <Frame boxShadow="in" style={{ padding: '3px 6px 6px 6px', marginTop: -3 }}>
                  <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 4 }}>YILLIK İZİN</div>
                  <p style={{ fontSize: '0.5rem', marginBottom: 4, opacity: 0.75 }}>
                    İzin dönemi: {annualLeavePreview.periodStartLabel} – {annualLeavePreview.periodEndLabel} ({annualLeavePreview.yearsOfService} yıl kıdem)
                  </p>
                  <Frame
                    boxShadow="out"
                    style={{
                      padding: '5px 8px',
                      marginBottom: 6,
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-around',
                    }}
                  >
                    <span style={{ fontSize: '0.5625rem' }}>
                      <span style={{ opacity: 0.7 }}>HAK EDİLEN </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{annualLeavePreview.entitledDays} gün</span>
                    </span>
                    <span style={{ fontSize: '0.5625rem' }}>
                      <span style={{ opacity: 0.7 }}>KALAN </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: annualLeavePreview.remainingDays < 0 ? '#aa0000' : undefined,
                        }}
                      >
                        {annualLeavePreview.remainingDays} gün
                      </span>
                    </span>
                  </Frame>
                  <div style={{ fontSize: '0.5625rem', marginBottom: 2 }}>Kullanılan İzin (Bu Dönem)</div>
                  <div style={{ position: 'relative' }}>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={formData.usedAnnualLeaveDays}
                      onChange={(e) => handleInputChange('usedAnnualLeaveDays', e.target.value)}
                      style={{ width: '100%', paddingRight: 24 }}
                    />
                    <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: '0.5625rem', fontWeight: 700, color: '#5a5a5a', pointerEvents: 'none' }}>gün</span>
                  </div>
                </Frame>
              ) : (
                <Frame boxShadow="in" style={{ padding: 12, textAlign: 'center' }}>
                  <p style={{ fontSize: '0.625rem' }}>
                    ℹ Yıllık izin hesaplaması için işe giriş tarihini girin.
                  </p>
                </Frame>
              )}
            </div>
          </Tab>

          {/* ─── SİSTEM ────────────────────────────────────────────────── */}
          <Tab title="Sistem">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 6 }}>
              <Frame boxShadow="in" style={{ padding: 6 }}>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 4 }}>GÖRÜNÜM VE KULLANIM</div>
                <Win95ThemeSwitcher />
                <p style={{ fontSize: '0.5rem', marginTop: 6, opacity: 0.7 }}>
                  Win95 görünümünü kapatmak için Başlat menüsündeki "Görünüm" seçeneğini kullanın.
                </p>
              </Frame>

              <Frame boxShadow="in" style={{ padding: 6 }}>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 4 }}>SÜRÜM VE GÜNCELLEME</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700 }}>Uygulama Sürümü</div>
                    <div style={{ fontSize: '0.5625rem' }}>v{APP_VERSION}</div>
                  </div>
                  {!isWeb && (
                    <Button onClick={checkUpdates} disabled={updateStatus.loading} style={{ fontSize: '0.5625rem', padding: '4px 8px' }}>
                      {updateStatus.loading ? 'KONTROL EDİLİYOR...' : 'GÜNCELLEMELERİ DENETLE'}
                    </Button>
                  )}
                </div>

                {updateStatus.error && (
                  <Frame boxShadow="out" style={{ padding: 6, fontSize: '0.5625rem' }}>
                    ⚠ {updateStatus.error}
                  </Frame>
                )}

                {updateStatus.version && (
                  <Frame boxShadow="out" style={{ padding: 6, fontSize: '0.5625rem' }}>
                    {updateStatus.isNew
                      ? `✓ Yeni bir sürüm mevcut (v${updateStatus.version})! Lütfen güncelleyin.`
                      : '✓ Uygulamanız güncel durumda.'}
                  </Frame>
                )}
              </Frame>
            </div>
          </Tab>
        </Tabs>
      </div>
    </Modal>
  );
};

/**
 * Win95ThemeSwitcher — Win95 modundaki "Görünüm ve Kullanım" kontrolleri.
 * NOT: Win95 Koyu varyantı kaldırıldı (bkz. win95-overrides.css) — Win95
 * modu artık her zaman klasik/açık renklerle görünür, tema değiştirilemez.
 * Burada yalnızca yazı tipi (Klasik/Okunaklı) ve yazı boyutu ayarları var.
 *
 * YAZI BOYUTU: eskiden 4 ayrı buton (KÜÇÜK/NORMAL/BÜYÜK/ÇOK BÜYÜK) grid'iydi.
 * Bunun yerine react95'in gerçek Win95 Kontrol Paneli'ndeki (örn. "Fare Hızı",
 * "Çift Tıklama Hızı") sürgülerle BİREBİR AYNI görünen `Range` bileşenini
 * kullanıyoruz — solda küçük "A", sağda büyük "A" ile klasik yazı tipi
 * boyutu sürgüsü hissi, üstte de seçili değerin adı (örn. "BÜYÜK") canlı
 * etiket olarak gösteriliyor.
 */
const Win95ThemeSwitcher: React.FC = () => {
  const { win95Font, setWin95Font, fontScale, setFontScale } = useTheme();

  const FONT_SCALE_ORDER: FontScale[] = ['small', 'medium', 'large', 'xlarge'];
  const FONT_SCALE_LABELS: Record<FontScale, string> = {
    small: 'KÜÇÜK',
    medium: 'NORMAL',
    large: 'BÜYÜK',
    xlarge: 'ÇOK BÜYÜK',
  };
  const fontScaleIndex = FONT_SCALE_ORDER.indexOf(fontScale);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: '0.5rem', fontWeight: 700, opacity: 0.8 }}>YAZI TİPİ</div>
      <div style={{ display: 'flex', gap: 4 }}>
        <Button
          onClick={() => setWin95Font('pixel')}
          style={{
            flex: 1, fontSize: '0.5625rem', padding: '6px 4px',
            backgroundColor: win95Font === 'pixel' ? '#000e7a' : undefined,
            color: win95Font === 'pixel' ? '#ffffff' : '#1a1a1a',
          }}
        >
          KLASİK
        </Button>
        <Button
          onClick={() => setWin95Font('system')}
          style={{
            flex: 1, fontSize: '0.5625rem', padding: '6px 4px',
            backgroundColor: win95Font === 'system' ? '#000e7a' : undefined,
            color: win95Font === 'system' ? '#ffffff' : '#1a1a1a',
          }}
        >
          OKUNAKLI
        </Button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
        <span style={{ fontSize: '0.5rem', fontWeight: 700, opacity: 0.8 }}>YAZI BOYUTU</span>
        <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: '#000e7a' }}>{FONT_SCALE_LABELS[fontScale]}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '0.5rem', fontWeight: 700, flexShrink: 0 }} aria-hidden="true">A</span>
        <Range
          min={0}
          max={3}
          step={1}
          value={fontScaleIndex}
          onChange={(e) => setFontScale(FONT_SCALE_ORDER[Number(e.target.value)])}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: '1rem', fontWeight: 700, flexShrink: 0 }} aria-hidden="true">A</span>
      </div>
    </div>
  );
};
