import { useMemo } from 'react';

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
 */
const TASKBAR_HEIGHT = 28;
const SAFETY_MARGIN = 16;
const MODAL_CSS_TOP = 50; // React95'in kendi Modal CSS'indeki sabit "top: 50px"

export function useModalCenterPosition(modalWidth: number, _legacyEstimatedHeight?: number) {
  return useMemo(() => {
    if (typeof window === 'undefined') {
      return { x: 20, y: -30, maxHeight: 400 };
    }

    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const x = Math.max(margin, Math.round((vw - modalWidth) / 2));

    // Gerçek ekran konumu (top) = MODAL_CSS_TOP + y olmalı.
    // İstediğimiz gerçek top: ekranın üst kısmına yakın (vh'nin %4'ü, min 12px).
    const desiredRealTop = Math.max(12, Math.round(vh * 0.04));
    const y = desiredRealTop - MODAL_CSS_TOP;

    // maxHeight: gerçek top'tan TaskBar'a kadar kalan GERÇEK alan.
    const maxHeight = Math.max(120, vh - desiredRealTop - TASKBAR_HEIGHT - SAFETY_MARGIN);

    return { x, y, maxHeight };
  }, [modalWidth]);
}
