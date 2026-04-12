export class EventEmitter<T = void> {
  private listeners: ((data: T) => void)[] = [];
  
  subscribe(listener: (data: T) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  emit(data: T) {
    this.listeners.forEach(listener => listener(data));
  }
}
