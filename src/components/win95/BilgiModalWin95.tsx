import React from 'react';
import { Modal, TitleBar } from '@react95/core';
import { BilgiPanel } from '../BilgiPanel';
import { useModalCenterPosition } from '../../hooks/useModalCenterPosition';

interface BilgiModalWin95Props {
  isOpen: boolean;
  onClose: () => void;
}

export const BilgiModalWin95: React.FC<BilgiModalWin95Props> = ({ isOpen, onClose }) => {
  // NOT: Bu modal içindeki "Gizlilik Politikası" bağlantısı, projeye dahil
  // olmayan statik bir public/privacy.html dosyasını iframe içinde gösteriyor.
  const modalWidth = typeof window !== 'undefined' ? Math.min(400, window.innerWidth - 24) : 340;
  const position = useModalCenterPosition(modalWidth);

  if (!isOpen) return null;

  return (
    <Modal
      id="bilgi-modal"
      title="Bilgi ve Duyurular"
      titleBarOptions={[
        <Modal.Minimize key="minimize" />,
        <TitleBar.Close key="close" onClick={onClose} />,
      ]}
      buttons={[{ value: 'Kapat', onClick: onClose }]}
      dragOptions={{ defaultPosition: position }}
      style={{ width: modalWidth }}
    >
      {/* BilgiPanel kendi içinde scroll edilebilir bir liste — 380px tercih
          edilen yükseklik, ama gerçek hesaplanan maxHeight'ı (TaskBar'a göre)
          AŞMAYACAK şekilde sınırlanıyor (küçük ekranlarda güvenlik payı). */}
      <div style={{ height: Math.min(380, position.maxHeight), overflow: 'hidden' }}>
        <BilgiPanel win95Enabled={true} />
      </div>
    </Modal>
  );
};
