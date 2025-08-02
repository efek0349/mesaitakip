// Android cihaz ve navigasyon çubuğu yönetimi

export interface AndroidInfo {
  isAndroid: boolean;
  hasNavigationBar: boolean;
  navigationBarHeight: number;
  screenHeight: number;
  availableHeight: number;
  devicePixelRatio: number;
}

// Android cihaz tespiti
export const detectAndroid = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return /android/.test(userAgent);
};

// Navigasyon çubuğu yüksekliğini hesapla
export const getNavigationBarHeight = (): number => {
  if (!detectAndroid()) return 0;
  
  // CSS env() değerini kontrol et
  const envValue = getComputedStyle(document.documentElement)
    .getPropertyValue('--safe-area-inset-bottom') || 
    getComputedStyle(document.documentElement)
    .getPropertyValue('env(safe-area-inset-bottom)');
  
  if (envValue && envValue !== '0px') {
    return parseInt(envValue.replace('px', '')) || 0;
  }
  
  // Fallback: Ekran yüksekliği farkından hesapla
  const screenHeight = window.screen.height;
  const availableHeight = window.innerHeight;
  const heightDiff = screenHeight - availableHeight;
  
  // Android navigasyon çubuğu genellikle 48-144px arası
  if (heightDiff > 40 && heightDiff < 200) {
    return heightDiff;
  }
  
  // Varsayılan değer (çoğu Android cihaz için)
  return 48;
};

// Tam Android bilgilerini al
export const getAndroidInfo = (): AndroidInfo => {
  const isAndroid = detectAndroid();
  const navigationBarHeight = isAndroid ? getNavigationBarHeight() : 0;
  const screenHeight = window.screen.height;
  const availableHeight = window.innerHeight;
  
  return {
    isAndroid,
    hasNavigationBar: navigationBarHeight > 0,
    navigationBarHeight,
    screenHeight,
    availableHeight,
    devicePixelRatio: window.devicePixelRatio || 1
  };
};

// Modal için güvenli yükseklik hesapla
export const getModalSafeHeight = (): number => {
  const androidInfo = getAndroidInfo();
  
  if (!androidInfo.isAndroid) {
    return 85; // Normal cihazlar için %85
  }
  
  // Android için daha konservatif yaklaşım
  const baseHeight = 80; // %80 başlangıç
  const extraPadding = Math.max(androidInfo.navigationBarHeight / window.innerHeight * 100, 5);
  
  return Math.max(baseHeight - extraPadding, 70); // Minimum %70
};

// Modal için güvenli alt padding hesapla
export const getModalSafePadding = (): number => {
  const androidInfo = getAndroidInfo();
  
  if (!androidInfo.isAndroid) {
    return 16; // Normal cihazlar için 16px
  }
  
  // Android için navigasyon çubuğu + ekstra güvenlik
  return Math.max(androidInfo.navigationBarHeight + 16, 32);
};

// Viewport yüksekliğini dinamik olarak ayarla
export const setDynamicViewportHeight = (): void => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
  
  const androidInfo = getAndroidInfo();
  if (androidInfo.isAndroid) {
    const safeHeight = getModalSafeHeight();
    const safePadding = getModalSafePadding();
    
    document.documentElement.style.setProperty('--modal-safe-height', `${safeHeight}vh`);
    document.documentElement.style.setProperty('--modal-safe-padding', `${safePadding}px`);
    document.documentElement.style.setProperty('--nav-bar-height', `${androidInfo.navigationBarHeight}px`);
  }
};

// Resize event listener
export const initializeViewportHandler = (): (() => void) => {
  setDynamicViewportHeight();
  
  const handleResize = () => {
    setDynamicViewportHeight();
  };
  
  const handleOrientationChange = () => {
    // Orientation değişikliğinde kısa bir gecikme ile yeniden hesapla
    setTimeout(setDynamicViewportHeight, 100);
    setTimeout(setDynamicViewportHeight, 500);
  };
  
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', handleOrientationChange);
  
  // Cleanup function
  return () => {
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', handleOrientationChange);
  };
};

// Debug bilgileri
export const logAndroidDebugInfo = (): void => {
  const androidInfo = getAndroidInfo();
  console.group('🤖 Android Debug Info');
  console.log('Is Android:', androidInfo.isAndroid);
  console.log('Has Navigation Bar:', androidInfo.hasNavigationBar);
  console.log('Navigation Bar Height:', androidInfo.navigationBarHeight + 'px');
  console.log('Screen Height:', androidInfo.screenHeight + 'px');
  console.log('Available Height:', androidInfo.availableHeight + 'px');
  console.log('Device Pixel Ratio:', androidInfo.devicePixelRatio);
  console.log('Modal Safe Height:', getModalSafeHeight() + '%');
  console.log('Modal Safe Padding:', getModalSafePadding() + 'px');
  console.groupEnd();
}