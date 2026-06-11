import { Preferences } from '@capacitor/preferences';

/**
 * Modern storage utility using @capacitor/preferences
 * Provides a clean API and handles migration from localStorage
 */
export const storage = {
  /**
   * Get a value from storage
   */
  async get(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
  },

  /**
   * Set a value in storage
   */
  async set(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  },

  /**
   * Remove a value from storage
   */
  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  },

  /**
   * Get all keys in storage
   */
  async keys(): Promise<string[]> {
    const { keys } = await Preferences.keys();
    return keys;
  },

  /**
   * Migrates data from localStorage to Preferences if not already done
   */
  async migrateIfNeeded(): Promise<void> {
    const migrationFlag = 'storage-migrated-to-preferences';
    
    try {
      const { value: isMigrated } = await Preferences.get({ key: migrationFlag });

      if (isMigrated === 'true') {
        return;
      }

      if (import.meta.env.DEV) {
        console.log('Starting storage migration from localStorage to Preferences...');
      }

      // Sadece uygulama ile ilgili anahtarları taşı (Google token'ları vb. hariç)
      const APP_KEY_PREFIXES = ['mesai-', 'salary-', 'overtime-', 'app-'];
      const localStorageKeys = Object.keys(localStorage).filter(key => 
        APP_KEY_PREFIXES.some(prefix => key.startsWith(prefix))
      );

      if (localStorageKeys.length === 0) {
        await Preferences.set({ key: migrationFlag, value: 'true' });
        return;
      }

      for (const key of localStorageKeys) {
        // Hedefte zaten veri varsa (başka bir migration'dan kalma vb.) üzerine yazma
        const { value: existingValue } = await Preferences.get({ key });
        if (existingValue === null) {
          const value = localStorage.getItem(key);
          if (value !== null) {
            await Preferences.set({ key, value });
          }
        }
      }

      // Mark migration as complete
      await Preferences.set({ key: migrationFlag, value: 'true' });
      
      if (import.meta.env.DEV) {
        console.log('Storage migration completed successfully.');
      }
    } catch (error) {
      console.error('Storage migration failed:', error);
      // Hata durumunda bile bayrağı set etmeyi deneyebiliriz 
      // veya bir sonraki açılışta tekrar denemesi için bırakabiliriz.
      // Şimdilik kritik hatalarda tekrar denemesi daha güvenli (eksik veri kalmaması için).
    }
  }
};
