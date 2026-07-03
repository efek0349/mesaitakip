import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TaskBar, List, Frame } from '@react95/core';
import {
  Settings as SettingsIcon,
  Download,
  Share2,
  Trash2,
  AlertTriangle,
  Info,
  Monitor,
  Check,
  ChevronRight,
  Type,
  Palette,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Win95Font } from '../../hooks/useTheme';

/**
 * Win95Shell — ActionIcons.tsx'in Win95 temalı karşılığı.
 *
 * Eski tasarımda her eylem (Ayarlar, Yedekle, Paylaş, Sil, Bilgi) header'da
 * ayrı renkli bir ikon butonuydu. Win95 paradigmasında bunlar artık
 * TaskBar'daki "Başlat" menüsünün altında toplanan komutlar — tıpkı
 * gerçek Windows 95'te "Programs" / "Settings" gibi.
 *
 * TaskBar, React95'in `list` prop'una geçirilen React95 List bileşenini
 * Başlat menüsü içeriği olarak render eder. Saat göstergesi TaskBar'ın
 * sağında otomatik olarak gösterilir (varsayılan davranış).
 *
 * "Görünüm" alt menüsü: React95'in List bileşeni resmi bir nested-submenu
 * prop'u sunmuyor (ListItem sade bir <li>, alt menü API'si yok). Bunu
 * React95'in belirsiz dahili davranışına güvenmek yerine kendi basit
 * state'imizle (hangi alt menü açık) kontrol ediyoruz — Win95'in klasik
 * "Görünüm ▸" yan panel hissini, garantili ve test edilebilir şekilde verir.
 */

interface Win95ShellProps {
  onOpenDataBackup: () => void;
  onOpenSettings: () => void;
  onShareMonthlyStats: () => void;
  onClearMonthlyStats: () => void;
  onOpenBilgi: () => void;
  onOpenAbout: () => void;
  canShare: boolean;
  canClear: boolean;
  onTurnOffWin95: () => void;
  win95Font: Win95Font;
  onSetWin95Font: (font: Win95Font) => void;
}

