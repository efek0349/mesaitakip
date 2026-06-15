import React from 'react';
import { 
  getModalMetrics,
  initializeViewportHandler,
  logAndroidDebugInfo,
  AndroidInfo 
} from '../utils/androidUtils';

interface ViewportState {
  androidInfo: AndroidInfo;
  modalSafeHeight: number;
  modalSafePadding: number;
}

export const useAndroidSafeArea = () => {
  const [state, setState] = React.useState<ViewportState>(() => {
    const { info, safeHeight, safePadding } = getModalMetrics();
    return {
      androidInfo: info,
      modalSafeHeight: safeHeight,
      modalSafePadding: safePadding
    };
  });

  React.useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const updateInfo = () => {
      const { info, safeHeight, safePadding } = getModalMetrics();
      setState({
        androidInfo: info,
        modalSafeHeight: safeHeight,
        modalSafePadding: safePadding
      });
    };

    if (import.meta.env.DEV) {
      logAndroidDebugInfo();
    }

    const handleUpdate = () => {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(updateInfo, 100);
    };

    window.addEventListener('resize', handleUpdate);

    if (typeof screen !== 'undefined' && screen.orientation) {
      screen.orientation.addEventListener('change', handleUpdate);
    } else {
      window.addEventListener('orientationchange', handleUpdate);
    }

    return () => {
      if (timerId) clearTimeout(timerId);
      window.removeEventListener('resize', handleUpdate);
      if (typeof screen !== 'undefined' && screen.orientation) {
        screen.orientation.removeEventListener('change', handleUpdate);
      } else {
        window.removeEventListener('orientationchange', handleUpdate);
      }
    };
  }, []);

  // Modal için inline style
  const modalStyle = React.useMemo(() => ({
    maxHeight: `${state.modalSafeHeight}vh`,
    marginBottom: state.androidInfo.isAndroid ? `${state.modalSafePadding}px` : '0px'
  }), [state.modalSafeHeight, state.androidInfo.isAndroid, state.modalSafePadding]);

  // Buton container için inline style
  // Android: nav bar padding + ekstra boşluk
  // iOS/web: safe-area-inset-bottom CSS değişkenini kullan + ekstra boşluk
  const buttonContainerStyle = React.useMemo(() => {
    if (state.androidInfo.isAndroid) {
      // Android nav bar varsa padding ekle, yoksa sadece standart boşluk
      const basePadding = state.modalSafePadding > 0 ? state.modalSafePadding + 8 : 20;
      return { paddingBottom: `${basePadding}px` };
    }
    // Web / iOS: env(safe-area-inset-bottom) + standart padding
    return { paddingBottom: 'max(20px, calc(env(safe-area-inset-bottom) + 12px))' };
  }, [state.androidInfo.isAndroid, state.modalSafePadding]);

  return {
    androidInfo: state.androidInfo,
    modalSafeHeight: state.modalSafeHeight,
    modalSafePadding: state.modalSafePadding,
    modalStyle,
    buttonContainerStyle,
    isAndroid: state.androidInfo.isAndroid,
    hasNavigationBar: state.androidInfo.hasNavigationBar
  };
};
