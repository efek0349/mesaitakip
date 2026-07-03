import React, { useEffect } from 'react';
import { Modal, TitleBar, Tabs, Tab, Frame, Button, TextArea, Input } from '@react95/core';
import { googleDriveService, DriveFile } from '../../utils/googleDriveService';
import { useDataBackupLogic, BackupTab } from '../../hooks/useDataBackupLogic';
import { useModalCenterPosition } from '../../hooks/useModalCenterPosition';
import { showToast } from '../../utils/toastUtils';

interface DataBackupModalWin95Props {
  isOpen: boolean;
  onClose: () => void;
  currentDate?: Date;
}

const TAB_LABELS: Record<BackupTab, string> = {
  cloud: 'Bulut',
  backup: 'Yedek',
  file: 'Dosya',
  tools: 'Araçlar',
  holidays: 'Tatiller',
};

const TAB_BY_LABEL: Record<string, BackupTab> = {
  'Bulut': 'cloud',
  'Yedek': 'backup',
  'Dosya': 'file',
  'Araçlar': 'tools',
  'Tatiller': 'holidays',
};

/**
 * DataBackupModalWin95 — Veri Yönetimi modalının Win95 görünümü.
 * En büyük dosya (orijinali 1391 satır) — Win95'in kompakt diline
 * uyarlanırken aynı sekme yapısı korundu, ama renkli gradient kartlar
 * yerine Frame panelleri kullanıldı.
 */
