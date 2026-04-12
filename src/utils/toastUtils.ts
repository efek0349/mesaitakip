import React from 'react';
import { EventEmitter } from './EventEmitter';

export interface ToastMessage {
  message: string;
  type?: 'success' | 'error' | 'info' | 'update' | 'custom';
  duration?: number;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  isPersistent?: boolean;
}

export const toastEmitter = new EventEmitter<ToastMessage>();

export const showToast = (message: string, type: ToastMessage['type'] = 'info', duration = 3000, options: Partial<ToastMessage> = {}) => {
  toastEmitter.emit({ message, type, duration, ...options });
};
