import React, { useState, useCallback, lazy, Suspense } from 'react';
import { X, Info, Github, Code, Check, Gamepad2, Sparkles, Hash, Type } from 'lucide-react';
import { Browser } from '@capacitor/browser';
import { APP_VERSION } from '../constants';
import { TabButton } from './TabButton';
import { useAndroidSafeArea } from '../hooks/useAndroidSafeArea';

const Game2048 = lazy(() => import('./Game2048'));
const SudokuGame = lazy(() => import('./SudokuGame'));
const WordSearchGame = lazy(() => import('./WordSearchGame'));

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AboutTab = 'about' | 'games';
type GameType = '2048' | 'sudoku' | 'wordsearch';

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1 mb-1.5 leading-none">
    {children}
  </h3>
);

const FeatureItem: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-center gap-2 py-0.5 px-0.5 transition-colors group">
    <div className="flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center bg-blue-50 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
      <Check className="w-2 h-2 font-black" />
    </div>
    <span className="text-gray-700 dark:text-gray-300 text-[10px] font-bold tracking-tight leading-none">{children}</span>
  </li>
);

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<AboutTab>('about');
  const [activeGame, setActiveGame] = useState<GameType>('2048');
  const { modalStyle, buttonContainerStyle } = useAndroidSafeArea();

  const openLink = useCallback(async (url: string) => {
    try {
      await Browser.open({ url });
    } catch (error) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-hidden animate-in fade-in duration-300">
      <div 
        className="bg-gray-50 dark:bg-dark-bg rounded-[32px] w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] border border-white/10 overflow-hidden transition-all duration-300"
        style={modalStyle}
      >
        
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 pb-1">
          <div className="flex items-center gap-2">
            <div className="relative p-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl shadow-[0_4px_10px_-2px_rgba(59,130,246,0.5),inset_0_1px_2px_rgba(255,255,255,0.4)] border-b-2 border-blue-800 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
              <Info className="w-4 h-4 relative z-10" />
            </div>
            <h2 className="text-lg font-black text-gray-800 dark:text-white tracking-tight uppercase leading-none">Mesai Takip</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-xl bg-white dark:bg-gray-800 shadow-md active:scale-90 transition-all border border-gray-100 dark:border-gray-800"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Tab Navigation - 3D Container */}
        <div className="flex-shrink-0 p-3 pt-1">
          <div className="grid grid-cols-2 gap-2 bg-gray-200/50 dark:bg-gray-900/50 p-1.5 rounded-[20px] shadow-inner border border-gray-200/50 dark:border-gray-700/50">
            <TabButton 
              id="about" 
              label="Hakkında" 
              icon={Info} 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              variant="horizontal"
              fontSize="text-[10px]"
              roundedSize="xl"
            />
            <TabButton 
              id="games" 
              label="Oyunlar" 
              icon={Gamepad2} 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              variant="horizontal"
              fontSize="text-[10px]"
              roundedSize="xl"
            />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 pt-0 custom-scrollbar">
          
          <div className={`space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200 ${activeTab === 'about' ? 'block' : 'hidden'}`}>
            {/* App Info Card - 3D Bubbled */}
            <div className="bg-gradient-to-br from-blue-500 to-indigo-700 rounded-[24px] p-4 text-white shadow-[0_10px_25px_-5px_rgba(59,130,246,0.4),inset_0_2px_4px_rgba(255,255,255,0.3)] border-b-4 border-indigo-900 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
              <div className="absolute -right-6 -top-6 opacity-10 rotate-12">
                <Sparkles size={80} />
              </div>
              
              <div className="flex justify-between items-center relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white p-1 shadow-2xl rotate-[-3deg] border-b-2 border-gray-200">
                    <img 
                      src={import.meta.env.BASE_URL + 'app_icon.png'} 
                      alt="Mesai Takip" 
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  <div>
                    <p className="text-blue-100 text-[9px] font-black opacity-90 uppercase tracking-widest mb-0.5 leading-none">v{APP_VERSION}</p>
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => openLink('https://github.com/efek0349')}
                        className="p-1.5 bg-white/15 hover:bg-white/25 rounded-lg transition-all active:scale-90 border border-white/10"
                        title="GitHub Profil"
                      >
                        <Github size={13} />
                      </button>
                      <button 
                        onClick={() => openLink('https://github.com/efek0349/mesaitakip')}
                        className="p-1.5 bg-white/15 hover:bg-white/25 rounded-lg transition-all active:scale-90 border border-white/10"
                        title="Kaynak Kodu"
                      >
                        <Code size={13} />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <div className="py-1 px-2.5 bg-black/10 rounded-lg backdrop-blur-md border border-white/10 flex flex-col items-center shadow-inner">
                    <span className="text-[7px] font-black uppercase opacity-60 leading-none mb-0.5">Lisans</span>
                    <span className="text-[10px] font-black leading-tight">GPL-3.0</span>
                  </div>
                  <div className="py-1 px-2.5 bg-black/10 rounded-lg backdrop-blur-md border border-white/10 flex flex-col items-center shadow-inner">
                    <span className="text-[7px] font-black uppercase opacity-60 leading-none mb-0.5">Durum</span>
                    <span className="text-[10px] font-black leading-tight">Aktif</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <section className="space-y-1.5">
              <SectionTitle>Uygulama Hakkında</SectionTitle>
              <div className="bg-white dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 p-3.5 shadow-inner">
                <p className="text-gray-700 dark:text-gray-300 text-[11px] leading-relaxed font-bold italic opacity-80">
                  "Mesai Takip, günlük çalışma saatlerinizi kolayca yönetmeniz ve kazancınızı anlık olarak takip etmeniz için tasarlanmış modern bir yardımcıdır."
                </p>
              </div>
            </section>

            {/* Key Features */}
            <section className="space-y-1.5">
              <SectionTitle>Temel Özellikler</SectionTitle>
              <ul className="bg-white dark:bg-gray-800/40 rounded-[22px] border border-gray-100 dark:border-gray-800 p-3 space-y-0.5 shadow-sm">
                <FeatureItem>Aylık mesai ve ücret takibi</FeatureItem>
                <FeatureItem>Resmi tatil ve hafta sonu katsayıları</FeatureItem>
                <FeatureItem>Bulut yedekleme ve veri güvenliği</FeatureItem>
                <FeatureItem>Detaylı raporlama (TXT, CSV)</FeatureItem>
                <FeatureItem>Kıdem tazminatı hesaplama</FeatureItem>
                <FeatureItem>Kişiselleştirilebilir modern arayüz</FeatureItem>
              </ul>
            </section>
          </div>

          <div className={`space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200 ${activeTab === 'games' ? 'block' : 'hidden'}`}>
            <section className="space-y-1.5">
              <div className="grid grid-cols-3 gap-1.5 bg-gray-200/50 dark:bg-gray-800/50 p-1 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-inner">
                <TabButton 
                  id="2048" 
                  label="2048" 
                  icon={Gamepad2} 
                  activeTab={activeGame} 
                  setActiveTab={setActiveGame} 
                  variant="horizontal"
                  fontSize="text-[9px]"
                  iconSize={12}
                  roundedSize="xl"
                  activeGradient="from-blue-500 to-blue-600"
                  borderBottomColor="border-blue-800"
                />
                <TabButton 
                  id="sudoku" 
                  label="SUDOKU" 
                  icon={Hash} 
                  activeTab={activeGame} 
                  setActiveTab={setActiveGame} 
                  variant="horizontal"
                  fontSize="text-[9px]"
                  iconSize={12}
                  roundedSize="xl"
                  activeGradient="from-blue-500 to-blue-600"
                  borderBottomColor="border-blue-800"
                />
                <TabButton 
                  id="wordsearch" 
                  label="KELİME" 
                  icon={Type} 
                  activeTab={activeGame} 
                  setActiveTab={setActiveGame} 
                  variant="horizontal"
                  fontSize="text-[9px]"
                  iconSize={12}
                  roundedSize="xl"
                  activeGradient="from-blue-500 to-blue-600"
                  borderBottomColor="border-blue-800"
                />
              </div>

              <div className="bg-gray-100 dark:bg-gray-950/40 rounded-[2rem] border-4 border-gray-200/50 dark:border-gray-800/50 p-1 min-h-[280px] flex items-center justify-center relative shadow-inner group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none" />
                <div className="w-full h-full relative z-10 transition-transform duration-500">
                  <Suspense fallback={
                    <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-center">
                      <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Yükleniyor...</p>
                    </div>
                  }>
                    {activeGame === '2048' && <Game2048 />}
                    {activeGame === 'sudoku' && <SudokuGame />}
                    {activeGame === 'wordsearch' && <WordSearchGame />}
                  </Suspense>
                </div>
              </div>

              <div className="py-2 px-3.5 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/10 dark:to-orange-900/5 rounded-2xl border border-orange-100 dark:border-orange-800/20 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-3 relative z-10">
                  <div className="p-1.5 bg-gradient-to-br from-orange-400 to-orange-500 text-white rounded-xl shadow-md border-b-2 border-orange-700 h-fit">
                    <Gamepad2 size={14} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-orange-900 dark:text-orange-200 uppercase tracking-tight leading-none mb-0.5">Mola Verin</p>
                    <p className="text-[8px] text-orange-700 dark:text-orange-400 leading-tight font-bold opacity-80 uppercase tracking-tighter">
                      Zihninizi dinlendirmek için küçük bir oyun oynayabilirsiniz.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer - 3D Closing Button */}
        <div 
          className="flex-shrink-0 p-4 pt-1 bg-gray-50 dark:bg-gray-800/20 border-t border-gray-100 dark:border-gray-800 rounded-b-[32px]"
          style={buttonContainerStyle}
        >
          <button 
            onClick={onClose} 
            className="group relative w-full py-3.5 bg-gradient-to-br from-white to-gray-100 dark:from-gray-700 dark:to-gray-800 text-gray-500 dark:text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-md border-b-4 border-gray-300 dark:border-gray-950 active:translate-y-1 active:border-b-0 transition-all overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            KAPAT
          </button>
        </div>
      </div>
    </div>
  );
};
