import React from 'react';
import { useTheme, FontScale } from '../hooks/useTheme';
import { Type } from 'lucide-react';

const OPTIONS: { value: FontScale; label: string }[] = [
  { value: 'small', label: 'Küçük' },
  { value: 'medium', label: 'Normal' },
  { value: 'large', label: 'Büyük' },
  { value: 'xlarge', label: 'Çok Büyük' },
];

/**
 * FontSizeSwitcher — uygulamanın kendi iç yazı boyutu ayarı.
 * Android/telefonun sistem "yazı boyutu" ayarından TAMAMEN BAĞIMSIZ çalışır;
 * yalnızca bu uygulama içindeki metinleri büyütür/küçültür (bkz. useTheme.ts'teki
 * FONT_SCALE_PERCENT — <html> kök font-size'ını değiştirir, uygulama genelinde
 * rem tabanlı tüm yazı boyutları buna göre orantılı ölçeklenir).
 */
export const FontSizeSwitcher: React.FC = () => {
  const { fontScale, setFontScale } = useTheme();

  return (
    <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-xl border border-transparent dark:border-white/5 transition-all">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-full bg-blue-500">
          <Type className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-white leading-none">Yazı Boyutu</h3>
          <p className="text-[0.625rem] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight mt-1.5 leading-none">
            Uygulama içi metin boyutu
          </p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFontScale(opt.value)}
            className={`py-2 px-1 rounded-lg text-[0.625rem] font-black uppercase tracking-tight transition-all border-b-2 active:translate-y-0.5 active:border-b-0 ${
              fontScale === opt.value
                ? 'bg-blue-500 text-white border-blue-700 shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};
