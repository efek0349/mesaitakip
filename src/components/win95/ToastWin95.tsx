import React, { useState, useEffect } from 'react';
import { Frame, TitleBar, Button } from '@react95/core';
import { toastEmitter, ToastMessage } from '../../utils/toastUtils';

/**
 * ToastWin95 — Toast.tsx'in Win95 görünümü.
 *
 * Tasarım kararı: Win95'te bildirimler "balloon tip" (sistem tepsisi balon
 * bildirimi) şeklinde görünür — küçük bir başlık çubuklu pencere, sağ alt
 * köşeden yukarı doğru. Tailwind versiyonundaki renkli gradient toast'lar
 * yerine her tür için sade bir başlık metni kullanılıyor (renk paleti
 * Win95'in flat estetiğine uymadığı için arka plan her zaman standart
 * pencere yüzeyi, sadece başlık metni türe göre değişiyor).
 */
export const ToastWin95: React.FC = () => {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let clearTimer: ReturnType<typeof setTimeout>;

    const unsubscribe = toastEmitter.subscribe((newToast) => {
      clearTimeout(timer);
      clearTimeout(clearTimer);

      setToast(newToast);
      setIsVisible(true);

      if (!newToast.isPersistent) {
        timer = setTimeout(() => {
          setIsVisible(false);
          clearTimer = setTimeout(() => setToast(null), 300);
        }, newToast.duration || 3000);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(timer);
      clearTimeout(clearTimer);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => setToast(null), 300);
  };

  if (!toast) return null;

  const titleByType: Record<string, string> = {
    success: 'Başarılı',
    error: 'Hata',
    update: 'Bilgi',
    info: 'Bilgi',
    custom: 'Bildirim',
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 48,
        right: 12,
        zIndex: 9999,
        transition: 'all 300ms cubic-bezier(0.16,1,0.3,1)',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <Frame boxShadow="out" style={{ width: 260 }}>
        <TitleBar title={titleByType[toast.type || 'info']}>
          <TitleBar.Close onClick={handleClose} />
        </TitleBar>
        <div style={{ padding: 8 }}>
          <p style={{ fontSize: '0.6875rem', lineHeight: 1.4, color: '#1a1a1a' }}>{toast.message}</p>
          {toast.action && (
            <Button
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                toast.action?.onClick();
                handleClose();
              }}
              style={{ marginTop: 6, fontSize: '0.625rem', padding: '3px 8px', color: '#1a1a1a' }}
            >
              {toast.action.label}
            </Button>
          )}
        </div>
      </Frame>
    </div>
  );
};
