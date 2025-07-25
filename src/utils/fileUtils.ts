import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

/**
 * Metin dosyasını indir
 */
export const downloadTextFile = (content: string, fileName: string): void => {
  try {
    if (Capacitor.isNativePlatform()) {
      // Android/iOS için dosya paylaşımı kullan
      shareTextAsFile(content, fileName);
    } else {
      // Web için blob download
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Dosya indirme hatası:', error);
    // Fallback: panoya kopyala
    copyToClipboard(content, 'Dosya indirilemedi, ancak içerik panoya kopyalandı!');
  }
};

/**
 * Metni paylaş (Android/iOS/Web uyumlu)
 */
export const shareText = async (content: string, title: string): Promise<void> => {
  try {
    if (Capacitor.isNativePlatform()) {
      // Android/iOS için native paylaşma
      await Share.share({
        title: title,
        text: content,
        dialogTitle: title
      });
    } else {
      // Web için Web Share API
      if (navigator.share && navigator.canShare && navigator.canShare({ text: content })) {
        await navigator.share({
          title: title,
          text: content
        });
      } else {
        // Web Share API desteklenmiyorsa panoya kopyala
        await copyToClipboard(content, 'Rapor panoya kopyalandı! Artık istediğiniz yere yapıştırabilirsiniz.');
      }
    }
  } catch (error) {
    console.error('Paylaşma hatası:', error);
    
    // Hata durumunda panoya kopyalama
    if (error.name !== 'AbortError') { // Kullanıcı iptal etmediyse
      await copyToClipboard(content, 'Paylaşma başarısız oldu, ancak rapor panoya kopyalandı!');
    }
  }
};

/**
 * Android/iOS için dosya olarak paylaş
 */
const shareTextAsFile = async (content: string, fileName: string): Promise<void> => {
  try {
    // Geçici bir blob URL oluştur
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // Capacitor Share ile dosya paylaş
    await Share.share({
      title: fileName.replace('.txt', ''),
      text: content,
      url: url,
      dialogTitle: 'Mesai raporunu paylaş'
    });
    
    // URL'yi temizle
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error('Dosya paylaşma hatası:', error);
    // Fallback: sadece metin paylaş
    await Share.share({
      title: fileName.replace('.txt', ''),
      text: content,
      dialogTitle: 'Mesai raporunu paylaş'
    });
  }
};

/**
 * Panoya kopyala (güvenli)
 */
const copyToClipboard = async (text: string, successMessage: string): Promise<void> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      // Modern clipboard API
      await navigator.clipboard.writeText(text);
      showMessage(successMessage);
    } else {
      // Fallback: eski yöntem
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        showMessage(successMessage);
      } catch (err) {
        console.error('Panoya kopyalama hatası:', err);
        showMessage('Panoya kopyalanamadı. Lütfen manuel olarak kopyalayın.');
      } finally {
        document.body.removeChild(textArea);
      }
    }
  } catch (error) {
    console.error('Clipboard hatası:', error);
    showMessage('Panoya kopyalanamadı. Lütfen manuel olarak kopyalayın.');
  }
};

/**
 * Kullanıcıya mesaj göster
 */
const showMessage = (message: string): void => {
  // Basit alert kullan (daha sonra toast sistemi eklenebilir)
  alert(message);
};

/**
 * Dosya uzantısını kontrol et
 */
export const getFileExtension = (fileName: string): string => {
  return fileName.split('.').pop()?.toLowerCase() || '';
};

/**
 * Dosya boyutunu formatla
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};