/**
 * Google Drive Yedekleme Servisi (V3 - Deep Linking Destekli)
 * ✅ Google plugin gerekmez
 * ✅ Android / Web aynı kod
 * ✅ Google Drive AppFolder kullanır (Gizli ve güvenli)
 * ✅ Deep Link (https://localhost) desteği ile APK'da çalışır
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';

const CLIENT_ID = '971204589871-r2gf4ca92i7om90ffijlgns165sng61k.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const STORAGE_KEY = 'google_drive_token';
const USER_KEY = 'google_drive_user';

export interface GoogleUser {
  email: string;
  name: string;
  imageUrl: string;
  accessToken: string;
}

export interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
}

class GoogleDriveService {
  private accessToken: string | null = null;
  private user: GoogleUser | null = null;

  constructor() {
    this.handleRedirect();
    
    // Android için Deep Link dinleyicisi ekle
    if (Capacitor.isNativePlatform()) {
      App.addListener('appUrlOpen', (event) => {
        if (event.url.includes('access_token')) {
          this.parseHash(new URL(event.url).hash);
        }
      });
    }
  }

  // URL'deki token'ı yakalar
  private async handleRedirect() {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      await this.parseHash(hash);
    }
  }

  private async parseHash(hash: string) {
    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    if (token) {
      this.accessToken = token;
      await Preferences.set({ key: STORAGE_KEY, value: token });
      await this.fetchUserInfo(token);
      // Hash'i temizle
      window.history.replaceState(null, '', window.location.pathname);
      // Uygulamayı yenileyerek state'i güncelle
      window.location.reload();
    }
  }

  private async fetchUserInfo(token: string) {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        this.user = {
          email: data.email,
          name: data.name,
          imageUrl: data.picture,
          accessToken: token
        };
        await Preferences.set({ key: USER_KEY, value: JSON.stringify(this.user) });
      } else if (res.status === 401) {
        await this.signOut();
      }
    } catch (e) {
      console.error('User info fetch error', e);
    }
  }

  async init(): Promise<GoogleUser | null> {
    const { value: token } = await Preferences.get({ key: STORAGE_KEY });
    const { value: userStr } = await Preferences.get({ key: USER_KEY });
    
    if (token && userStr) {
      this.accessToken = token;
      this.user = JSON.parse(userStr);
      // Token hala geçerli mi kontrol et
      await this.fetchUserInfo(token);
      return this.user;
    }
    return null;
  }

  async signIn() {
    // Android'de redirect_uri sonuna / eklemek bazen eşleşmeyi kolaylaştırır
    const redirectUri = Capacitor.isNativePlatform() 
      ? 'https://localhost/' 
      : window.location.origin;

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'token',
      scope: SCOPES,
      include_granted_scopes: 'true',
      prompt: 'select_account'
    });

    const url = `${AUTH_URL}?${params.toString()}`;
    window.location.href = url;
  }

  async signOut() {
    this.accessToken = null;
    this.user = null;
    await Preferences.remove({ key: STORAGE_KEY });
    await Preferences.remove({ key: USER_KEY });
  }

  async listBackups(): Promise<DriveFile[]> {
    if (!this.accessToken) return [];
    try {
      const q = encodeURIComponent("trashed = false");
      const url = `${DRIVE_API}?spaces=appDataFolder&q=${q}&fields=files(id, name, createdTime)&orderBy=createdTime desc`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
      
      if (res.status === 401) {
        await this.signOut();
        return [];
      }
      
      const data = await res.json();
      return data.files || [];
    } catch (error) {
      return [];
    }
  }

  async uploadBackup(jsonData: string): Promise<boolean> {
    if (!this.accessToken) return false;
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
      const metadata = {
        name: `backup_${timestamp}.json`,
        mimeType: 'application/json',
        parents: ['appDataFolder']
      };

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', new Blob([jsonData], { type: 'application/json' }));

      const res = await fetch(`${DRIVE_UPLOAD_API}?uploadType=multipart`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.accessToken}` },
        body: formData
      });
      
      return res.ok;
    } catch (error) {
      return false;
    }
  }

  async downloadBackup(fileId: string): Promise<string | null> {
    if (!this.accessToken) return null;
    try {
      const res = await fetch(`${DRIVE_API}/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
      return res.ok ? await res.text() : null;
    } catch (error) {
      return null;
    }
  }

  async deleteBackup(fileId: string): Promise<boolean> {
    if (!this.accessToken) return false;
    try {
      const res = await fetch(`${DRIVE_API}/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
      return res.ok;
    } catch (error) {
      return false;
    }
  }

  getUser() { return this.user; }
}

export const googleDriveService = new GoogleDriveService();
