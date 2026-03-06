export class EventEmitter {
  private listeners: (() => void)[] = [];
  
  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  emit() {
    this.listeners.forEach(listener => listener());
  }
}
