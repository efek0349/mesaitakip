import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { MonthlyData, SalarySettings, Holiday, OvertimeEntry, calcTotalHours } from '../types/overtime';
import { generateExportText, getMonthKey, getDateKey } from '../utils/dateUtils';
import { showToast } from './toastUtils';

const formatDecimalHoursToHHMM = (decimalHours: number): string => {
  if (isNaN(decimalHours) || decimalHours < 0) {
    return "00:00";
  }
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export const downloadTextFile = async (text: string, filename: string) => {
  if (Capacitor.isNativePlatform()) {
    const tempFilePath = `temp_dl_${Date.now()}_${filename}`;
    try {
      // Write to a temporary cache directory
      await Filesystem.writeFile({
        path: tempFilePath,
        data: text,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });

      // Get the URI of the temporary file
      const fileUri = await Filesystem.getUri({
        directory: Directory.Cache,
        path: tempFilePath,
      });

      // Share the file
      await Share.share({
        title: 'Yedekleme Dosyası',
        text: 'Lütfen yedekleme dosyasını kaydetmek istediğiniz uygulamayı seçin.',
        url: fileUri.uri,
        dialogTitle: 'Yedekleme Dosyasını Kaydet/Paylaş',
      });

      showToast(`${filename} başarıyla paylaşıldı/kaydedildi!`, 'success');
    } catch (error) {
      console.error('Dosya indirme/paylaşma hatası:', error);
      if (!(error instanceof Error && error.message.includes('cancelled'))) {
        showToast('Dosya kaydedilirken/paylaşılırken bir hata oluştu.', 'error');
      }
    } finally {
      // Cleanup with a slight delay to ensure the OS has finished with the file
      setTimeout(async () => {
        try {
          await Filesystem.deleteFile({
            path: tempFilePath,
            directory: Directory.Cache,
          });
        } catch (e) {
          // Ignore deletion errors
        }
      }, 1000);
    }
  } else {
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(file);
    element.href = url;
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
  }
};

export const shareText = async (text: string, title: string) => {
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({
        title: title,
        text: text,
        dialogTitle: title,
      });
    } catch (error) {
      console.error('Paylaşım hatası:', error);
      if (!(error instanceof Error && error.message.includes('cancelled'))) {
        showToast('İçerik paylaşılırken bir hata oluştu.', 'error');
      }
    }
  } else {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: text,
        });
      } catch (error) {
        console.error('Web paylaşım hatası:', error);
      }
    }
    else {
      try {
        await navigator.clipboard.writeText(text);
        showToast('İçerik panoya kopyalandı.', 'success');
      } catch (err) {
        prompt('Paylaşmak istediğiniz metni kopyalayın:', text);
      }
    }
  }
};

export const shareFile = async (data: string, filename: string, title: string = 'Dosya Paylaş') => {
  if (Capacitor.isNativePlatform()) {
    const tempFilename = `share_${Date.now()}_${filename}`;
    try {
      await Filesystem.writeFile({
        path: tempFilename,
        data: data,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });

      const fileUri = await Filesystem.getUri({
        directory: Directory.Cache,
        path: tempFilename,
      });

      await Share.share({
        title: title,
        url: fileUri.uri,
        dialogTitle: title,
      });
    } catch (error) {
      console.error('Dosya paylaşma hatası:', error);
      if (!(error instanceof Error && error.message.includes('cancelled'))) {
        showToast('Dosya paylaşılırken bir hata oluştu.', 'error');
      }
    } finally {
      // Cleanup with delay
      setTimeout(async () => {
        try {
          await Filesystem.deleteFile({
            path: tempFilename,
            directory: Directory.Cache,
          });
        } catch (e) {
          // Ignore deletion errors
        }
      }, 2000);
    }
  } else {
    const element = document.createElement('a');
    const file = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(file);
    element.href = url;
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
  }
};

export const saveBackupFile = async (data: string, filename: string): Promise<void> => {
  await shareFile(data, filename, 'Yedek Dosyasını Kaydet/Paylaş');
};

