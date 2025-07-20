import { useState, useEffect } from 'react';
import { 
  getAndroidInfo, 
  getModalSafeHeight, 
  getModalSafePadding,
  initializeViewportHandler,
  logAndroidDebugInfo,
  AndroidInfo 
} from '../utils/androidUtils';

export const useAndroidSafeArea = () => {
  const [androidInfo, setAndroidInfo] = useState<AndroidInfo>(() => getAndroidInfo());
  const [modalSafeHeight, setModalSafeHeight] = useState(() => getModalSafeHeight());
  const [modalSafePadding, setModalSafePadding] = useState(() => getModalSafePadding());

  useEffect(() => {
    // İlk yükleme
    const updateInfo = () => {
      const info = getAndroidInfo();
      setAndroidInfo(info);
      setModalSafeHeight(getModalSafeHeight());
      setModalSafePadding(getModalSafePadding());
    };

    updateInfo();

    // Viewport handler'ı başlat
    const cleanup = initializeViewportHandler();

    // Debug bilgilerini göster (sadece development'ta)
    if (process.env.NODE_ENV === 'development') {
      logAndroidDebugInfo();
    }

    // Resize ve orientation change için listener
    const handleUpdate = () => {
      setTimeout(updateInfo, 100); // Kısa gecikme ile güncelle
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('orientationchange', handleUpdate);

    // Cleanup
    return () => {
      cleanup();
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('orientationchange', handleUpdate);
    };
  }, []);

  // Modal için inline style oluştur
  const getModalStyle = () => ({
    maxHeight: `${modalSafeHeight}vh`,
    marginBottom: androidInfo.isAndroid ? `${modalSafePadding}px` : '0px'
  });

  // Buton container için inline style oluştur
  const getButtonContainerStyle = () => ({
    paddingBottom: androidInfo.isAndroid ? `${modalSafePadding}px` : '16px'
  });

  return {
    androidInfo,
    modalSafeHeight,
    modalSafePadding,
    getModalStyle,
    getButtonContainerStyle,
    isAndroid: androidInfo.isAndroid,
    hasNavigationBar: androidInfo.hasNavigationBar
  };
};