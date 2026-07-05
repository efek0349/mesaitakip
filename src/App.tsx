import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { Frame, TitleBar, ProgressBar } from '@react95/core';
import { Calendar } from './components/Calendar';
import { MonthlyStats } from './components/MonthlyStats';
import { Toast } from './components/Toast';
import { ActionIcons } from './components/ActionIcons';
import { Win95Shell } from './components/win95/Win95Shell';
import { useOvertimeData } from './hooks/useOvertimeData';
import { useSalarySettings } from './hooks/useSalarySettings';
import { useHolidays } from './hooks/useHolidays';
import { useTheme } from './hooks/useTheme';
import { useAutoBackup } from './hooks/useAutoBackup';
import { useUpdateCheck } from './hooks/useUpdateCheck';
import { TURKISH_MONTHS } from './utils/dateUtils';
import { downloadTextFile, shareText, generateCsvContent, generateShareableSummaryText } from './utils/fileUtils';
import { googleDriveService } from './utils/googleDriveService';
import { Browser } from '@capacitor/browser';
import { Dialog } from '@capacitor/dialog';

const OvertimeModal = lazy(() => import('./components/OvertimeModal').then(m => ({ default: m.OvertimeModal })));
const Settings = lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));
const AboutModal = lazy(() => import('./components/AboutModal').then(m => ({ default: m.AboutModal })));
const DataBackupModal = lazy(() => import('./components/DataBackupModal').then(m => ({ default: m.DataBackupModal })));
const UpdateModal = lazy(() => import('./components/UpdateModal').then(m => ({ default: m.UpdateModal })));
const BilgiModal = lazy(() => import('./components/BilgiModal').then(m => ({ default: m.BilgiModal })));

