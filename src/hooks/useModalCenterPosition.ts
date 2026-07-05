import { useState, useEffect, useMemo } from 'react';

/**
 * useModalCenterPosition — React95 Modal'ın dragOptions.defaultPosition
 * VE maxHeight'ı için ekrana göre güvenli {x, y, maxHeight} üretir.
 *
 * KÖK SEBEP #1: `dragOptions.
 * defaultPosition` sadece İLK pozisyonu belirler, Modal'ın içeriği
 * SONRADAN büyüse (örn. Ayarlar'da Genel sekmesinden Maaş sekmesine
 * geçince) bile pozisyon ASLA otomatik güncellenmiyor.
 *
 * KÖK SEBEP #2 (gerçek React95 CSS kaynağından doğrulandı — Modal.css.ts.
 * vanilla.css): Modal'ın kendi CSS class'ı (.r95_1txblt60) ZATEN
 * `position: fixed; top: 50px;` İÇERİYOR. @neodrag/react'in
 * `useDraggable` hook'u elementi `transform: translate(x, y)` ile taşır
 * — yani benim defaultPosition'ımdaki y değeri, CSS'teki sabit 50px'in
 * ÜZERİNE EKLENİYOR, onu değiştirmiyor. Bu yüzden gerçek ekran konumu
 * `50px + y` oluyordu — benim maxHeight hesabım bu gizli 50px'i
 * saymadığı için Modal'ın gerçek alt kenarı hesaplanandan 50px daha
 * aşağıda kalıyor, içerik biraz uzun olunca taşma oluyordu.
 *
 * ÇÖZÜM: MODAL_CSS_TOP sabitini (50, React95'in kendi CSS'inden) tüm
 * hesaplamalara dahil ediyoruz — y artık bu 50px'i de düşerek hesaplanıyor
 * (negatif olabilir, bu transform'la üst yöne kaydırma demektir — Modal'ı
 * istediğimiz gerçek ekran konumuna getirir), maxHeight da gerçek toplam
 * (50 + y) üst boşluğunu hesaba katıyor.
 *
 * KÖK SEBEP #3 (ekran döndürme/pencere yeniden boyutlandırma taşması):
 * Bu hook eskiden SADECE `useMemo([modalWidth])` kullanıyordu — modalWidth
 * hep sabit (360) olduğu için vw/vh yalnızca hook'un İLK çalıştığı anda
 * okunuyordu ve BİR DAHA ASLA güncellenmiyordu. Modal bileşenleri
 * (`if (!isOpen) return null`) kapandığında unmount OLMUYOR, sadece null
 * render ediyor — yani component ağaçta kalıcı olarak monte kalıyor ve
 * hook yeniden mount edilmiyor. Sonuç: kullanıcı telefonu döndürüp
 * (dikey→yatay, vh küçülür) sonra bir Win95 penceresi açtığında, maxHeight
 * hâlâ ESKİ (döndürmeden önceki, daha büyük) vh'ye göre hesaplanmış oluyor
 * — pencere TaskBar'ın çok altına taşıyordu. Ana ekran (saf CSS media
 * query kullandığı için) anında uyum sağlarken, JS ile TEK SEFERLİK
 * hesaplanan bu modal boyutu asla güncellenmiyordu.
 *
 * ÇÖZÜM: vw/vh artık useState'te tutuluyor ve `resize` +
 * `orientationchange` event'lerinde canlı olarak güncelleniyor — modal
 * her zaman GÜNCEL ekran boyutuna göre konumlanıyor/boyutlanıyor.
 * KÖK SEBEP #4 (yatay/dikey döndürme sırasında pencere AÇIKKEN taşma):
 * #3'teki düzeltme maxHeight'ı reaktif yaptı ama x/y hâlâ tam çözmüyordu.
 * Sebep: @neodrag/react'in `defaultPosition`'ı SADECE modal DOM'a ilk
 * mount olduğunda okunuyor — Modal açıkken (isOpen hep true) ekran
 * döndürülünce SettingsWin95 yeniden render olup güncel {x, y} hesaplansa
 * bile, neodrag bunu bir daha okumuyor (ismi "defaultPosition", "position"
 * değil). Modal, döndürmeden ÖNCEKİ (artık geçersiz) transform'da asılı
 * kalıyor — maxHeight küçülse bile üst konum eskisi gibi kaldığı için alt
 * kenar TaskBar'ın altına taşabiliyor.
 *
 * ÇÖZÜM: `orientationKey` döndürüyoruz ("landscape"/"portrait"). Her Win95
 * modal bileşeni bunu React `key`'i olarak kullanır — yönelim gerçekten
 * değiştiğinde (sürekli resize'da değil, SADECE landscape↔portrait geçişte)
 * React Modal'ı komple unmount/remount eder, neodrag sıfırdan güncel
 * {x, y}'yi okur.
 *
 * KÖK SEBEP #5 (yatayda hâlâ TaskBar altına taşma — "kontrolsüz" görünüm):
 * @react95/core'un gerçek `Modal.tsx` kaynağını indirip inceledim
 * (registry.npmjs.org/@react95/core). Modal DOM'u şöyle: Frame(modalWrapper,
 * padding 2px) > TitleBar(height 20px + padding 2+2 + marginBottom 2px ≈
 * 26px) > {children} (bizim maxHeight verdiğimiz div) > buttons Frame
 * (buttonWrapper padding 6+6, Button padding 7+5 + metin ≈ 38px). Yani
 * TitleBar + Buton satırı + Modal'ın kendi iç padding'i toplam yaklaşık
 * 70-80px'i, bizim hesapladığımız içerik div'inin maxHeight'ının DIŞINDA,
 * EK olarak kaplıyor. Eski formül bu payı hiç düşmüyordu — dikeyde
 * (vh büyük) bu fark oransal olarak küçük kalıp fark edilmezken, yatayda
 * (vh küçük, örn. 380-450px) bu 70-80px, kalan alanın büyük bir kısmını
 * yiyip modalin gerçek alt kenarını TaskBar'ın epey altına itiyordu —
 * "kontrolsüz" görünmesinin sebebi tam buydu.
 *
 * ÇÖZÜM: MODAL_CHROME_HEIGHT sabitini (TitleBar + buton satırı + iç
 * padding toplamı) maxHeight bütçesinden düşüyoruz.
 */
