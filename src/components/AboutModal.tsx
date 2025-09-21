import React from 'react';
import { X, Info, Github, Code, Check } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-base font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
    {children}
  </h3>
);

const FeatureItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-3">
    <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-1" />
    <span className="text-gray-700 text-sm">{children}</span>
  </li>
);

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 h-screen-dynamic">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-full">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-800">Hakkında</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full active:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* App Info */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto shadow-md overflow-hidden">
              <img src="/app_icon.png" alt="Mesai Takip App Icon" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Mesai Takip</h3>
              <p className="text-gray-500 text-sm">Sürüm 1.5.0</p>
            </div>
          </div>

          {/* About the App */}
          <div>
            <SectionTitle>Uygulama Hakkında</SectionTitle>
            <p className="text-gray-700 text-sm leading-relaxed">
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

          {/* Developer & Source Code Section */}
          <div>
            <SectionTitle>Geliştirici & Kaynak Kodu</SectionTitle>
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Developer Info */}
              <div className="flex-1">
                <a
                  href="https://github.com/efek0349" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <Github className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium text-base">efek0349</span>
                </a>
              </div>

              {/* Source Code */}
              <div className="flex-1">
                <a
                  href="https://github.com/efek0349/mesaitakip" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <Code className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium text-base">GitHub Deposu</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 p-4">
          <button onClick={onClose} className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg font-medium active:bg-blue-600">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