const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [visualProgress, setVisualProgress] = useState(0);
  const [isFullyReady, setIsFullyReady] = useState(false);

  const { isLoaded: dataLoaded, monthlyData, getMonthlyTotal, clearMonthData, hasMonthData } = useOvertimeData();
  const { isLoaded: salaryLoaded, settings, updateSettings, getOvertimeRate, getSalaryForDate } = useSalarySettings();

  // Visual Progress Logic
    React.useEffect(() => {
    let timer: number;
    const updateProgress = () => {
      setVisualProgress(prev => {
        if (prev < 90) {
          // Faster progress
          return prev + Math.random() * 15;
        } else if (dataLoaded && salaryLoaded) {
          if (prev >= 100) {
            clearInterval(timer);
            setTimeout(() => setIsFullyReady(true), 100); // Shorter pause
            return 100;
          }
          return prev + 20;
        }
        return prev;
      });
    };

    timer = window.setInterval(updateProgress, 30); // Faster interval
    return () => clearInterval(timer);
  }, [dataLoaded, salaryLoaded]);

  const { getHoliday } = useHolidays(currentDate.getFullYear(), true);
  const updateInfo = useUpdateCheck();
  // win95Enabled: Win95 görünümünün açık/kapalı olduğu kalıcı tercih.
  // toggleWin95/setWin95: TaskBar'daki "Temayı Değiştir" öğesinden (Win95Shell) çağrılır.
  const { win95Enabled, toggleWin95, setWin95 } = useTheme();
  useAutoBackup();

  React.useEffect(() => {
    googleDriveService.init().catch(console.error);
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isDataBackupOpen, setIsDataBackupOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isBilgiOpen, setIsBilgiOpen] = useState(false);

  React.useEffect(() => {
    if (updateInfo.hasUpdate) {
      setIsUpdateModalOpen(true);
    }
  }, [updateInfo.hasUpdate]);

  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedDate(null);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleOpenDataBackup = useCallback(() => {
    setIsDataBackupOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => setIsSettingsOpen(false), []);
  const handleCloseAbout = useCallback(() => setIsAboutModalOpen(false), []);
  const handleCloseDataBackup = useCallback(() => setIsDataBackupOpen(false), []);
  const handleCloseUpdate = useCallback(() => setIsUpdateModalOpen(false), []);
  const handleCloseBilgi = useCallback(() => setIsBilgiOpen(false), []);

  const handleOpenLink = useCallback(async (url: string) => {
    try {
      await Browser.open({ url });
    } catch (error) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const handleShareMonthlyStats = useCallback(async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthSalary = getSalaryForDate(currentDate);
    const effectiveSettings = {
      ...settings,
      monthlyGrossSalary: monthSalary.monthlyGrossSalary,
      bonus: monthSalary.bonus,
      isSaturdayWork: monthSalary.isSaturdayWork ?? settings.isSaturdayWork,
      shiftSystemEnabled: monthSalary.shiftSystemEnabled ?? settings.shiftSystemEnabled,
      shiftSystemType: monthSalary.shiftSystemType ?? settings.shiftSystemType
    };
    const exportText = await generateShareableSummaryText(year, month, monthlyData, effectiveSettings, getHoliday);
    const title = `${TURKISH_MONTHS[month]} ${year} Mesai Özeti`;
    await shareText(exportText, title);
  }, [currentDate, monthlyData, settings, getHoliday, getSalaryForDate]);

  const handleClearMonthlyStats = useCallback(async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const { value } = await Dialog.confirm({
      title: 'Ayı Temizle',
      message: `${TURKISH_MONTHS[month]} ${year} ayındaki tüm mesai kayıtlarını silmek istediğinizden emin misiniz?`,
      okButtonTitle: 'Sil',
      cancelButtonTitle: 'Vazgeç'
    });
    if (value) {
      clearMonthData(year, month);
    }
  }, [currentDate, clearMonthData]);

  const handleDateChange = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  const hasData = useMemo(
    () => hasMonthData(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate, hasMonthData, monthlyData]
  );

  // ─── Splash / Yükleniyor ekranı ───────────────────────────────────────────
  // win95Enabled durumuna göre iki ayrı görünüm: Win95 (splash: Frame+ProgressBar, merkeze hizalı logo/isim)
  // veya orijinal Tailwind tasarımı (rounded ikon kutusu, gradient ilerleme çubuğu).
  if (!isFullyReady) {
    if (win95Enabled) {
      return (
        <div className="win95-desktop fixed inset-0 flex items-center justify-center z-[9999]">
          <Frame
            className="win95-window-enter"
            boxShadow="out"
            style={{ width: 260, padding: '28px 24px' }}
          >
            <div className="flex flex-col items-center" style={{ gap: 16 }}>
              <img
                src={`${import.meta.env.BASE_URL}app_icon.png`}
                alt="App Icon"
                style={{ width: 64, height: 64, objectFit: 'cover', imageRendering: 'pixelated' }}
              />
              <span style={{ fontSize: 15, fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>
                Mesai Takip
              </span>
              <div style={{ width: '100%' }}>
                {/* ÖNEMLİ: ProgressBar'ın varsayılan genişliği 150px SABİT
                    (React95'in kendi kaynak kodundan doğrulandı) — kapsayıcı
                    div'in width:100% vermesi yetmiyor, ProgressBar'a width
                    prop'u AYRICA verilmeli. Bu eksikti, bar her zaman 150px
                    kalıp 260px'lik pencerenin solunda duruyordu. */}
                <ProgressBar percent={Math.round(visualProgress)} width="100%" />
              </div>
              <span style={{ fontSize: 11, textAlign: 'center' }}>
                {visualProgress >= 100 ? 'Hazır!' : 'Veriler Yükleniyor...'}
              </span>
            </div>
          </Frame>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-gray-100 dark:bg-black flex items-center justify-center z-[9999]">
        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-700">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse" />
            <div className="relative w-24 h-24 rounded-[28px] overflow-hidden shadow-2xl border-b-4 border-gray-200 dark:border-gray-800 bg-white p-1">
              <img
                src={`${import.meta.env.BASE_URL}app_icon.png`}
                alt="App Icon"
                className="w-full h-full object-cover rounded-2xl"
              />
            </div>
          </div>
          <div className="flex flex-col items-center gap-4 w-48">
            <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-tighter uppercase">
              Mesai Takip
            </h2>
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner border border-gray-300/20 dark:border-white/5">
              <div
                className="h-full bg-gradient-to-r from-blue-400 via-blue-600 to-blue-400 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${visualProgress}%` }}
              />
            </div>
            <p className="text-[0.625rem] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest animate-pulse">
              {visualProgress >= 100 ? 'Hazır!' : 'Veriler Yükleniyor'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Ortak modaller (her iki temada da aynı, Suspense+Toast paylaşılır) ───
  const sharedModals = (
    <>
      <Suspense fallback={null}>
        {isModalOpen && (
          <OvertimeModal isOpen={isModalOpen} onClose={handleCloseModal} selectedDate={selectedDate} win95Enabled={win95Enabled} />
        )}
        {isSettingsOpen && (
          <Settings isOpen={isSettingsOpen} onClose={handleCloseSettings} currentDate={currentDate} win95Enabled={win95Enabled} />
        )}
        {isAboutModalOpen && (
          <AboutModal isOpen={isAboutModalOpen} onClose={handleCloseAbout} win95Enabled={win95Enabled} />
        )}
        {isDataBackupOpen && (
          <DataBackupModal isOpen={isDataBackupOpen} onClose={handleCloseDataBackup} currentDate={currentDate} win95Enabled={win95Enabled} />
        )}
        {isUpdateModalOpen && (
          <UpdateModal
            isOpen={isUpdateModalOpen}
            onClose={handleCloseUpdate}
            version={updateInfo.latestVersion}
            onDownload={() => handleOpenLink('https://github.com/efek0349/mesaitakip/releases')}
            win95Enabled={win95Enabled}
          />
        )}
        {isBilgiOpen && (
          <BilgiModal isOpen={isBilgiOpen} onClose={handleCloseBilgi} win95Enabled={win95Enabled} />
        )}
      </Suspense>
      <Toast win95Enabled={win95Enabled} />
    </>
  );

  // ─── WIN95 GÖRÜNÜMÜ ────────────────────────────────────────────────────────
  if (win95Enabled) {
    return (
      // ÖNEMLİ: position: 'relative' KASITLI eklendi. React95'in TaskBar'ı
      // kendi içinde `position: fixed; bottom: 0px` kullanıyor (gerçek
      // kaynak kodundan doğrulandı) — normalde bu, TaskBar'ı GERÇEK VIEWPORT
      // tabanına sabitler, mobil tarayıcı/Android'in adres çubuğu, navigasyon
      // çubuğu (gesture bar) gibi dinamik UI elemanlarıyla çakışabilir
      //
      // CSS'in temel kuralı: `position: fixed` bir element, en yakın
      // "positioned" (static OLMAYAN position değerine sahip) ebeveynine
      // göre konumlanır — eğer hiç yoksa viewport'a göre konumlanır. Bu
      // dış div'e `position: relative` vererek, TaskBar'ın fixed
      // davranışını GERÇEK VIEWPORT'TAN ALIP bu kapsayıcının sınırlarına
      // (height: 100dvh, safe-area padding'leri dahil) bağlıyoruz. Artık
      // TaskBar her zaman BU kapsayıcının en altında durur, Android'in
      // navigasyon çubuğunun gerçek davranışından etkilenmez.
      <div className="win95-desktop h-screen-dynamic flex flex-col" style={{ position: 'relative' }}>

        {/* Ana Program Penceresi — eski header+içerik alanının Win95 karşılığı.
            pt-[env(safe-area-inset-top)] mobil çentik/status bar payı için korunuyor. */}
        <div
          className="flex-1 overflow-hidden flex flex-col min-h-0 p-1"
          style={{ paddingTop: 'max(4px, env(safe-area-inset-top))' }}
        >
          {/* ÖNEMLİ: Frame'in kendi CSS sprinkle sistemi `display` özelliğini
              bir custom property üzerinden kontrol ediyor — Tailwind'in
              `flex flex-col` class'ları Frame'e doğrudan verildiğinde CSS
              yükleme sırasına bağlı olarak ezilebiliyordu, bu da Frame'in
              içeriğinin (TitleBar + scroll alanı) flex değil normal blok
              akışında dizilmesine, ve içeriğin SINIRSIZ BÜYÜMESİNE yol
              açıyordu (TaskBar'ı ekran dışına itiyordu). Çözüm: Frame'i
              SADECE görsel kabuk (kenarlık/gölge) olarak kullanıp, gerçek
              flex/overflow kontrolünü native div'lere veriyoruz — Frame'in
              kendi layout davranışına hiç güvenmiyoruz. */}
          <Frame
            boxShadow="out"
            bgColor="material"
            className="win95-window-enter"
            style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
          >
            <div style={{ flexShrink: 0 }}>
              <TitleBar
                title={
                  (settings.firstName || settings.lastName)
                    ? `Mesai Takip — ${settings.firstName} ${settings.lastName}`.trim()
                    : 'Mesai Takip'
                }
                icon={
                  <img
                    src={`${import.meta.env.BASE_URL}app_icon.png`}
                    alt=""
                    className="w-4 h-4"
                    style={{ imageRendering: 'pixelated' }}
                  />
                }
              />
            </div>

            {/* Scrollable İçerik — explicit arka plan rengi (#c3c7cb, Win95'in
                klasik pencere gövdesi grisi) ki Calendar/MonthlyStats kendi
                arka planlarını taşımadan bu zemin üzerinde doğru görünsün.
                flexBasis: 0 ÖNEMLİ — flex-grow'un doğru hesaplanması için
                (içerik boyutuna göre değil, kalan alana göre büyüsün). */}
            <div
              style={{
                flex: '1 1 0',
                minHeight: 0,
                overflowY: 'auto',
                padding: 8,
                backgroundColor: '#c3c7cb',
              }}
            >
              <div className="landscape:grid landscape:grid-cols-2 landscape:gap-3 landscape:items-start">
                <Calendar
                  currentDate={currentDate}
                  onDateChange={handleDateChange}
                  onDateClick={handleDateClick}
                  win95Enabled={true}
                />
                <MonthlyStats
                  currentDate={currentDate}
                  onOpenSettings={handleOpenSettings}
                  onOpenDataBackup={handleOpenDataBackup}
                  win95Enabled={true}
                />
              </div>
            </div>
          </Frame>
        </div>

        {sharedModals}

        {/* TaskBar rezerve alanı — DÜZELTME NOTU: Bu div'in `position:
            'relative'` olması TaskBar'ın konumunu HİÇ etkilemiyor. CSS
            kuralı: `position:fixed` bir eleman, yalnızca `position:relative`
            değil, `transform`/`filter`/`perspective`/`will-change` gibi yeni
            bir "containing block" yaratan bir özelliğe sahip ata elemanlara
            göre konumlanır — sade bir `position:relative` bunu sağlamaz.
            TaskBar (react95 kaynağı: `<Frame position="fixed" bottom="0px">`)
            dolayısıyla GERÇEK VIEWPORT'a göre sabitleniyor, bu div'e göre
            değil. Bu div'in TEK gerçek işlevi: flex sütun düzeninde TaskBar'ın
            kapladığı kadar (28px + güvenli alan) boşluk AYIRMAK, böylece
            üstteki içerik TaskBar'ın altında kalıp görünmez olmuyor.

            Gerçek Android gesture-navigasyon güvenli alanı düzeltmesi artık
            Win95Shell.tsx + win95-overrides.css'te (`win95-taskbar-safe-area`
            / `win95-taskbar-safe-area-filler`, `transform: translateY(...)`)
            uygulanıyor — orada `--win95-taskbar-safe-bottom` adlı TEK bir
            CSS custom property, hem CSS `env(safe-area-inset-bottom, 0px)`
            hem de androidUtils.ts'nin JS ile hesapladığı `--nav-bar-height`
            değişkeninin BÜYÜĞÜNÜ (`max()`) tutuyor.

            DÜZELTME (bkz. rapor: Android 16 / LineageOS'ta ana ekranın
            TaskBar'ın ALTINA sarkması): Buradaki paddingBottom eskiden AYNI
            `max(...)` ifadesini fallback'siz `env(safe-area-inset-bottom)`
            ile elle TEKRAR yazıyordu. İki yerde aynı hesabı iki farklı
            şekilde (biri env() fallback'li, biri fallback'siz) yazmak,
            bazı WebView'lerde ikisinin farklı sonuç vermesine yol
            açabiliyordu: TaskBar doğru miktar kadar yukarı kayarken, bu
            div'in payı o miktarı rezerve edemiyor, üstteki pencere flex-1
            ile o boşluğu da kendine katıp TaskBar'ın ARKASINA/ALTINA doğru
            büyüyordu (Android 13'te ikisi çakışarak aynı sonucu verdiği
            için sorun görünmüyordu). Artık ikisi de TEK bir ortak
            `--win95-taskbar-safe-bottom` değişkenini okuyor — aynı sayı,
            aynı anda, iki yerde de garanti ediliyor, formüller ayrışamaz. */}
        <div
          style={{
            position: 'relative',
            paddingBottom: 'var(--win95-taskbar-safe-bottom, 0px)',
            // ÖNEMLİ DÜZELTME: Bu proje `box-sizing: border-box` kullanıyor
            // (Tailwind preflight). border-box modelinde `min-height`,
            // padding'i İÇİNE alır — padding'in ÜSTÜNE eklemez. Yani
            // `minHeight: 28` + `paddingBottom: 24` yazıldığında, tarayıcı
            // toplam kutuyu `max(28, 0+24)=28` olarak hesaplıyor; padding
            // (24) min-height'ı (28) geçmediği için TÜM güvenli alan payı
            // sessizce yutuluyor ve kutunun toplam yüksekliği hep 28px'de
            // kalıyor — ana pencere de bu "kayıp" 24px'in içine akıp
            // TaskBar'ın üstüne/arkasına biniyordu (bkz. rapor: Android 16 /
            // LineageOS'ta ana ekranın TaskBar'a gömülmesi). Android 13'te
            // güvenli alan payı 28'den büyük çıktığı için (`max(28,0+48)=48`)
            // bu tuzağa hiç girilmiyordu, o yüzden sorun görünmüyordu.
            //
            // ÇÖZÜM: min-height'ı, güvenli alan payını da İÇİNDE barındıran
            // TEK bir toplam olarak ifade ediyoruz (`calc(28px + pay)`).
            // Böylece hangi box-sizing modeli kullanılırsa kullanılsın,
            // kutunun toplam yüksekliği her zaman en az "TaskBar (28px) +
            // güvenli alan payı" olmak zorunda — payın min-height'a "yenilip"
            // yutulması artık mümkün değil.
            minHeight: 'calc(28px + var(--win95-taskbar-safe-bottom, 0px))',
          }}
          className="flex-shrink-0"
        >
          <Win95Shell
            onOpenDataBackup={handleOpenDataBackup}
            onOpenSettings={handleOpenSettings}
            onShareMonthlyStats={handleShareMonthlyStats}
            onClearMonthlyStats={handleClearMonthlyStats}
            onOpenBilgi={() => setIsBilgiOpen(true)}
            onOpenAbout={() => setIsAboutModalOpen(true)}
            canShare={hasData}
            canClear={hasData}
            onTurnOffWin95={() => setWin95(false)}
          />
        </div>
      </div>
    );
  }

  // ─── ORİJİNAL (TAILWIND) GÖRÜNÜMÜ ─────────────────────────────────────────
  return (
    <div className="bg-gray-100 dark:bg-black h-screen-dynamic flex flex-col pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">

      {/* Header */}
      <div className="flex-shrink-0">
        <div className="container mx-auto px-2 pt-4 max-w-4xl">
          <div className="flex items-center justify-between gap-2">

            {/* SOL TARAF: Uygulama İkonu + İsim/Soyisim */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAboutModalOpen(true)}
                className="flex items-center justify-center w-10 h-10 rounded-lg overflow-hidden shadow-md border-b-4 border-gray-300 dark:border-gray-700 active:border-b-0 active:translate-y-1 transition-all flex-shrink-0 bg-white"
                aria-label="Hakkında"
              >
                <img
                  src={`${import.meta.env.BASE_URL}app_icon.png`}
                  alt="App Icon"
                  className="w-full h-full object-cover"
                />
              </button>

              {(settings.firstName || settings.lastName) && (
                <div className="flex flex-col justify-center min-w-0 pr-1">
                  <span className="text-[0.5625rem] font-bold text-gray-800 dark:text-gray-200 leading-tight truncate">
                    {settings.firstName}
                  </span>
                  <span className="text-[0.5625rem] font-bold text-gray-800 dark:text-gray-200 leading-tight truncate">
                    {settings.lastName}
                  </span>
                </div>
              )}
            </div>

            {/* Action Icons (sağ) */}
            <ActionIcons
              onOpenDataBackup={handleOpenDataBackup}
              onOpenSettings={handleOpenSettings}
              onShareMonthlyStats={handleShareMonthlyStats}
              onClearMonthlyStats={handleClearMonthlyStats}
              onOpenBilgi={() => setIsBilgiOpen(true)}
              onToggleWin95={toggleWin95}
              canShare={hasData}
              canClear={hasData}
              className="flex-shrink-0"
            />
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="container mx-auto px-2 max-w-4xl landscape:max-w-6xl">
          <div className="landscape:grid landscape:grid-cols-2 landscape:gap-4 landscape:items-start">
            <Calendar
              currentDate={currentDate}
              onDateChange={handleDateChange}
              onDateClick={handleDateClick}
              win95Enabled={false}
            />
            <MonthlyStats
              currentDate={currentDate}
              onOpenSettings={handleOpenSettings}
              onOpenDataBackup={handleOpenDataBackup}
              win95Enabled={false}
            />
          </div>
        </div>
      </div>

      {sharedModals}
    </div>
  );
}

export default App;