export const DataBackupModalWin95: React.FC<DataBackupModalWin95Props> = ({ isOpen, onClose, currentDate }) => {
  const {
    activeTab, setActiveTab,
    message, loading,
    googleUser, setGoogleUser,
    backups,
    showPasteArea, setShowPasteArea,
    pasteText, setPasteText,
    showVerifyArea, setShowVerifyArea,
    verifyText, setVerifyText,
    verifyResult,
    settings, updateSettings,
    handleVerifyLog,
    handleGoogleSignIn,
    handleGoogleBackup,
    handleRestore,
    handleDelete,
    handleClear,
    handleShareAsTxt,
    handleExportCsv,
    handleImportFromText,
    handleImportFromFile,
    folderBackupSupported,
    backupFolderName,
    folderBackups,
    folderBackupsRefreshing,
    handlePickBackupFolder,
    handleRemoveBackupFolder,
    handleBackupToFolder,
    handleRestoreFromFolder,
    handleDeleteFolderBackupFile,
    diniLoading, diniError, diniLastUpdated, refreshDini,
    resmiLoading, resmiError, resmiLastUpdated, refreshResmi,
    customHolidays,
    newHolidayDate, setNewHolidayDate,
    newHolidayName, setNewHolidayName,
    newHolidayShortName, setNewHolidayShortName,
    newHolidayType, setNewHolidayType,
    newHolidayHalfDay, setNewHolidayHalfDay,
    newHolidayRecurring, setNewHolidayRecurring,
    editingHolidayDate,
    handleAddCustomHoliday,
    handleStartEditCustomHoliday,
    handleCancelEditCustomHoliday,
    handleRemoveCustomHoliday,
    formatTurkishDate,
    parseDate,
  } = useDataBackupLogic(isOpen, currentDate);

  const handleSignOut = () => {
    googleDriveService.signOut().then(() => setGoogleUser(null));
  };

  const position = useModalCenterPosition(340);

  // Sorun: "Yedek" sekmesi uzun (klasör seçici + oto
  // yedekleme + yedek listesi), kullanıcı aşağı kaydırmış haldeyken bir
  // hata/başarı mesajı geldiğinde mesaj modalın en üstünde render oluyordu
  // ama görünüm alanının dışında kalıyordu ("hiç uyarı gelmiyormuş" gibi
  // görünüyordu), ve modal içine gömülü bir kutu olduğu için zaten gerçek
  // bir "açılır pencere" gibi de hissettirmiyordu.
  // (ToastWin95, App.tsx'te global mount edilmiş,
  // kendi TitleBar + kapatma düğmesi olan gerçek bir Frame penceresi)
  // gönderiyoruz. Modal içindeki eski sabit mesaj kutusu tamamen kaldırıldı.
  useEffect(() => {
    if (message) {
      showToast(message.text, message.type, message.type === 'error' ? 5000 : 3000);
    }
  }, [message]);

  if (!isOpen) return null;

  return (
    <Modal
      id="databackup-modal"
      title="Veri Yönetimi"
      titleBarOptions={[
        <Modal.Minimize key="minimize" />,
        <TitleBar.Close key="close" onClick={onClose} />,
      ]}
      buttons={[{ value: 'Kapat', onClick: onClose }]}
      dragOptions={{ defaultPosition: position }}
      style={{ width: 340 }}
    >
      <div style={{ padding: 4, maxHeight: position.maxHeight, overflowY: 'auto' }}>
        <Tabs
          defaultActiveTab={TAB_LABELS[activeTab]}
          onChange={((label: string) => setActiveTab(TAB_BY_LABEL[label] ?? 'cloud')) as any}
        >
          {/* ─── BULUT ─────────────────────────────────────────────────── */}
          <Tab title="Bulut">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 6 }}>
              <Frame boxShadow="in" style={{ padding: 8 }}>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 6 }}>GOOGLE DRIVE HESABI</div>

                {googleUser ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.5rem', opacity: 0.7 }}>Bağlı Hesap</div>
                        <div style={{ fontSize: '0.625rem', fontWeight: 700 }}>{googleUser.email}</div>
                      </div>
                      <Button onClick={handleSignOut} style={{ fontSize: '0.5625rem', padding: '3px 6px' }}>
                        ⏻ ÇIKIŞ
                      </Button>
                    </div>

                    <Button onClick={handleGoogleBackup} disabled={loading} style={{ width: '100%', fontSize: '0.625rem', padding: '8px 0' }}>
                      {loading ? '...' : '☁ ŞİMDİ BULUTA YEDEKLE'}
                    </Button>

                    <div style={{ fontSize: '0.5625rem', fontWeight: 700, marginTop: 4 }}>BULUTTAKİ YEDEKLER</div>
                    {backups.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 200, overflowY: 'auto' }}>
                        {backups.map((file: DriveFile) => (
                          <Frame key={file.id} boxShadow="in" style={{ padding: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: '0.5625rem', fontWeight: 700 }}>{new Date(file.createdTime).toLocaleDateString('tr-TR')}</div>
                              <div style={{ fontSize: '0.5rem' }}>{new Date(file.createdTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <Button onClick={() => handleRestore(file)} style={{ fontSize: '0.5rem', padding: '2px 5px' }}>↓</Button>
                              <Button onClick={() => handleDelete(file)} style={{ fontSize: '0.5rem', padding: '2px 5px' }}>✕</Button>
                            </div>
                          </Frame>
                        ))}
                      </div>
                    ) : (
                      <Frame boxShadow="in" style={{ padding: 12, textAlign: 'center', fontSize: '0.625rem' }}>
                        Yedek Bulunmuyor
                      </Frame>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 8 }}>
                    <p style={{ fontSize: '0.625rem', marginBottom: 10 }}>
                      Bulut yedeklerini yönetmek için Google Drive hesabınızla bağlanmanız gerekmektedir.
                    </p>
                    <Button onClick={handleGoogleSignIn} style={{ width: '100%', fontSize: '0.625rem', padding: '6px 0' }}>
                      GOOGLE İLE BAĞLAN
                    </Button>
                  </div>
                )}
              </Frame>
            </div>
          </Tab>

          {/* ─── YEDEK ─────────────────────────────────────────────────── */}
          <Tab title="Yedek">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 6 }}>
              {!folderBackupSupported ? (
                <Frame boxShadow="in" style={{ padding: 8, fontSize: '0.5625rem' }}>
                  ⚠ Bu özellik bu ortamda desteklenmiyor. Mobil uygulamada veya masaüstü Chrome/Edge tarayıcısında kullanılabilir.
                </Frame>
              ) : (
                <>
                  <Frame boxShadow="in" style={{ padding: 8 }}>
                    <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 6 }}>YEDEKLEME KLASÖRÜ</div>
                    <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 2 }}>
                      {backupFolderName || 'Klasör Seçilmedi'}
                    </div>
                    <div style={{ fontSize: '0.5rem', opacity: 0.7, marginBottom: 6 }}>
                      {backupFolderName ? 'Yedekleme klasörü' : 'İnternet/Google hesabı gerektirmez'}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <Button onClick={handlePickBackupFolder} style={{ flex: 1, fontSize: '0.5625rem', padding: '5px 0' }}>
                        {backupFolderName ? 'DEĞİŞTİR' : 'KLASÖR SEÇ'}
                      </Button>
                      {backupFolderName && (
                        <Button onClick={handleRemoveBackupFolder} style={{ fontSize: '0.5625rem', padding: '5px 8px' }}>
                          ✕
                        </Button>
                      )}
                    </div>
                  </Frame>

                  <Frame boxShadow="in" style={{ padding: 8 }}>
                    <Button onClick={handleBackupToFolder} disabled={loading || !backupFolderName} style={{ width: '100%', fontSize: '0.625rem', padding: '8px 0' }}>
                      {loading ? 'YEDEKLENİYOR...' : '📁 ŞİMDİ BURAYA YEDEKLE'}
                    </Button>
                  </Frame>

                  <Frame boxShadow="in" style={{ padding: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontSize: '0.625rem', fontWeight: 700 }}>OTO YEDEKLEME</div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.5625rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={!!settings.autoBackupEnabled}
                          onChange={(e) => updateSettings({ ...settings, autoBackupEnabled: e.target.checked })}
                        />
                        AÇIK
                      </label>
                    </div>
                    <div style={{ fontSize: '0.5rem', opacity: 0.7, marginBottom: settings.autoBackupEnabled ? 6 : 0 }}>
                      Seçili klasöre otomatik yedekler
                    </div>

                    {settings.autoBackupEnabled && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        {(['daily', 'weekly', 'monthly'] as const).map((period) => (
                          <Button
                            key={period}
                            onClick={() => updateSettings({ ...settings, autoBackupPeriod: period })}
                            style={{
                              flex: 1, fontSize: '0.5rem', padding: '4px 2px',
                              backgroundColor: (settings.autoBackupPeriod === period || (!settings.autoBackupPeriod && period === 'weekly')) ? '#000e7a' : undefined,
                              color: (settings.autoBackupPeriod === period || (!settings.autoBackupPeriod && period === 'weekly')) ? '#ffffff' : '#1a1a1a',
                            }}
                          >
                            {period === 'daily' ? 'GÜNLÜK' : period === 'weekly' ? 'HAFTALIK' : 'AYLIK'}
                          </Button>
                        ))}
                      </div>
                    )}

                    {!backupFolderName && settings.autoBackupEnabled && (
                      <div style={{ fontSize: '0.5rem', marginTop: 6, color: '#b91c1c', fontWeight: 700 }}>
                        ⚠ Önce bir yedekleme klasörü seçmelisiniz!
                      </div>
                    )}
                  </Frame>

                  {backupFolderName && (
                    <Frame boxShadow="in" style={{ padding: 8 }}>
                      <div style={{ fontSize: '0.5625rem', fontWeight: 700, marginBottom: 4 }}>KLASÖRDEKİ YEDEKLER</div>
                      {folderBackups.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 160, overflowY: 'auto' }}>
                          {folderBackups.map(file => (
                            <Frame key={file.name} boxShadow="in" style={{ padding: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: '0.5625rem', fontWeight: 700 }}>{file.date.toLocaleDateString('tr-TR')}</div>
                                <div style={{ fontSize: '0.5rem' }}>{file.date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                              </div>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <Button onClick={() => handleRestoreFromFolder(file.name)} style={{ fontSize: '0.5rem', padding: '2px 5px' }}>↓</Button>
                                <Button onClick={() => handleDeleteFolderBackupFile(file.name)} style={{ fontSize: '0.5rem', padding: '2px 5px' }}>✕</Button>
                              </div>
                            </Frame>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.5625rem', textAlign: 'center', padding: 8 }}>
                          {folderBackupsRefreshing ? 'Yükleniyor...' : 'Yedek Bulunmuyor'}
                        </div>
                      )}
                    </Frame>
                  )}

                  <Frame boxShadow="out" style={{ padding: 6, fontSize: '0.5625rem' }}>
                    ℹ Otomatik yedekleme artık Google Drive yerine seçtiğiniz yerel klasöre yazar. Google Drive'a manuel yedeklemek için "Bulut" sekmesini kullanabilirsiniz.
                  </Frame>
                </>
              )}
            </div>
          </Tab>

          {/* ─── DOSYA ─────────────────────────────────────────────────── */}
          <Tab title="Dosya">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 6 }}>
              <Frame boxShadow="in" style={{ padding: 8 }}>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 6 }}>DIŞA AKTAR</div>
                <Button onClick={handleExportCsv} style={{ width: '100%', fontSize: '0.625rem', padding: '8px 0', marginBottom: 6 }}>
                  ↓ AYLIK RAPOR İNDİR (.CSV)
                </Button>
                <Button onClick={handleShareAsTxt} style={{ width: '100%', fontSize: '0.625rem', padding: '8px 0' }}>
                  ↗ METİN OLARAK PAYLAŞ (.TXT)
                </Button>
              </Frame>

              <Frame boxShadow="in" style={{ padding: 8 }}>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 6 }}>İÇE AKTAR</div>
                <Button onClick={handleImportFromFile} style={{ width: '100%', fontSize: '0.625rem', padding: '8px 0', marginBottom: 6 }}>
                  ↑ DOSYADAN YÜKLE
                </Button>
                <Button
                  onClick={() => setShowPasteArea(!showPasteArea)}
                  style={{
                    width: '100%', fontSize: '0.625rem', padding: '8px 0',
                    backgroundColor: showPasteArea ? '#000e7a' : undefined,
                    color: showPasteArea ? '#ffffff' : '#1a1a1a',
                  }}
                >
                  ↑ METİN YAPIŞTIR
                </Button>

                {showPasteArea && (
                  <div style={{ marginTop: 6 }}>
                    <TextArea
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder="Yedek metnini buraya yapıştırın..."
                      rows={5}
                      style={{ width: '100%', resize: 'none' }}
                    />
                    <Button onClick={handleImportFromText} style={{ width: '100%', fontSize: '0.625rem', padding: '6px 0', marginTop: 4 }}>
                      YÜKLE
                    </Button>
                  </div>
                )}
              </Frame>
            </div>
          </Tab>

          {/* ─── ARAÇLAR ───────────────────────────────────────────────── */}
          <Tab title="Araçlar">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 6 }}>
              <Frame boxShadow="in" style={{ padding: 8 }}>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 6 }}>LOG DOĞRULAMA</div>
                <p style={{ fontSize: '0.5625rem', marginBottom: 6 }}>
                  Paylaşılan bir mesai özetinin orijinal/değiştirilmemiş olduğunu HMAC imzasıyla doğrulayın.
                </p>
                <Button
                  onClick={() => setShowVerifyArea(!showVerifyArea)}
                  style={{
                    width: '100%', fontSize: '0.625rem', padding: '8px 0',
                    backgroundColor: showVerifyArea ? '#000e7a' : undefined,
                    color: showVerifyArea ? '#ffffff' : '#1a1a1a',
                  }}
                >
                  ✓ LOG DOĞRULA
                </Button>

                {showVerifyArea && (
                  <div style={{ marginTop: 6 }}>
                    <TextArea
                      value={verifyText}
                      onChange={(e) => setVerifyText(e.target.value)}
                      placeholder="Doğrulanacak log metnini buraya yapıştırın..."
                      rows={5}
                      style={{ width: '100%', resize: 'none' }}
                    />
                    <Button onClick={handleVerifyLog} style={{ width: '100%', fontSize: '0.625rem', padding: '6px 0', marginTop: 4 }}>
                      DOĞRULA
                    </Button>

                    {verifyResult && (
                      <Frame boxShadow="out" style={{ padding: 6, marginTop: 6, fontSize: '0.5625rem', fontWeight: 700 }}>
                        {verifyResult.success ? '✓ ' : '✗ '}{verifyResult.message}
                      </Frame>
                    )}
                  </div>
                )}
              </Frame>

              <Frame boxShadow="in" style={{ padding: 8 }}>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 6, color: '#b91c1c' }}>TEHLİKELİ BÖLGE</div>
                <Button onClick={handleClear} style={{ width: '100%', fontSize: '0.625rem', padding: '8px 0' }}>
                  ⚠ TÜM VERİLERİ SİL
                </Button>
              </Frame>
            </div>
          </Tab>

          {/* ─── TATİLLER ──────────────────────────────────────────────── */}
          <Tab title="Tatiller">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 6 }}>
              <Frame boxShadow="in" style={{ padding: 8 }}>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 6 }}>ONLINE GÜNCELLEME</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <div>
                    <div style={{ fontSize: '0.5625rem', fontWeight: 700, marginBottom: 2 }}>🏛 RESMİ</div>
                    <div style={{ fontSize: '0.5rem', opacity: 0.7, marginBottom: 4, minHeight: '2em' }}>
                      {resmiLastUpdated ? formatTurkishDate(resmiLastUpdated) : 'Yerleşik veri'}
                    </div>
                    {resmiError && <div style={{ fontSize: '0.4375rem', color: '#b91c1c', marginBottom: 4 }}>⚠ Hata</div>}
                    <Button onClick={() => refreshResmi()} disabled={resmiLoading} style={{ width: '100%', fontSize: '0.5rem', padding: '4px 0' }}>
                      {resmiLoading ? '...' : 'GÜNCELLE'}
                    </Button>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.5625rem', fontWeight: 700, marginBottom: 2 }}>🌙 DİNİ</div>
                    <div style={{ fontSize: '0.5rem', opacity: 0.7, marginBottom: 4, minHeight: '2em' }}>
                      {diniLastUpdated ? formatTurkishDate(diniLastUpdated) : 'Yerleşik veri'}
                    </div>
                    {diniError && <div style={{ fontSize: '0.4375rem', color: '#b91c1c', marginBottom: 4 }}>⚠ Hata</div>}
                    <Button onClick={() => refreshDini()} disabled={diniLoading} style={{ width: '100%', fontSize: '0.5rem', padding: '4px 0' }}>
                      {diniLoading ? '...' : 'GÜNCELLE'}
                    </Button>
                  </div>
                </div>
                <div style={{ fontSize: '0.4375rem', opacity: 0.6, marginTop: 6 }}>
                  Resmi tatillerin sabit tarihli olanları (Yılbaşı, 23 Nisan vb.) internet olmasa bile her yıl için otomatik gösterilir.
                </div>
              </Frame>

              <Frame boxShadow="in" style={{ padding: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: '0.625rem', fontWeight: 700 }}>
                    {editingHolidayDate ? 'ÖZEL GÜNÜ DÜZENLE' : 'MANUEL OLARAK EKLE'}
                  </div>
                  {editingHolidayDate && (
                    <Button onClick={handleCancelEditCustomHoliday} style={{ fontSize: '0.5rem', padding: '2px 5px' }}>
                      VAZGEÇ
                    </Button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                  <Button
                    onClick={() => setNewHolidayType('official')}
                    style={{
                      flex: 1, fontSize: '0.5625rem', padding: '4px 2px',
                      backgroundColor: newHolidayType === 'official' ? '#000e7a' : undefined,
                      color: newHolidayType === 'official' ? '#ffffff' : '#1a1a1a',
                    }}
                  >
                    RESMİ TATİL
                  </Button>
                  <Button
                    onClick={() => setNewHolidayType('religious')}
                    style={{
                      flex: 1, fontSize: '0.5625rem', padding: '4px 2px',
                      backgroundColor: newHolidayType === 'religious' ? '#000e7a' : undefined,
                      color: newHolidayType === 'religious' ? '#ffffff' : '#1a1a1a',
                    }}
                  >
                    DİNİ BAYRAM
                  </Button>
                </div>

                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: '0.5rem', marginBottom: 2 }}>Tarih</div>
                  <Input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: '0.5rem', marginBottom: 2 }}>Tatil Adı</div>
                  <Input
                    type="text"
                    value={newHolidayName}
                    onChange={(e) => setNewHolidayName(e.target.value)}
                    placeholder="Örn: Kurban Bayramı 1. Gün"
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: '0.5rem', marginBottom: 2 }}>Kısa Ad (Takvimde Görünür)</div>
                  <Input
                    type="text"
                    value={newHolidayShortName}
                    onChange={(e) => setNewHolidayShortName(e.target.value)}
                    placeholder="Örn: Kurban"
                    maxLength={10}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.5625rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newHolidayHalfDay}
                      onChange={(e) => setNewHolidayHalfDay(e.target.checked)}
                    />
                    Yarım gün
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.5625rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newHolidayRecurring}
                      onChange={(e) => setNewHolidayRecurring(e.target.checked)}
                    />
                    Her yıl tekrarla
                  </label>
                </div>

                <Button onClick={handleAddCustomHoliday} style={{ width: '100%', fontSize: '0.625rem', padding: '8px 0' }}>
                  {editingHolidayDate ? '✎ GÜNCELLE' : '+ ÖZEL GÜN EKLE'}
                </Button>
              </Frame>

              <Frame boxShadow="in" style={{ padding: 8 }}>
                <div style={{ fontSize: '0.5625rem', fontWeight: 700, marginBottom: 4 }}>ÖZEL GÜNLER</div>
                {customHolidays.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 180, overflowY: 'auto' }}>
                    {customHolidays.map((h) => (
                      <Frame
                        key={h.date}
                        boxShadow="in"
                        style={{
                          padding: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          backgroundColor: editingHolidayDate === h.date ? '#c3c7cb' : undefined,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.5625rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{h.name}</div>
                          <div style={{ fontSize: '0.4375rem', opacity: 0.7 }}>
                            {h.recurring ? `Her Yıl ${formatTurkishDate(parseDate(h.date)).split(' ').slice(0, 2).join(' ')}` : formatTurkishDate(parseDate(h.date))} · {h.type === 'official' ? 'Resmi' : 'Dini'}{h.isHalfDay ? ' · Yarım' : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <Button onClick={() => handleStartEditCustomHoliday(h)} style={{ fontSize: '0.5rem', padding: '2px 5px' }}>✎</Button>
                          <Button onClick={() => handleRemoveCustomHoliday(h.date, h.name)} style={{ fontSize: '0.5rem', padding: '2px 5px' }}>✕</Button>
                        </div>
                      </Frame>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.5625rem', textAlign: 'center', padding: 8 }}>
                    Henüz manuel olarak eklenmiş özel gün yok.
                  </div>
                )}
              </Frame>
            </div>
          </Tab>
        </Tabs>
      </div>
    </Modal>
  );
};