const TASKBAR_HEIGHT = 28;
const SAFETY_MARGIN = 16;
const MODAL_CSS_TOP = 50; // React95'in kendi Modal CSS'indeki sabit "top: 50px"
// TitleBar (~26px) + buton satırı (~38px) + Modal'ın kendi iç padding'i
// (~4px) — bkz. KÖK SEBEP #5 yukarıda. Bizim verdiğimiz maxHeight sadece
// {children} div'ini kapsıyor, bu chrome onun DIŞINDA ek yer kaplıyor.
const MODAL_CHROME_HEIGHT = 76;

function getViewportSize() {
  if (typeof window === 'undefined') {
    return { vw: 360, vh: 640 };
  }
  return { vw: window.innerWidth, vh: window.innerHeight };
}

export function useModalCenterPosition(modalWidth: number, _legacyEstimatedHeight?: number) {
  const [{ vw, vh }, setViewport] = useState(getViewportSize);

  useEffect(() => {
    const handleResize = () => setViewport(getViewportSize());

    // 'resize' modern tarayıcılarda ekran döndürmede de tetiklenir, ama
    // bazı mobil WebView'lerde orientationchange -> resize gecikmeli/
    // eksik gelebiliyor; ikisini birden dinlemek en güvenlisi.
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return useMemo(() => {
    const margin = 8;
    const x = Math.max(margin, Math.round((vw - modalWidth) / 2));

    // Gerçek ekran konumu (top) = MODAL_CSS_TOP + y olmalı.
    // İstediğimiz gerçek top: ekranın üst kısmına yakın (vh'nin %4'ü, min 12px).
    const desiredRealTop = Math.max(12, Math.round(vh * 0.04));
    const y = desiredRealTop - MODAL_CSS_TOP;

    // maxHeight: gerçek top'tan TaskBar'a kadar kalan GERÇEK alan, TitleBar
    // ve buton satırının (chrome) kapladığı pay düşülerek.
    const maxHeight = Math.max(100, vh - desiredRealTop - TASKBAR_HEIGHT - SAFETY_MARGIN - MODAL_CHROME_HEIGHT);

    // Sadece landscape/portrait GEÇİŞİNDE değişir (sürekli resize'da değil) —
    // modal bileşenleri bunu React `key` olarak kullanıp döndürmede temiz
    // bir remount tetikler (bkz. KÖK SEBEP #4 yukarıda).
    const orientationKey = vw > vh ? 'landscape' : 'portrait';

    return { x, y, maxHeight, orientationKey };
  }, [modalWidth, vw, vh]);
}
