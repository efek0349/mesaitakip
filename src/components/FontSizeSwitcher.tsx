import React from 'react';
import { useTheme, FontScale, FONT_SCALE_PERCENT } from '../hooks/useTheme';
import { Type } from 'lucide-react';

const SCALE_ORDER: FontScale[] = ['small', 'medium', 'large', 'xlarge'];

const LABELS: Record<FontScale, string> = {
  small: 'Küçük',
  medium: 'Normal',
  large: 'Büyük',
  xlarge: 'Çok Büyük',
};

/**
 * FontSizeSwitcher — uygulamanın kendi iç yazı boyutu ayarı.
 * Android/telefonun sistem "yazı boyutu" ayarından TAMAMEN BAĞIMSIZ çalışır;
 * yalnızca bu uygulama içindeki metinleri büyütür/küçültür (bkz. useTheme.ts'teki
 * FONT_SCALE_PERCENT — <html> kök font-size'ını değiştirir, uygulama genelinde
 * rem tabanlı tüm yazı boyutları buna göre orantılı ölçeklenir).
 *
 * TASARIM: Eskiden 4 küçük buton yan yanaydı (KÜÇÜK/NORMAL/BÜYÜK/ÇOK BÜYÜK).
 * Bunun yerine iOS'un "Yazı Tipi Boyutu" ayarına benzer bir sürgü (slider)
 * kullanıyoruz: üstte seçilen boyutta canlı bir "Aa" önizlemesi, altında da
 * küçükten büyüğe artan "A" harfleriyle işaretlenmiş bir sürgü. Sürüklemek
 * tek tek butonlara basmaktan daha doğal ve boyutlar arasındaki farkı direkt
 * gözle görmeyi sağlıyor.
 */
export const FontSizeSwitcher: React.FC = () => {
  const { fontScale, setFontScale } = useTheme();
  const activeIndex = SCALE_ORDER.indexOf(fontScale);
  const fillPercent = (activeIndex / (SCALE_ORDER.length - 1)) * 100;

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

      {/* Canlı önizleme */}
      <div className="bg-white dark:bg-gray-800 rounded-lg py-3 px-4 mb-4 text-center border border-gray-200 dark:border-gray-700 overflow-hidden">
        <span
          className="font-black text-gray-800 dark:text-white transition-all duration-150 inline-block"
          style={{ fontSize: `${14 * (FONT_SCALE_PERCENT[fontScale] / 100)}px` }}
        >
          Aa Örnek Yazı
        </span>
      </div>

      {/* Sürgü */}
      <div className="px-1">
        <input
          type="range"
          min={0}
          max={SCALE_ORDER.length - 1}
          step={1}
          value={activeIndex}
          onChange={(e) => setFontScale(SCALE_ORDER[Number(e.target.value)])}
          className="font-size-slider w-full h-7 cursor-pointer touch-action-none"
          style={{ ['--font-size-slider-fill' as string]: `${fillPercent}%` }}
          aria-label="Yazı boyutu"
        />
        <div className="flex justify-between items-end px-0.5 -mt-1">
          {SCALE_ORDER.map((s, i) => (
            <button
              key={s}
              onClick={() => setFontScale(s)}
              className={`flex flex-col items-center gap-1 py-1 transition-colors ${
                fontScale === s ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              <span className="font-black leading-none" style={{ fontSize: `${11 + i * 3}px` }} aria-hidden="true">A</span>
              <span className="text-[0.5rem] font-bold uppercase tracking-tight whitespace-nowrap">{LABELS[s]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
