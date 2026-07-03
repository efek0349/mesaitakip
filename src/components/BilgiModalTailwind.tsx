import React from 'react';
import { X } from 'lucide-react';
import { BilgiPanel } from './BilgiPanel';
import { useAndroidSafeArea } from '../hooks/useAndroidSafeArea';

interface BilgiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BilgiModalTailwind: React.FC<BilgiModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    modalSafeHeight,
    modalSafePadding,
    isAndroid,
  } = useAndroidSafeArea();

  if (!isOpen) return null;

  return (
    <div
      className="
        fixed
        inset-0
        z-[60]
        flex
        items-center
        sm:items-center
        justify-center
        bg-black/50
        p-2
        animate-in
        fade-in
        duration-200
      "
    >
      <div
        style={{
          height: `${modalSafeHeight}vh`,
          maxHeight: `${modalSafeHeight}vh`,
          marginBottom: isAndroid ? `${modalSafePadding}px` : undefined,
        }}
        className="
          w-full
          max-w-md
          bg-white
          dark:bg-gray-900
          rounded-2xl
          sm:rounded-2xl
          shadow-2xl
          flex
          flex-col
          overflow-hidden
          relative
        "
      >
        {/* Başlık Alanı */}
        <div
          className="
            flex
            items-center
            justify-between
            px-4
            py-3
            border-b
            border-gray-200
            dark:border-gray-700
            bg-white
            dark:bg-gray-900
            shrink-0
          "
        >
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">
            Bilgi ve Duyurular
          </h2>

          <button
            onClick={onClose}
            className="
              p-2
              rounded-full
              text-gray-500
              dark:text-gray-400
              hover:bg-gray-100
              dark:hover:bg-gray-800
              active:scale-95
              transition-all
            "
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* İçerik */}
        <div className="flex-1 overflow-hidden">
          <BilgiPanel win95Enabled={false} />
        </div>
      </div>
    </div>
  );
};
