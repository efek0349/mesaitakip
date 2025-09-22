import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';

export const ThemeSwitcher: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${theme === 'dark' ? 'bg-yellow-400' : 'bg-gray-500'}`}>
                {theme === 'dark' ? <Sun className="w-5 h-5 text-white" /> : <Moon className="w-5 h-5 text-white" />}
            </div>
            <div>
                <h3 className="font-semibold text-gray-800 dark:text-white">Koyu Mod</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    {theme === 'dark' ? 'Açık' : 'Kapalı'}
                </p>
            </div>
        </div>
        <button
          onClick={toggleTheme}
          className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}`}
        >
          <span
            className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-300 ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>
    </div>
  );
};