export const Win95Shell: React.FC<Win95ShellProps> = React.memo(({
  onOpenDataBackup,
  onOpenSettings,
  onShareMonthlyStats,
  onClearMonthlyStats,
  onOpenBilgi,
  onOpenAbout,
  canShare,
  canClear,
  onTurnOffWin95,
  win95Font,
  onSetWin95Font,
}) => {
  const isShareAvailable = Capacitor.isNativePlatform() || !!navigator.share;
  const [viewSubmenuOpen, setViewSubmenuOpen] = useState(false);
  const [submenuPos, setSubmenuPos] = useState<{ top: number; left?: number; right?: number } | null>(null);
  const viewItemRef = useRef<HTMLLIElement>(null);

  // "Görünüm" satırına tıklanınca, o satırın GERÇEK ekran konumunu ölçüp
  // (getBoundingClientRect) alt menüyü tam onun sağına, aynı yükseklikte
  // yapıştırıyoruz — Win95'in klasik "▸" yana açılan alt menü hissi.
  // Ekranın sağına taşacaksa (item ekranın sağ yarısındaysa) otomatik
  // olarak sola açılır. -2px'lik örtüşme, iki panelin kenar çizgisinin
  // çakışıp TEK PARÇA gibi görünmesini sağlar.
  //
  // ÖNEMLİ EK NOT: Bu alt menü ayrı bir position:fixed eleman olduğu için
  // (bkz. dosya sonundaki mimari not), TaskBar'ın kendi Başlat menüsünü
  // NE ZAMAN kapattığını bilmiyoruz — React95'in TaskBar'ı kendi iç
  // açık/kapalı durumunu bize dışarı açmıyor. "Görünüm"e tıklamak TaskBar'ın
  // kendi menüsünü de kapatıyorsa (öğeye tıklayınca menü kapanan tipik
  // davranış), bizim alt menümüz TEK BAŞINA, sanki bağlantısız bir kutu
  // gibi ekranda kalabiliyordu — "ayrı blok gibi açılıyor, görünüm
  // ile beraber değil" sorunu tam buydu. Çözüm iki parçalı:
  // 1) stopPropagation, TaskBar'ın olası "dışına tıklandı" kapanışını
  //    tetiklememesi için tıklamanın document'a kadar yayılmasını engeller.
  // 2) Aşağıdaki useEffect, "Görünüm" satırı görünmez olduğu anda (TaskBar
  //    kendi menüsünü her ne sebeple kapatırsa kapatsın) bizim alt menümüzü
  //    de otomatik kapatır — böylece hiçbir zaman öksüz/bağlantısız bir
  //    kutu olarak ekranda asılı kalmaz.
  const handleToggleViewSubmenu = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (viewSubmenuOpen) {
      setViewSubmenuOpen(false);
      return;
    }
    const rect = viewItemRef.current?.getBoundingClientRect();
    if (rect) {
      const openToLeft = rect.left > window.innerWidth / 2;
      setSubmenuPos(
        openToLeft
          ? { top: rect.top - 2, right: window.innerWidth - rect.left - 2 }
          : { top: rect.top - 2, left: rect.right - 2 }
      );
    }
    setViewSubmenuOpen(true);
  };

  // Güvenlik ağı: "Görünüm" satırı (viewItemRef) herhangi bir sebeple
  // ekrandan kaybolursa (TaskBar kendi Başlat menüsünü kapattıysa) alt
  // menüyü de hemen kapat. offsetParent === null, bir eleman `display:none`
  // olduğunda veya DOM'dan kaldırıldığında true olur — hafif ve güvenilir
  // bir "hâlâ görünür mü" kontrolü.
  useEffect(() => {
    if (!viewSubmenuOpen) return;
    const checkStillAttached = () => {
      if (!viewItemRef.current || viewItemRef.current.offsetParent === null) {
        setViewSubmenuOpen(false);
      }
    };
    const intervalId = window.setInterval(checkStillAttached, 120);
    return () => window.clearInterval(intervalId);
  }, [viewSubmenuOpen]);

  // List.Item'in resmi 'disabled' prop'u yok; işlevsel devre dışı bırakma
  // onClick'i undefined yaparak sağlanıyor, görsel soluklaştırma ise
  // inline style ile (opacity) — Win95'in klasik "grayed out" menü öğesi hissi.
  const disabledItemStyle: React.CSSProperties = { opacity: 0.5, cursor: 'default' };

  // Geri bildirim: "butonlar arasında çok boşluk var, yakınlaştırma
  // yapabiliriz" — varsayılan List.Item padding'i mobilde fazla büyük
  // kalıyordu, ayrıca uzun başlıklı menü (9 madde) ekran genişliğini
  // zorluyordu. fontSize küçültüldü, padding sıkılaştırıldı.
  const compactItemStyle: React.CSSProperties = { fontSize: '0.75rem', padding: '4px 8px' };

  const startMenuList = useMemo(
    () => (
      <List
        bgColor="material"
        boxShadow="out"
        style={{
          color: '#1a1a1a',
          backgroundColor: '#c3c7cb',
          display: 'block',
          width: 'max-content',
          maxWidth: 'calc(100vw - 16px)',
        }}
      >
        <List.Item icon={<SettingsIcon size={16} />} onClick={onOpenSettings} style={compactItemStyle}>
          Ayarlar
        </List.Item>
        <List.Item icon={<Download size={16} />} onClick={onOpenDataBackup} style={compactItemStyle}>
          Veri Yedekle
        </List.Item>
        {isShareAvailable && (
          <List.Item
            icon={<Share2 size={16} />}
            onClick={canShare ? onShareMonthlyStats : undefined}
            style={canShare ? compactItemStyle : { ...compactItemStyle, ...disabledItemStyle }}
          >
            Aylık Raporu Paylaş
          </List.Item>
        )}
        <List.Item
          icon={<Trash2 size={16} />}
          onClick={canClear ? onClearMonthlyStats : undefined}
          style={canClear ? compactItemStyle : { ...compactItemStyle, ...disabledItemStyle }}
        >
          Aylık Verileri Sil
        </List.Item>
        <List.Divider />

        {/* Görünüm — tıklanınca yanına/üstüne açılan ikinci seviye liste.
            Win95'in klasik "▸" alt menü okuyla işaretlendi.
            "Win95 Temasını Kapat"ın ÜSTÜNE alındı (sıralama önceliği).

            ÖNEMLİ TEKNİK NOT: React95'in kendi List.css'i, bir List.Item
            içine <ul> (List) konulduğunda onu varsayılan olarak
            `display: none` yapıp SADECE `:hover` durumunda gösterir
            (bkz. `.list-item:has(ul):hover > ul { display: block }`).
            Bu masaüstünde fare ile çalışır ama dokunmatik ekranda/mobilde
            hover hiç tetiklenmediği için alt menü HİÇBİR ZAMAN görünmez.

            Çözüm: alt <List>'e doğrudan `style={{ display: ... }}` inline
            stilini veriyoruz — inline style her zaman class tabanlı CSS
            kuralından önceliklidir, bu yüzden React95'in :hover kuralını
            geçersiz kılıp kendi viewSubmenuOpen state'imizle kontrol
            edebiliyoruz. Dokunmatik ekranda da çalışır. */}
        <List.Item
          ref={viewItemRef}
          icon={<Palette size={16} />}
          onClick={handleToggleViewSubmenu}
          style={{
            ...compactItemStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            ...(viewSubmenuOpen ? { backgroundColor: '#000e7a', color: '#ffffff' } : {}),
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, color: viewSubmenuOpen ? '#ffffff' : undefined }}>
            Görünüm (Yazı Tipi)
          </span>
          <ChevronRight size={14} color={viewSubmenuOpen ? '#ffffff' : undefined} />
        </List.Item>

        <List.Divider />

        {/* Win95'i Kapat — DOĞRUDAN ana menüde, tek tıkla.
            Geri bildirim: "Görünüm" alt menüsünün içinde kalan kapatma
            seçeneği yeterince görünür/net değildi. Bu yüzden en sık
            ihtiyaç duyulacak eylem (orijinal temaya geri dönme) artık
            alt menüye girmeden, ana listede tek tıkla erişilebilir. */}
        <List.Item
          icon={<Monitor size={16} />}
          onClick={onTurnOffWin95}
          style={{ ...compactItemStyle, fontWeight: 700 }}
        >
          Win95 Temasını Kapat
        </List.Item>

        <List.Divider />
        <List.Item icon={<AlertTriangle size={16} />} onClick={onOpenBilgi} style={compactItemStyle}>
          Bilgi ve Duyurular
        </List.Item>
        <List.Item icon={<Info size={16} />} onClick={onOpenAbout} style={compactItemStyle}>
          Hakkında
        </List.Item>
      </List>
    ),
    [
      onOpenSettings,
      onOpenDataBackup,
      isShareAvailable,
      canShare,
      onShareMonthlyStats,
      canClear,
      onClearMonthlyStats,
      onTurnOffWin95,
      onOpenBilgi,
      onOpenAbout,
    ]
  );

  return (
    <>
      {/* ANDROID GESTURE-NAV GÜVENLİ ALAN DOLGUSU: TaskBar aşağıda
          `win95-taskbar-safe-area` class'ı ile yukarı kaydırılıyor (translateY),
          bu da onun ALTINDA (gerçek ekran kenarına kadar) boş/şeffaf bir
          boşluk bırakır. Bu div o boşluğu TaskBar ile AYNI renkte
          (--r95-color-material) doldurup görsel bütünlüğü sağlıyor.
          Neden ayrı bir div (TaskBar'ın kendi height/padding'ini büyütmek
          yerine): TaskBar'ın iç Frame'i `display:flex` + varsayılan
          `align-items` kullanıyor ve dropdown/Start-menü Frame'leri
          `bottom: 28px` gibi TaskBar'ın kendi kutusuna göre SABİT
          değerlerle konumlanıyor (react95 kaynağından doğrulandı). TaskBar
          kutusunun kendi yüksekliğini/padding'ini artırmak bu iç hesapları
          bozar (Start menüsü/Görünüm alt menüsü olması gerekenden farklı
          yere düşer). transform ise kutunun boyutunu DEĞİL sadece render
          konumunu değiştirdiği için iç konumlandırma tamamen korunur. */}
      <div className="win95-taskbar-safe-area-filler" aria-hidden="true" />
      <TaskBar list={startMenuList} className="win95-taskbar-safe-area" />

      {/* ÖNEMLİ MİMARİ NOT: Bu alt menü artık "Görünüm" List.Item'ının
          İÇİNDE değil, Win95Shell'in KENDİ EN DIŞ JSX'inde (TaskBar'ın
          sibling'i) render ediliyor. Sebep: React95'in ListItem'ı kendi
          CSS class'ında ZATEN `position: relative` içeriyor (gerçek
          kaynaktan doğrulandı, .r95_1lxkvz40 class'ı) — bu yüzden içine
          koyduğum herhangi bir position:fixed/absolute child, App.tsx'teki
          güvenli kapsayıcıya değil, bu ListItem'a göre konumlanıyordu ve
          asla TaskBar'ın gerçek üstüne çıkamıyordu.
          Konum artık sabit değil — handleToggleViewSubmenu,
          tıklanan anda "Görünüm" satırının GERÇEK ekran koordinatlarını
          ölçüp (submenuPos) alt menüyü tam o satırın sağına yapıştırıyor,
          Win95'in klasik yana açılan flyout hissini veriyor. */}
      {viewSubmenuOpen && submenuPos && (
        <List
          bgColor="material"
          boxShadow="out"
          style={{
            position: 'fixed', top: submenuPos.top, left: submenuPos.left, right: submenuPos.right, zIndex: 1000,
            color: '#1a1a1a', backgroundColor: '#c3c7cb',
            width: 'max-content', maxWidth: 'calc(100vw - 16px)',
          }}
        >
          <List.Item
            icon={<Type size={16} />}
            onClick={() => { onSetWin95Font('pixel'); setViewSubmenuOpen(false); }}
            style={compactItemStyle}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%', color: '#1a1a1a', whiteSpace: 'nowrap' }}>
              Klasik (Piksel)
              {win95Font === 'pixel' && <Check size={14} />}
            </span>
          </List.Item>
          <List.Item
            icon={<Type size={16} />}
            onClick={() => { onSetWin95Font('system'); setViewSubmenuOpen(false); }}
            style={compactItemStyle}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%', color: '#1a1a1a', whiteSpace: 'nowrap' }}>
              Okunaklı Font
              {win95Font === 'system' && <Check size={14} />}
            </span>
          </List.Item>
        </List>
      )}
    </>
  );
});

Win95Shell.displayName = 'Win95Shell';

/**
 * Win95Clock — TaskBar'ın varsayılan saat göstergesi yeterli olmayabilir
 * veya tema bunu desteklemiyorsa, header'da kullanılacak yedek saat bileşeni.
 * (TaskBar varsayılan olarak saat göstermiyorsa Win95Shell içine eklenebilir.)
 */
export const Win95Clock: React.FC = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(timer);
  }, []);

  const timeText = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  return (
    <Frame variant="well" className="win95-taskbar-clock" style={{ padding: '2px 6px' }}>
      {timeText}
    </Frame>
  );
};