export const pickAndReadBackupFile = async (): Promise<string | null> => {
  if (Capacitor.isNativePlatform()) {
    try {
      const permissions = await FilePicker.checkPermissions();
      if (permissions.publicStorage !== 'granted') {
        const request = await FilePicker.requestPermissions();
        if (request.publicStorage !== 'granted') {
          showToast('Dosya seçebilmek için depolama izni vermeniz gerekmektedir.', 'error');
          return null;
        }
      }

      const result = await FilePicker.pickFiles({
        types: ['application/json'], 
        multiple: false,
        readData: true
      });

      if (result.files.length === 0) {
        return null;
      }

      const file = result.files[0];

      if (file.data) {
        try {
          return atob(file.data);
        } catch (e) {
          // Eğer base64 değilse ve geçerli bir JSON string ise doğrudan döndür
          try {
            JSON.parse(file.data);
            return file.data;
          } catch {
            throw new Error('Dosya içeriği okunurken hata oluştu (Geçersiz format).');
          }
        }
      }

      if (file.path) {
        const contents = await Filesystem.readFile({
          path: file.path,
          encoding: Encoding.UTF8,
        });
        return contents.data as string;
      }

      throw new Error('Dosya içeriğine ulaşılamadı.');
    } catch (error: unknown) {
      console.error('Dosya seçme veya okuma hatası:', error);
      const msg = error instanceof Error ? error.message : String(error);
      if (!msg.includes('pickFiles') && !msg.includes('canceled')) {
        showToast(`Yedekleme dosyası okunurken hata oluştu: ${msg}`, 'error');
      }
      return null;
    }
  } else {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = (event: Event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve(e.target?.result as string);
          };
          reader.onerror = (e) => {
            console.error('Dosya okuma hatası (Web):', e);
            showToast('Yedekleme dosyası okunurken hata oluştu.', 'error');
            resolve(null);
          };
          reader.readAsText(file);
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  }
};

export const generateCsvContent = (
  year: number,
  month: number, // 0-11
  monthlyData: MonthlyData,
  settings: SalarySettings,
  getHoliday: (date: Date) => Holiday | undefined
): string => {
  const headers = ["Tarih", "Çalışan Adı", "Başlangıç", "Bitiş", "Normal Saat", "Fazla Mesai", "Açıklama"];
  const rows: string[] = [];

  const escapeCsv = (val: string) => {
    // Escape double quotes and remove characters that can break CSV structure
    const escaped = (val || '').toString().replace(/"/g, '""').replace(/[\t\r\n]/g, ' ');
    // CSV Injection protection: if starts with =, +, -, @, add a single quote
    if (escaped.match(/^[=+\-@]/)) {
      return `"'${escaped}"`;
    }
    return `"${escaped}"`;
  };

  const employeeName = `${settings.firstName} ${settings.lastName}`.trim();
  const defaultStartTime = settings.defaultStartTime || '08:05';
  const defaultEndTime = settings.defaultEndTime || '18:05';

  const [startHour, startMinute] = defaultStartTime.split(':').map(Number);
  const [endHour, endMinute] = defaultEndTime.split(':').map(Number);
  let normalWorkingHours = (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60;
  if (normalWorkingHours < 0) normalWorkingHours += 24;
  
  const formattedNormalWorkingHours = formatDecimalHoursToHHMM(normalWorkingHours);

  const monthKey = getMonthKey(new Date(year, month));
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    const dateKey = getDateKey(currentDate);
    
    const monthDataEntries = monthlyData[monthKey] || [];
    const dayData = monthDataEntries.filter(entry => entry.date === dateKey && entry.type !== 'leave');
    const totalOvertimeHoursForDay = dayData.reduce((sum, entry) => sum + calcTotalHours(entry), 0);
    const noteForDay = dayData.map(entry => entry.note).filter(Boolean).join('; ');

    const dayOfWeek = currentDate.getDay();
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;
    const isHoliday = !!getHoliday(currentDate);

    let shouldIncludeDay = true;

    if (totalOvertimeHoursForDay === 0) {
      if (isSunday) {
        shouldIncludeDay = false;
      } else if (isHoliday) {
        shouldIncludeDay = false;
      } else if (isSaturday && !settings.isSaturdayWork) {
        shouldIncludeDay = false;
      }
    }

    if (shouldIncludeDay) {
      const formattedOvertimeHours = formatDecimalHoursToHHMM(totalOvertimeHoursForDay);

      rows.push(
        `${escapeCsv(dateKey)},${escapeCsv(employeeName)},${escapeCsv(defaultStartTime)},${escapeCsv(defaultEndTime)},${escapeCsv(formattedNormalWorkingHours)},${escapeCsv(formattedOvertimeHours)},${escapeCsv(noteForDay)}`
      );
    }
  }

  return [headers.map(escapeCsv).join(','), ...rows].join('\n');
};

export const generateShareableSummaryText = (
  year: number,
  month: number, // 0-11
  monthlyData: MonthlyData,
  settings: SalarySettings,
  getHoliday: (date: Date) => Holiday | undefined
): string => {
  return generateExportText(
    monthlyData,
    year,
    month,
    settings,
    getHoliday
  );
};
