import React from 'react';
import { X, User, Code, Calendar, Heart } from 'lucide-react';
import { useAndroidSafeArea } from '../hooks/useAndroidSafeArea';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const { getModalStyle, getButtonContainerStyle, isAndroid } = useAndroidSafeArea();
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div 
        className={`
          bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-y-auto
          ${isAndroid ? 'modal-android android-safe-modal' : 'max-h-[85vh] mb-safe'}
        `}
        style={isAndroid ? getModalStyle() : undefined}
      >
        {/* Sabit Header */}
        <div className="sticky top-0 bg-white z-10 border-b border-gray-100 p-4 sm:p-6 pb-3 sm:pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Hakkında</h2>
            </div>
            <button
              onClick={onClose}
              className="p-3 rounded-lg active:bg-gray-100 transition-colors touch-manipulation"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 pt-2 sm:pt-3">
          <div className="space-y-6">
            {/* App Info */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Mesai Takip</h3>
              <p className="text-gray-600 text-sm">
                Mesai saatlerinizi kolayca takip edin ve aylık raporlarınızı alın
              </p>
            </div>

            {/* Developer Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <Code className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-gray-800">Geliştirici</h4>
              </div>
              <div className="space-y-2">
                <p className="text-gray-700">
                  <span className="font-medium">GitHub:</span> efek0349
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">E-posta:</span> kndmrefe@gmail.com
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Geliştirme Yılı:</span> 2025
                </p>
              </div>
              
              <div className="mt-4 space-y-2">
                <a 
                  href="https://github.com/efek0349" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors text-sm"
                >
                  <Code className="w-4 h-4" />
                  <span>GitHub Profili</span>
                </a>
                <a 
                  href="https://github.com/efek0349/mesaitakip" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors text-sm"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Proje Kaynak Kodu</span>
                </a>
              </div>
            </div>

            {/* Features */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-semibold text-gray-800 mb-3">Teknoloji & Özellikler</h4>
              <div className="mb-3 text-sm text-gray-600">
                <span className="font-medium">Teknoloji:</span> React + TypeScript + Tailwind CSS
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Aylık mesai takibi
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Mesai ücreti hesaplama
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Resmi tatil desteği
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Veri yedekleme ve geri yükleme
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Rapor paylaşma
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Mobil uyumlu tasarım
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  Android APK desteği
                </li>
              </ul>
            </div>

            {/* Version */}
            <div className="text-center">
              <p className="text-xs text-gray-400 mt-2">Sürüm 1.4.0</p>
            </div>
          </div>

          <div 
            className={`
              mt-6
              ${isAndroid ? 'android-safe-button' : 'pb-safe'}
            `}
            style={isAndroid ? getButtonContainerStyle() : undefined}
          >
            <button
              onClick={onClose}
              className={`
                w-full px-4 bg-blue-500 text-white rounded-lg font-medium 
                active:bg-blue-600 transition-colors touch-manipulation
                ${isAndroid ? 'android-button' : 'py-4 min-h-[48px]'}
              `}
            >
              Tamam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
