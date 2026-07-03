import React from 'react';
import { ToastTailwind } from './ToastTailwind';
import { ToastWin95 } from './win95/ToastWin95';

interface ToastProps {
  win95Enabled: boolean;
}

/**
 * Toast — router component. win95Enabled prop'una göre seçim yapar.
 * Bu component'in mantığı (toastEmitter subscribe) çok basit olduğu için
 * ayrı bir hook'a çıkarılmadı — her iki görsel versiyon kendi state'ini
 * tutuyor (ikisi de aynı toastEmitter'a subscribe oluyor, çelişki riski yok
 * çünkü her zaman sadece biri DOM'da render ediliyor).
 */
export const Toast: React.FC<ToastProps> = ({ win95Enabled }) => {
  if (win95Enabled) {
    return <ToastWin95 />;
  }
  return <ToastTailwind />;
};
