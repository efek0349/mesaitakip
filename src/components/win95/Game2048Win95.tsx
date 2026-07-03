import React from 'react';
import { Frame, Button } from '@react95/core';
import { useGame2048Logic } from '../../hooks/useGame2048Logic';

/**
 * TileWin95 — Win95 estetiğine uygun taş rengi paleti.
 * Tailwind versiyonundaki gradient/parlak renkler yerine düz, sınırlı
 * bir Win95-uyumlu palet (gri tonları + birkaç vurgu rengi).
 */
const TileWin95: React.FC<{ value: number }> = ({ value }) => {
  const getColors = (val: number): { bg: string; text: string } => {
    switch (val) {
      case 2: return { bg: '#e6e6e6', text: '#000' };
      case 4: return { bg: '#d2d2d2', text: '#000' };
      case 8: return { bg: '#c3c7cb', text: '#000' };
      case 16: return { bg: '#fb923c', text: '#fff' };
      case 32: return { bg: '#f97316', text: '#fff' };
      case 64: return { bg: '#dc2626', text: '#fff' };
      case 128: return { bg: '#facc15', text: '#000' };
      case 256: return { bg: '#eab308', text: '#fff' };
      case 512: return { bg: '#ca8a04', text: '#fff' };
      case 1024: return { bg: '#818cf8', text: '#fff' };
      case 2048: return { bg: '#4f46e5', text: '#fff' };
      default: return { bg: '#868a8e', text: '#868a8e' };
    }
  };

  const { bg, text } = getColors(value);

  return (
    <Frame
      boxShadow={value > 0 ? 'out' : 'in'}
      style={{
        width: 48, height: 48,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1rem', fontWeight: 700,
        backgroundColor: bg, color: text,
      }}
    >
      {value > 0 ? value : ''}
    </Frame>
  );
};

const Game2048Win95: React.FC = () => {
  const { grid, score, gameOver, hint, move, restartGame, handleTouchStart } = useGame2048Logic();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 8, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: 8 }}>
        <Frame boxShadow="in" style={{ padding: '4px 8px', fontSize: '0.75rem', fontWeight: 700 }}>
          SKOR: {score}
        </Frame>
        <Button onClick={restartGame} style={{ fontSize: '0.5625rem', padding: '3px 8px' }} title="Yeniden Başlat">
          ⟲ YENİDEN
        </Button>
      </div>

      <Frame boxShadow="in" style={{ padding: 6 }}>
        <div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}
          onTouchStart={handleTouchStart}
        >
          {grid.map((value, index) => (
            <TileWin95 key={index} value={value} />
          ))}
        </div>
      </Frame>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 10, gap: 4 }}>
        <Button onClick={() => move('up')} style={{ width: 48, padding: '8px 0' }}>▲</Button>
        <div style={{ display: 'flex', gap: 4 }}>
          <Button onClick={() => move('left')} style={{ width: 48, padding: '8px 0' }}>◀</Button>
          <Button onClick={() => move('down')} style={{ width: 48, padding: '8px 0' }}>▼</Button>
          <Button onClick={() => move('right')} style={{ width: 48, padding: '8px 0' }}>▶</Button>
        </div>
      </div>

      {hint && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ color: 'white', fontSize: '2.25rem', fontWeight: 700 }}>
            {hint === 'up' && '↑'}
            {hint === 'down' && '↓'}
            {hint === 'left' && '←'}
            {hint === 'right' && '→'}
          </div>
        </div>
      )}

      {gameOver && (
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Frame boxShadow="out" style={{ padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 10 }}>Oyun Bitti!</div>
            <Button onClick={restartGame} style={{ fontSize: '0.6875rem', padding: '6px 12px' }}>
              ⟲ Yeniden Oyna
            </Button>
          </Frame>
        </div>
      )}
    </div>
  );
};

export default Game2048Win95;
