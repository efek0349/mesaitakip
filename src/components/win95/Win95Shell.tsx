import React, { useState, useEffect, useMemo } from 'react';
import { TaskBar, List, Frame } from '@react95/core';
import {
  Settings as SettingsIcon,
  Download,
  Share2,
  Trash2,
  AlertTriangle,
  Info,
  Monitor,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';

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
 * NOT: "Görünüm" (yazı tipi) alt menüsü Başlat menüsünden kaldırıldı —
 * aynı kontroller zaten Ayarlar > Sistem sekmesinde (Win95ThemeSwitcher)
 * mevcut olduğu için burada tekrar etmeye gerek yoktu.
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
}) => {
  const isShareAvailable = Capacitor.isNativePlatform() || !!navigator.share;

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

        {/* Temayı Değiştir — DOĞRUDAN ana menüde, tek tıkla.
            En sık ihtiyaç duyulacak eylem (orijinal temaya geri dönme)
            ana listede tek tıkla erişilebilir. */}
        <List.Item
          icon={<Monitor size={16} />}
          onClick={onTurnOffWin95}
          style={{ ...compactItemStyle, fontWeight: 700 }}
        >
          Temayı Değiştir
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
          bozar (Start menüsü olması gerekenden farklı yere düşer).
          transform ise kutunun boyutunu DEĞİL sadece render konumunu
          değiştirdiği için iç konumlandırma tamamen korunur. */}
      <div className="win95-taskbar-safe-area-filler" aria-hidden="true" />
      <TaskBar list={startMenuList} className="win95-taskbar-safe-area" />
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
