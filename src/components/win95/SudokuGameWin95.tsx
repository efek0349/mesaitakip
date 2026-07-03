import React from 'react';
import { Frame, Button } from '@react95/core';
import { useSudokuGameLogic } from '../../hooks/useSudokuGameLogic';

const SudokuGameWin95: React.FC = () => {
  const {
    initialGrid, grid, solution,
    selectedCell, hintCell, gameOver,
    startNewGame, handleCellClick, handleNumberInput, handleErase,
    handleTouchStart,
  } = useSudokuGameLogic();

  if (grid.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 8, width: '100%', maxWidth: 320 }} onTouchStart={handleTouchStart}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 8 }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>SUDOKU</span>
        <Button onClick={startNewGame} style={{ fontSize: '0.5625rem', padding: '3px 8px' }} title="Yeni Oyun">
          ⟲ YENİ
        </Button>
      </div>

      <Frame boxShadow="in" style={{ padding: 2 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)' }}>
          {grid.map((row, rIndex) => (
            row.map((cell, cIndex) => {
              const isInitial = initialGrid[rIndex][cIndex] !== null;
              const isSelected = selectedCell?.[0] === rIndex && selectedCell?.[1] === cIndex;
              const isHint = hintCell?.[0] === rIndex && hintCell?.[1] === cIndex;
              const isWrong = cell !== null && !isInitial && cell !== solution[rIndex][cIndex];

              const isInSameRow = selectedCell?.[0] === rIndex;
              const isInSameCol = selectedCell?.[1] === cIndex;
              const isInSameBox = selectedCell &&
                Math.floor(selectedCell[0] / 3) === Math.floor(rIndex / 3) &&
                Math.floor(selectedCell[1] / 3) === Math.floor(cIndex / 3);

              let bg = '#ffffff';
              if (isSelected) bg = '#000e7a';
              else if (isHint) bg = '#16a34a';
              else if ((isInSameRow || isInSameCol || isInSameBox) && !isInitial) bg = '#e6e6e6';
              else if (isInitial) bg = '#d2d2d2';

              const color = isSelected || isHint ? '#ffffff' : isWrong ? '#dc2626' : '#000000';

              return (
                <div
                  key={`${rIndex}-${cIndex}`}
                  onClick={() => handleCellClick(rIndex, cIndex)}
                  style={{
                    width: 30, height: 30,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8125rem', fontWeight: 700,
                    cursor: 'pointer',
                    backgroundColor: bg,
                    color,
                    borderRight: cIndex % 3 === 2 && cIndex !== 8 ? '2px solid #000' : '1px solid #868a8e',
                    borderBottom: rIndex % 3 === 2 && rIndex !== 8 ? '2px solid #000' : '1px solid #868a8e',
                  }}
                >
                  {cell || ''}
                </div>
              );
            })
          ))}
        </div>
      </Frame>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, marginTop: 10, width: '100%' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <Button key={num} onClick={() => handleNumberInput(num)} style={{ padding: '6px 0', fontSize: '0.75rem', fontWeight: 700 }}>
            {num}
          </Button>
        ))}
        <Button onClick={handleErase} style={{ padding: '6px 0', fontSize: '0.625rem', fontWeight: 700 }}>
          Sil
        </Button>
      </div>

      {gameOver && (
        <Frame boxShadow="out" style={{ marginTop: 10, padding: 8, width: '100%', textAlign: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>✓ Tebrikler! Çözüldü!</span>
        </Frame>
      )}
    </div>
  );
};

export default SudokuGameWin95;
