import React, { useState, useEffect } from 'react';
import { toastEmitter, ToastMessage } from '../../utils/toastUtils';

/**
 * ToastWin95 — Toast.tsx'in Win95 görünümü.
 *
 * Tasarım kararı: Win95'te bildirimler "balloon tip" (sistem tepsisi balon
 * bildirimi) şeklinde görünür — küçük bir başlık çubuklu pencere, ekranın
 * üst-ortasında belirir.
 *
 * NOT: React95'in `Frame`/`TitleBar` bileşenleri CSS custom property'lere
 * dayalı ÇOK ince bir "bevel" (kabartma kenarlık) çiziyor — bu, Toast gibi
 * herhangi bir opak modal/pencere yüzeyinin İÇİNDE DEĞİL, doğrudan ekranın
 * üzerinde yüzen bağımsız bir eleman için yeterince belirgin olmuyor;
 * arkaplanla neredeyse aynı tonda kaldığı için "pencere" hissi vermiyordu.
 * Bu yüzden burada klasik Win95 penceresini elle (native `border-style:
 * outset/inset` + belirgin drop-shadow ile) inşa ediyoruz — MonthlyStatsWin95
 * içindeki "Yasal Sınır" popup'ıyla aynı, kanıtlanmış yöntem.
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
        top: 'calc(env(safe-area-inset-top, 0px) + 56px)',
        left: '50%',
        zIndex: 9999,
        transition: 'all 300ms cubic-bezier(0.16,1,0.3,1)',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translate(-50%, 0)' : 'translate(-50%, -16px)',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <div
        style={{
          width: 260,
          backgroundColor: '#ffffff',
          border: '2px outset #dfdfdf',
          boxShadow: '3px 3px 8px rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#000e7a',
            color: '#ffffff',
            padding: '3px 3px 3px 6px',
            fontSize: '0.6875rem',
            fontWeight: 700,
          }}
        >
          <span>{titleByType[toast.type || 'info']}</span>
          <button
            onClick={handleClose}
            aria-label="Kapat"
            style={{
              width: 16,
              height: 14,
              lineHeight: 1,
              fontSize: '0.625rem',
              fontWeight: 700,
              color: '#000000',
              backgroundColor: '#c3c7cb',
              border: '1px outset #dfdfdf',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: 8, backgroundColor: '#ffffff' }}>
          <p style={{ fontSize: '0.6875rem', lineHeight: 1.4, color: '#1a1a1a' }}>{toast.message}</p>
          {toast.action && (
            <button
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                toast.action?.onClick();
                handleClose();
              }}
              style={{
                marginTop: 6,
                fontSize: '0.625rem',
                padding: '3px 10px',
                color: '#1a1a1a',
                backgroundColor: '#c3c7cb',
                border: '2px outset #dfdfdf',
                cursor: 'pointer',
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
