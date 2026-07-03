import React from 'react';
import { Frame, Button } from '@react95/core';
import { useWordSearchGameLogic, WORD_SEARCH_GRID_SIZE } from '../../hooks/useWordSearchGameLogic';

const WordSearchGameWin95: React.FC = () => {
  const {
    grid, locations, selectedCells, isSelecting, foundWords,
    gridRef, containerSize,
    foundCellKeys, selectedCellKeys,
    startNewGame, handleMouseDown, handleTouchStart, getCellCenter,
  } = useWordSearchGameLogic();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 8, width: '100%', maxWidth: 320, userSelect: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 8 }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>KELİME BULMACA</span>
        <Button onClick={startNewGame} style={{ fontSize: '0.5625rem', padding: '3px 8px' }}>
          ⟲ YENİ
        </Button>
      </div>

      <Frame boxShadow="in" style={{ padding: 2 }}>
        <div
          ref={gridRef}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${WORD_SEARCH_GRID_SIZE}, 1fr)`,
            position: 'relative',
            touchAction: 'none',
          }}
        >
          {isSelecting && selectedCells.length > 0 && (
            <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10, width: '100%', height: '100%' }}>
              {(() => {
                const startPos = getCellCenter(selectedCells[0][0], selectedCells[0][1]);
                const endPos = getCellCenter(selectedCells[selectedCells.length - 1][0], selectedCells[selectedCells.length - 1][1]);
                return (
                  <g>
                    <line
                      x1={startPos.x}
                      y1={startPos.y}
                      x2={endPos.x}
                      y2={endPos.y}
                      stroke="rgba(0, 14, 122, 0.55)"
                      strokeWidth={containerSize.width / WORD_SEARCH_GRID_SIZE * 0.8}
                      strokeLinecap="round"
                    />
                    {selectedCells.length > 1 && (
                      <circle
                        cx={endPos.x}
                        cy={endPos.y}
                        r={containerSize.width / WORD_SEARCH_GRID_SIZE * 0.4}
                        fill="rgba(0, 14, 122, 0.85)"
                      />
                    )}
                  </g>
                );
              })()}
            </svg>
          )}

          {grid.map((row, rIndex) => (
            row.map((letter, cIndex) => {
              const cellKey = `${rIndex}-${cIndex}`;
              const isSelected = selectedCellKeys.has(cellKey);
              const isFound = foundCellKeys.has(cellKey);

              let bg = '#ffffff';
              let color = '#000000';
              if (isSelected) { bg = '#000e7a'; color = '#ffffff'; }
              else if (isFound) { bg = '#15803d'; color = '#ffffff'; }

              return (
                <div
                  key={cellKey}
                  onMouseDown={() => handleMouseDown(rIndex, cIndex)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleTouchStart(rIndex, cIndex);
                  }}
                  style={{
                    width: 22, height: 22,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.625rem', fontWeight: 700,
                    cursor: 'pointer',
                    backgroundColor: bg,
                    color,
                    border: '0.5px solid #868a8e',
                  }}
                >
                  {letter}
                </div>
              );
            })
          ))}
        </div>
      </Frame>

      <div style={{ marginTop: 8, width: '100%' }}>
        <div style={{ fontSize: '0.625rem', fontWeight: 700, marginBottom: 4 }}>BULUNACAK KELİMELER:</div>
        {/* Liste daha sıkı/yakınlaştırılmış, pencere
            dikey olarak kısa. 2 sütun → 3 sütun, gap/padding/font
            küçültüldü. */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
          {locations.map((loc, index) => {
            const isFound = foundWords.includes(loc.word);
            return (
              <Frame
                key={index}
                boxShadow="in"
                style={{
                  padding: '2px 4px',
                  fontSize: '0.5625rem',
                  textAlign: 'center',
                  textDecoration: isFound ? 'line-through' : 'none',
                  opacity: isFound ? 0.5 : 1,
                }}
              >
                {loc.word}
              </Frame>
            );
          })}
        </div>
      </div>

      {foundWords.length === locations.length && locations.length > 0 && (
        <Frame boxShadow="out" style={{ marginTop: 10, padding: 8, width: '100%', textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>✓ Harika! Tüm kelimeleri buldun!</span>
        </Frame>
      )}
    </div>
  );
};

export default WordSearchGameWin95;
