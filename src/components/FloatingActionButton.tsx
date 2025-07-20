import React from 'react';
import { Plus } from 'lucide-react';

interface FloatingActionButtonProps {
  onClick: () => void;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg active:bg-blue-600 active:scale-95 transition-all duration-200 flex items-center justify-center z-40 touch-manipulation"
    >
      <Plus className="w-6 h-6" />
    </button>
  );
};