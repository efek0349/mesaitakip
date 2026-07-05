import React, { useState, lazy, Suspense } from 'react';
import { Modal, TitleBar, Tabs, Tab, Frame, Button } from '@react95/core';
import { Browser } from '@capacitor/browser';
import { APP_VERSION } from '../../constants';
import { useModalCenterPosition } from '../../hooks/useModalCenterPosition';

const Game2048 = lazy(() => import('../Game2048'));
const SudokuGame = lazy(() => import('../SudokuGame'));
const WordSearchGame = lazy(() => import('../WordSearchGame'));

interface AboutModalWin95Props {
  isOpen: boolean;
  onClose: () => void;
}

type GameType = '2048' | 'sudoku' | 'wordsearch';

/**
 * AboutModalWin95 — Hakkında + Oyunlar sekmelerinin Win95 görünümü.
 *
 * Not: 'Github' ikonu lucide-react'in kurulu sürümünde (1.21.0) mevcut
 * değil (marka ikonları ayrı bir pakete taşınmış) — gerçek tip kontrolüyle
 * tespit edildi. Win95 versiyonunda ikon yerine düz metin link kullanıldı,
 * bu zaten Win95'in "ikonsuz metin link" estetiğine daha uygun.
 */
export const AboutModalWin95: React.FC<AboutModalWin95Props> = ({ isOpen, onClose }) => {
  const [activeGame, setActiveGame] = useState<GameType>('2048');

  const openLink = async (url: string) => {
    try {
      await Browser.open({ url });
    } catch (error) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const position = useModalCenterPosition(340);

  if (!isOpen) return null;

  return (
    <Modal
      key={`about-modal-${position.orientationKey}`}
      id="about-modal"
      title="Mesai Takip Hakkında"
      titleBarOptions={[
        <Modal.Minimize key="minimize" />,
        <TitleBar.Close key="close" onClick={onClose} />,
      ]}
      buttons={[{ value: 'Kapat', onClick: onClose }]}
      dragOptions={{ defaultPosition: position }}
      style={{ width: 340 }}
    >
      <div style={{ padding: 4, maxHeight: position.maxHeight, overflowY: 'auto' }}>
        <Tabs defaultActiveTab="Hakkında">
          <Tab title="Hakkında">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 6 }}>
              <Frame boxShadow="in" style={{ padding: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>v{APP_VERSION}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => openLink('https://github.com/efek0349')} style={{ fontSize: '0.625rem', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
                      GitHub
                    </button>
                    <button onClick={() => openLink('https://github.com/efek0349/mesaitakip')} style={{ fontSize: '0.625rem', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
                      Kaynak Kodu
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Frame boxShadow="out" style={{ padding: '2px 8px', fontSize: '0.5625rem' }}>Lisans: GPL-3.0</Frame>
                  <Frame boxShadow="out" style={{ padding: '2px 8px', fontSize: '0.5625rem' }}>Durum: Aktif</Frame>
                </div>
              </Frame>

              <Frame boxShadow="in" style={{ padding: 8 }}>
                <p style={{ fontSize: '0.6875rem', fontStyle: 'italic', lineHeight: 1.4 }}>
                  "Mesai Takip, günlük çalışma saatlerinizi kolayca yönetmeniz ve kazancınızı anlık olarak takip etmeniz için tasarlanmış modern bir yardımcıdır."
                </p>
              </Frame>

              <Frame boxShadow="in" style={{ padding: 8 }}>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 4 }}>TEMEL ÖZELLİKLER</div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[
                    'Aylık mesai ve ücret takibi',
                    'Resmi tatil ve hafta sonu katsayıları',
                    'Bulut yedekleme ve veri güvenliği',
                    'Detaylı raporlama (TXT, CSV)',
                    'Kıdem tazminatı hesaplama',
                    'Kişiselleştirilebilir modern arayüz',
                  ].map((f, i) => (
                    <li key={i} style={{ fontSize: '0.625rem', display: 'flex', gap: 4 }}>
                      <span>✓</span><span>{f}</span>
                    </li>
                  ))}
                </ul>
              </Frame>
            </div>
          </Tab>

          <Tab title="Oyunlar">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 6 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <Button
                  onClick={() => setActiveGame('2048')}
                  style={{
                    flex: 1, fontSize: '0.5625rem', padding: '4px 2px',
                    backgroundColor: activeGame === '2048' ? '#000e7a' : undefined,
                    color: activeGame === '2048' ? '#ffffff' : '#1a1a1a',
                  }}
                >
                  2048
                </Button>
                <Button
                  onClick={() => setActiveGame('sudoku')}
                  style={{
                    flex: 1, fontSize: '0.5625rem', padding: '4px 2px',
                    backgroundColor: activeGame === 'sudoku' ? '#000e7a' : undefined,
                    color: activeGame === 'sudoku' ? '#ffffff' : '#1a1a1a',
                  }}
                >
                  SUDOKU
                </Button>
                <Button
                  onClick={() => setActiveGame('wordsearch')}
                  style={{
                    flex: 1, fontSize: '0.5625rem', padding: '4px 2px',
                    backgroundColor: activeGame === 'wordsearch' ? '#000e7a' : undefined,
                    color: activeGame === 'wordsearch' ? '#ffffff' : '#1a1a1a',
                  }}
                >
                  KELİME
                </Button>
              </div>

              <Frame boxShadow="in" style={{ padding: 4, minHeight: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Suspense fallback={<p style={{ fontSize: '0.6875rem' }}>Yükleniyor...</p>}>
                  {activeGame === '2048' && <Game2048 win95Enabled={true} />}
                  {activeGame === 'sudoku' && <SudokuGame win95Enabled={true} />}
                  {activeGame === 'wordsearch' && <WordSearchGame win95Enabled={true} />}
                </Suspense>
              </Frame>
            </div>
          </Tab>
        </Tabs>
      </div>
    </Modal>
  );
};
