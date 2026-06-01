import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';

export const ThemeSwitcher: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="bg-gray-100 dark:bg-gray-700/50 p-4 rounded-xl border border-transparent dark:border-white/5 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full transition-colors duration-300 ${isDark ? 'bg-indigo-600' : 'bg-yellow-400'}`}>
                {isDark ? <Moon className="w-5 h-5 text-white" /> : <Sun className="w-5 h-5 text-white" />}
            </div>
            <div>
                <h3 className="font-semibold text-gray-800 dark:text-white leading-none">Görünüm</h3>
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight mt-1.5 leading-none">
                    {isDark ? 'KOYU MOD AKTİF' : 'AÇIK MOD AKTİF'}
                </p>
            </div>
        </div>
        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'Açık moda geç' : 'Koyu moda geç'}
          aria-pressed={isDark}
          className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 ${isDark ? 'bg-indigo-600' : 'bg-gray-300'}`}
        >
          <span
            className={`inline-block w-4 h-4 transform bg-white rounded-full shadow-sm transition-transform duration-300 ${isDark ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>
    </div>
  );
};
