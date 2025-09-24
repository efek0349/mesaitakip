import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { FilePicker } from '@capawesome/capacitor-file-picker'; // Added this import
import { MonthlyData, SalarySettings, Holiday, OvertimeEntry } from '../types/overtime';
import { generateExportText } from '../utils/dateUtils';

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
    try {
      // Write to a temporary cache directory
      const tempFilePath = `temp_${filename}`;
      await Filesystem.writeFile({
        path: tempFilePath,
        data: text,
        directory: Directory.Cache, // Use cache directory for temporary file
        encoding: Encoding.UTF8,
      });

      // Get the URI of the temporary file
      const fileUri = await Filesystem.getUri({
        directory: Directory.Cache,
        path: tempFilePath,
      });

      // Share the file, allowing the user to choose where to save/share it
      await Share.share({
        title: 'Yedekleme Dosyası',
        text: 'Lütfen yedekleme dosyasını kaydetmek istediğiniz uygulamayı seçin.',
        url: fileUri.uri, // Use the URI for sharing
        dialogTitle: 'Yedekleme Dosyasını Kaydet/Paylaş',
      });

      // Remove the temporary file after sharing
      await Filesystem.deleteFile({
        directory: Directory.Cache,
        path: tempFilePath,
      });

      alert(`${filename} başarıyla paylaşıldı/kaydedildi!`);
    } catch (error) {
      console.error('Dosya indirme/paylaşma hatası:', error);
      alert('Dosya kaydedilirken/paylaşılırken bir hata oluştu.');
    }
  } else {
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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
      // Kullanıcı paylaşımı iptal ettiğinde hata vermemesi için özel bir durum
      if (!(error instanceof Error && error.message.includes('cancelled'))) {
        alert('İçerik paylaşılırken bir hata oluştu.');
      }
    }
  } else {
    // Web platformunda paylaşım API'si genellikle daha kısıtlıdır veya farklı çalışır
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
      // Alternatif olarak panoya kopyalama veya indirme sunulabilir
      prompt('Paylaşmak istediğiniz metni kopyalayın:', text);
    }
  }
};

// Placeholder for saveBackupFile - You need to provide the original implementation
export const saveBackupFile = async (data: string, filename: string): Promise<void> => {
  console.warn('saveBackupFile: Placeholder function called. Provide original implementation.');
  // Original implementation should go here
  await downloadTextFile(data, filename); // Using downloadTextFile as a fallback
};

export const pickAndReadBackupFile = async (): Promise<string | null> => {
  if (Capacitor.isNativePlatform()) {
    try {
      // Kullanıcının dosya seçmesini sağla
      const result = await FilePicker.pickFiles({
        types: ['application/json'], // Sadece JSON dosyalarını seç
        multiple: false,
      });

      if (result.files.length === 0) {
        // Kullanıcı dosya seçmeyi iptal etti
        alert('Dosya seçimi iptal edildi.');
        return null;
      }

      const file = result.files[0];
      alert(`Seçilen dosya: ${file.name}, Yolu: ${file.path}`);

      // Seçilen dosyanın içeriğini oku
      const contents = await Filesystem.readFile({
        path: file.path!,
        encoding: Encoding.UTF8,
      });

      alert('Dosya içeriği başarıyla okundu.');
      return contents.data as string; // İçeriği string olarak döndür
    } catch (error: any) {
      console.error('Dosya seçme veya okuma hatası:', error);
      alert(`Yedekleme dosyası okunurken bir hata oluştu: ${error.message || error}`);
      return null;
    }
  } else {
    // Web platformu için basit bir dosya seçici
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
            alert('Yedekleme dosyası okunurken bir hata oluştu.');
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
  const headers = ["Tarih", "Çalışan Adı", "Başlangıç", "Bitiş", "Normal Saat", "Fazla Mesai", "Açıklama"]; // Force rebuild
  const rows: string[] = [];

  const employeeName = `${settings.firstName} ${settings.lastName}`.trim();
  const defaultStartTime = settings.defaultStartTime || '08:05';
  const defaultEndTime = settings.defaultEndTime || '18:05';

  // Calculate normal working hours based on default start/end times
  const [startHour, startMinute] = defaultStartTime.split(':').map(Number);
  const [endHour, endMinute] = defaultEndTime.split(':').map(Number);
  const normalWorkingHours = (endHour - startHour) + (endMinute - startMinute) / 60;
  const formattedNormalWorkingHours = formatDecimalHoursToHHMM(normalWorkingHours);

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const currentDate = new Date(year, month, day);
    const dateString = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const yearMonthString = `${year}-${(month + 1).toString().padStart(2, '0')}`;
    
    const monthDataEntries = monthlyData[yearMonthString] || [];
    const dayData = monthDataEntries.filter(entry => entry.date === dateString);
    const totalOvertimeHoursForDay = dayData.reduce((sum, entry) => sum + (entry.totalHours || 0), 0);
    const noteForDay = dayData.map(entry => entry.note).filter(Boolean).join('; ');

    // Declare these variables once
    const dayOfWeek = currentDate.getDay();
    const isSaturday = dayOfWeek === 6;
    const isSunday = dayOfWeek === 0;
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
    const isHoliday = !!getHoliday(currentDate);

    let shouldIncludeDay = true; // Assume included by default

    // Exclusion rules
    if (totalOvertimeHoursForDay === 0) { // Only apply exclusion rules if no overtime
      if (isSunday) { // Rule: Sundays without overtime are excluded
        shouldIncludeDay = false;
      } else if (isHoliday) { // Rule: Holidays without overtime are excluded
        shouldIncludeDay = false;
      } else if (isSaturday && !settings.isSaturdayWork) { // Rule: Saturdays without overtime are excluded if isSaturdayWork is false
        shouldIncludeDay = false;
      }
    }

    if (shouldIncludeDay) {
      const formattedOvertimeHours = formatDecimalHoursToHHMM(totalOvertimeHoursForDay);

      rows.push(
        `"${dateString}","${employeeName}","${defaultStartTime}","${defaultEndTime}","${formattedNormalWorkingHours}","${formattedOvertimeHours}","${noteForDay}"`
      );
    }
  }

  return [headers.join(','), ...rows].join('\n');
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
    settings.firstName,
    settings.lastName,
    getHoliday,
    settings.deductBreakTime,
    settings.isSaturdayWork
  );
};