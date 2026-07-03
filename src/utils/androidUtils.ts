import { Capacitor } from '@capacitor/core';

export interface AndroidInfo {
  isAndroid: boolean;
  hasNavigationBar: boolean;
  isLandscape: boolean;
  screenHeight: number;
  viewportHeight: number;
}

const IS_ANDROID = Capacitor.getPlatform() === 'android';

// Navigasyon çubuğu yüksekliğini klavye durumundan bağımsız sakla
//
// BİLİNEN SINIRLAMA (Android 15+ / edge-to-edge zorunlu ROM'lar, örn.
// LineageOS 23.2): Bu dosyadaki `bottomInset = innerHeight - visualViewport.height`
// heuristiği, WebView gesture-navigasyon "pill" alanını visualViewport'a hiç
// yansıtmadığında (bottomInset === 0 okunduğunda) durumu YANLIŞLIKLA "gesture
// navigasyon yok" olarak yorumlayıp --nav-bar-height'i 0px'e sabitleyebilir —
// oysa gesture çubuğu hâlâ oradadır. Bu YALNIZCA JS tarafındaki heuristiktir;
// bu değeri tüketen CSS tarafında (win95-overrides.css, App.tsx) her zaman
// standart `env(safe-area-inset-bottom)` ile birlikte `max(...)` alınarak
// kullanılmalı, TEK BAŞINA güvenilmemelidir. Win95 TaskBar'ın gesture-nav
// altında kalması sorunu tam olarak bu heuristiğin böyle bir cihazda 0
// dönmesinden kaynaklanıyordu.
let stableNavBarHeight = 0;
let navBarDetected = false;

export const getAndroidInfo = (): AndroidInfo => {
  const screenHeight = window.screen.height;
  const viewportHeight = window.innerHeight;
  const isLandscape = window.innerWidth > window.innerHeight;

  const hasNavigationBar = IS_ANDROID && (navBarDetected || stableNavBarHeight > 0);

  return {
    isAndroid: IS_ANDROID,
    hasNavigationBar,
    isLandscape,
    screenHeight,
    viewportHeight
  };
};

export const getModalMetrics = () => {
  const info = getAndroidInfo();
  return {
    info,
    safeHeight: !info.isAndroid ? 90 : info.isLandscape ? 85 : 90,
    safePadding: (!info.isAndroid || !info.hasNavigationBar) ? 0 : info.isLandscape ? 8 : 16
  };
};

export const getModalSafeHeight = (): number => getModalMetrics().safeHeight;
export const getModalSafePadding = (): number => getModalMetrics().safePadding;

export const logAndroidDebugInfo = () => {
  const { info, safeHeight, safePadding } = getModalMetrics();
  console.log('[Android SafeArea Debug]:', {
    ...info,
    modalSafeHeight: safeHeight,
    modalSafePadding: safePadding,
    windowInner: `${window.innerWidth}x${window.innerHeight}`,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    navBarVar: getComputedStyle(document.documentElement).getPropertyValue('--nav-bar-height'),
    stableNavBarHeight,
    navBarDetected
  });
};

export const initializeViewportHandler = (): (() => void) => {
  const root = document.documentElement;

  // Klavye açık mı? visualViewport.height küçüldüğünde klavye açılmış demektir.
  // Başlangıç yüksekliğini referans olarak saklıyoruz.
  let baseViewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const KEYBOARD_THRESHOLD = 150; // 150px'den fazla küçülme = klavye açık

  const isKeyboardOpen = (currentHeight: number): boolean => {
    return (baseViewportHeight - currentHeight) > KEYBOARD_THRESHOLD;
  };

  const updateViewportVars = () => {
    if (!window.visualViewport) return;

    const { height, offsetTop } = window.visualViewport;
    const keyboardOpen = isKeyboardOpen(height);

    // Her zaman --vh güncelle (layout için gerekli)
    root.style.setProperty('--vh', `${height * 0.01}px`);

    const bottomInset = window.innerHeight - height - offsetTop;

    if (!keyboardOpen) {
      // Klavye kapalıyken gelen değer gerçek nav bar yüksekliği
      // Navigasyon çubuğu genellikle 20-80px arasındadır
      if (bottomInset > 10 && bottomInset < 120) {
        stableNavBarHeight = bottomInset;
        navBarDetected = true;
        root.style.setProperty('--nav-bar-height', `${stableNavBarHeight}px`);
      } else if (bottomInset === 0) {
        // Gesture navigation (navigasyon çubuğu yok)
        stableNavBarHeight = 0;
        navBarDetected = false;
        root.style.setProperty('--nav-bar-height', '0px');
      }
      // Klavye kapandığında baseViewportHeight'i güncelle
      baseViewportHeight = height;
    }
    // Klavye açıkken --nav-bar-height'i değiştirme, stale değeri koru
  };

  if (window.visualViewport) {
    updateViewportVars();
    window.visualViewport.addEventListener('resize', updateViewportVars);
    window.visualViewport.addEventListener('scroll', updateViewportVars);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewportVars);
        window.visualViewport.removeEventListener('scroll', updateViewportVars);
      }
    };
  } else {
    const fallbackUpdate = () => {
      root.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
      root.style.setProperty('--nav-bar-height', '0px');
    };
    fallbackUpdate();
    window.addEventListener('resize', fallbackUpdate);
    return () => window.removeEventListener('resize', fallbackUpdate);
  }
};
