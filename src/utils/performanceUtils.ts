// Performans izleme ve optimizasyon araçları

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private memoryWarningShown = false;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // İşlem süresini ölç
  measureTime<T>(operation: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    this.addMetric(operation, duration);
    
    if (duration > 100) { // 100ms'den uzun işlemler için uyarı
      console.warn(`⚠️ Yavaş işlem: ${operation} - ${duration.toFixed(2)}ms`);
    }
    
    return result;
  }

  // Async işlem süresini ölç
  async measureAsyncTime<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    this.addMetric(operation, duration);
    
    if (duration > 200) { // 200ms'den uzun async işlemler için uyarı
      console.warn(`⚠️ Yavaş async işlem: ${operation} - ${duration.toFixed(2)}ms`);
    }
    
    return result;
  }

  private addMetric(operation: string, duration: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const metrics = this.metrics.get(operation)!;
    metrics.push(duration);
    
    // Son 100 ölçümü tut
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  // Performans raporunu al
  getReport(): Record<string, { avg: number; max: number; min: number; count: number }> {
    const report: Record<string, { avg: number; max: number; min: number; count: number }> = {};
    
    this.metrics.forEach((durations, operation) => {
      const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const max = Math.max(...durations);
      const min = Math.min(...durations);
      
      report[operation] = {
        avg: Number(avg.toFixed(2)),
        max: Number(max.toFixed(2)),
        min: Number(min.toFixed(2)),
        count: durations.length
      };
    });
    
    return report;
  }

  // Bellek kullanımını kontrol et
  checkMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
      const usagePercent = (usedMB / limitMB) * 100;
      
      if (usagePercent > 80 && !this.memoryWarningShown) {
        console.warn(`⚠️ Yüksek bellek kullanımı: ${usedMB.toFixed(1)}MB (${usagePercent.toFixed(1)}%)`);
        this.memoryWarningShown = true;
        
        // 5 dakika sonra uyarıyı sıfırla
        setTimeout(() => {
          this.memoryWarningShown = false;
        }, 5 * 60 * 1000);
      }
      
      return {
        used: usedMB,
        limit: limitMB,
        percentage: usagePercent
      };
    }
    
    return null;
  }

  // Performans raporunu konsola yazdır
  logReport() {
    console.group('📊 Performans Raporu');
    
    const report = this.getReport();
    Object.entries(report).forEach(([operation, metrics]) => {
      console.log(`${operation}:`, metrics);
    });
    
    const memory = this.checkMemoryUsage();
    if (memory) {
      console.log('Bellek:', `${memory.used.toFixed(1)}MB / ${memory.limit.toFixed(1)}MB (${memory.percentage.toFixed(1)}%)`);
    }
    
    console.groupEnd();
  }
}

// Debounce fonksiyonu
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle fonksiyonu
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Chunk işleme (büyük dizileri parçalara böl)
export function processInChunks<T>(
  array: T[],
  chunkSize: number,
  processor: (chunk: T[]) => void,
  onComplete?: () => void
): void {
  let index = 0;
  
  function processChunk() {
    const chunk = array.slice(index, index + chunkSize);
    if (chunk.length === 0) {
      onComplete?.();
      return;
    }
    
    processor(chunk);
    index += chunkSize;
    
    // Bir sonraki chunk'ı async olarak işle
    setTimeout(processChunk, 0);
  }
  
  processChunk();
}

// Global performans monitörü
export const performanceMonitor = PerformanceMonitor.getInstance();

// Periyodik performans kontrolü
if (typeof window !== 'undefined') {
  setInterval(() => {
    performanceMonitor.checkMemoryUsage();
  }, 30000); // 30 saniyede bir kontrol et
}