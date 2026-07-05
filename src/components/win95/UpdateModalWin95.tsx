import React from 'react';
import { Modal, TitleBar, Frame } from '@react95/core';
import { Capacitor } from '@capacitor/core';
import { useModalCenterPosition } from '../../hooks/useModalCenterPosition';

interface UpdateModalWin95Props {
  isOpen: boolean;
  onClose: () => void;
  version: string;
  onDownload: () => void;
}

const PLATFORM = Capacitor.getPlatform();

/**
 * UpdateModalWin95 — güncelleme bildirimi diyalogunun Win95 görünümü.
 * Klasik "Windows Update" diyalog penceresi hissi: gerçek Modal, ikon yok
 * (Win95 ikon seti kullanmıyoruz), düz metin + iki buton.
 */
export const UpdateModalWin95: React.FC<UpdateModalWin95Props> = ({ isOpen, onClose, version, onDownload }) => {
  const position = useModalCenterPosition(300);

  if (!isOpen) return null;

  const platformNote = PLATFORM === 'ios'
    ? '.ipa uzantılı dosyayı indirip kurmanız yeterlidir.'
    : PLATFORM === 'android'
      ? '.apk uzantılı dosyayı indirip kurmanız yeterlidir.'
      : 'Sayfayı yenileyerek en güncel sürümü kullanmaya başlayabilirsiniz.';

  return (
    <Modal
      key={`update-modal-${position.orientationKey}`}
      id="update-modal"
      title="Yeni Güncelleme!"
      titleBarOptions={[
        <Modal.Minimize key="minimize" />,
        <TitleBar.Close key="close" onClick={onClose} />,
      ]}
      buttons={[
        { value: 'Daha Sonra', onClick: onClose },
        { value: 'Şimdi İndir', onClick: onDownload },
      ]}
      dragOptions={{ defaultPosition: position }}
      style={{ width: 300 }}
    >
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Frame boxShadow="in" style={{ padding: 8 }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: 4 }}>
            Versiyon v{version} mevcut
          </p>
          <p style={{ fontSize: '0.625rem', marginBottom: 6 }}>
            Uygulamanın yeni sürümü hazır! En son özellikleri ve iyileştirmeleri almak için hemen güncelleyin.
          </p>
          <p style={{ fontSize: '0.5625rem', fontStyle: 'italic' }}>
            ℹ {platformNote}
          </p>
        </Frame>
      </div>
    </Modal>
  );
};
