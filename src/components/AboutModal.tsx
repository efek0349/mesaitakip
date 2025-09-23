import React from 'react';
import { X, Info, Github, Code, Check } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
    {children}
  </h3>
);

const FeatureItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-3">
    <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-1" />
    <span className="text-gray-700 dark:text-gray-300 text-sm">{children}</span>
  </li>
);

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 h-screen-dynamic">
      <div className="bg-white dark:bg-dark-bg rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-full">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Hakkında</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full active:bg-gray-100 dark:active:bg-gray-600">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* App Info */}
          <div className="text-center space-y-4">
            {/* Logo, Geliştirici ve Kaynak Kodu */}
            <div className="flex justify-between items-center px-4">
              {/* Geliştirici */}
              <a href="https://github.com/efek0349" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                <Github className="w-6 h-6" />
                <span className="text-xs font-medium mt-1">efek0349</span>
              </a>
              
              {/* Logo */}
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto shadow-md overflow-hidden">
                <img src={import.meta.env.BASE_URL + 'app_icon.png'} alt="Mesai Takip App Icon" className="w-full h-full object-cover" />
              </div>

              {/* Kaynak Kodu */}
              <a href="https://github.com/efek0349/mesaitakip" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                <Code className="w-6 h-6" />
                <span className="text-xs font-medium mt-1">Kaynak Kodu</span>
              </a>
            </div>

            {/* Başlık ve Sürüm/Lisans */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Mesai Takip</h3>
              <div className="flex justify-center items-center gap-8 mt-2 text-sm">
                <div className="text-center">
                  <p className="text-gray-500 dark:text-gray-400">Sürüm</p>
                  <p className="font-bold text-gray-800 dark:text-gray-200">1.6.1</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 dark:text-gray-400">Lisans</p>
                  <p className="font-bold text-gray-800 dark:text-gray-200">GPL-3.0</p>
                </div>
              </div>
            </div>
          </div>

          {/* About the App */}
          <div>
            <SectionTitle>Uygulama Hakkında</SectionTitle>
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
              Mesai Takip, günlük mesai saatlerinizi kolayca kaydetmenizi, aylık toplamlarınızı görmenizi ve maaş ayarlarınıza göre net mesai ücretinizi hesaplamanızı sağlayan basit ve etkili bir araçtır.
            </p>
          </div>

          {/* Key Features */}
          <div>
            <SectionTitle>Temel Özellikler</SectionTitle>
            <ul className="space-y-2">
              <FeatureItem>Aylık mesai ve ücret takibi</FeatureItem>
              <FeatureItem>Resmi tatil ve hafta sonu çarpanları</FeatureItem>
              <FeatureItem>Veri yedekleme ve geri yükleme</FeatureItem>
              <FeatureItem>Aylık raporu metin olarak paylaşma</FeatureItem>
              <FeatureItem>Her mesaiye özel not ekleme</FeatureItem>
              <FeatureItem>Mobil uyumlu ve modern tasarım</FeatureItem>
            </ul>
          </div>


        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
          <button onClick={onClose} className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg font-medium active:bg-blue-600">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
