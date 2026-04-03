/**
 * Google Drive Yedekleme Servisi
 * ✅ Google plugin gerekmez
 * ✅ Android / Web aynı kod
 * ✅ Google Drive AppFolder kullanır (Gizli ve güvenli)
 * ✅ Deep Link (https://localhost) desteği ile APK'da çalışır
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const CLIENT_ID = (!Capacitor.isNativePlatform() || isLocalhost)
  ? '971204589871-r2gf4ca92i7om90ffijlgns165sng61k.apps.googleusercontent.com' // Web Client ID
  : '971204589871-5r68r9ut9ou73r9aie1enblcpbmf7rm5.apps.googleusercontent.com'; // Android Client ID

const SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const STORAGE_KEY = 'google_drive_token';
const REFRESH_TOKEN_KEY = 'google_drive_refresh_token';
const USER_KEY = 'google_drive_user';
const CODE_VERIFIER_KEY = 'google_drive_code_verifier';

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
    if (!Capacitor.isNativePlatform() || isLocalhost) {
      this.handleRedirect();
    }
    this.initNativeListeners();
  }

  // PKCE Helpers
  private generateRandomString(length: number) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const values = new Uint32Array(length);
    window.crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      result += charset[values[i] % charset.length];
    }
    return result;
  }

  private async generateCodeChallenge(codeVerifier: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    const base64Digest = btoa(String.fromCharCode(...new Uint8Array(digest)));
    return base64Digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // Android için Deep Link dinleyicisi ekle
  private async initNativeListeners() {
    if (Capacitor.isNativePlatform()) {
      try {
        const { App } = await import('@capacitor/app');
        App.addListener('appUrlOpen', async (event) => {
          const url = new URL(event.url);
          // Hem code hem access_token kontrolü
          const code = url.searchParams.get('code') || new URLSearchParams(url.hash.substring(1)).get('code');
          const token = url.searchParams.get('access_token') || new URLSearchParams(url.hash.substring(1)).get('access_token');
          
          if (code) await this.handleCode(code);
          else if (token) await this.parseToken(token);
        });
      } catch (e) {
        console.warn('Capacitor App plugin yüklenemedi, deep link çalışmayabilir.');
      }
    }
  }

  // URL'deki code veya token'ı yakalar
  private async handleRedirect() {
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    const code = url.searchParams.get('code') || hashParams.get('code');
    const token = url.searchParams.get('access_token') || hashParams.get('access_token');

    if (code) {
      await this.handleCode(code);
    } else if (token) {
      await this.parseToken(token);
    }
  }

  // Web için (Implicit Flow) token işleme
  private async parseToken(token: string) {
    this.accessToken = token;
    await Preferences.set({ key: STORAGE_KEY, value: token });
    await this.fetchUserInfo(token);
    window.history.replaceState(null, '', window.location.origin + window.location.pathname);
    window.location.reload();
  }

  private async handleCode(code: string) {
    // Sadece Native platformda code flow kullan (Web'de secret hatası verir)
    const isNative = Capacitor.isNativePlatform() && !isLocalhost;
    if (!isNative) {
      console.warn('Web platformunda code flow desteklenmiyor, lütfen token akışını kullanın.');
      return;
    }

    const redirectUri = 'com.efek0349.mesaitakip:/oauth2redirect';
    const { value: codeVerifier } = await Preferences.get({ key: CODE_VERIFIER_KEY });
    if (!codeVerifier) return;
    
    // ... rest of the code logic stays the same but within this protection ...

    try {
      const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          code: code,
          code_verifier: codeVerifier,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        this.accessToken = data.access_token;
        await Preferences.set({ key: STORAGE_KEY, value: data.access_token });
        if (data.refresh_token) {
          await Preferences.set({ key: REFRESH_TOKEN_KEY, value: data.refresh_token });
        }
        await this.fetchUserInfo(data.access_token);
        
        await Preferences.remove({ key: CODE_VERIFIER_KEY });
        
        // URL'yi temizle ve yenile (reload yerine kesin yönlendirme)
        const cleanUrl = window.location.origin + window.location.pathname;
        window.location.href = cleanUrl;
      } else {
        console.error('Google Token Error Details:', data);
        // Hata durumunda kodun URL'den temizlenmesi gerekir ki sonsuz döngüye girmesin
        if (data.error === 'invalid_grant') {
           await Preferences.remove({ key: CODE_VERIFIER_KEY });
           window.history.replaceState(null, '', window.location.origin + window.location.pathname);
        }
      }
    } catch (e) {
      console.error('Token exchange request failed', e);
    }
  }

  private async refreshAccessToken() {
    const { value: refreshToken } = await Preferences.get({ key: REFRESH_TOKEN_KEY });
    if (!refreshToken) return false;

    try {
      const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        this.accessToken = data.access_token;
        await Preferences.set({ key: STORAGE_KEY, value: data.access_token });
        if (data.refresh_token) {
          await Preferences.set({ key: REFRESH_TOKEN_KEY, value: data.refresh_token });
        }
        return true;
      } else if (res.status === 400 || res.status === 401) {
        // Refresh token geçersiz ise çıkış yap
        await this.signOut();
      }
    } catch (e) {
      console.error('Token refresh error', e);
    }
    return false;
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
        // Token geçersizse yenilemeyi dene (init içinde yapılıyor zaten ama güvenlik için)
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
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) {
          const refreshed = await this.refreshAccessToken();
          if (refreshed && this.accessToken) {
            await this.fetchUserInfo(this.accessToken);
            return this.user;
          }
          return null;
        }
      } catch (e) {
        return null;
      }
      
      return this.user;
    } else {
      // Sadece refresh token varsa yeni access token almayı dene
      const refreshed = await this.refreshAccessToken();
      if (refreshed && this.accessToken) {
        await this.fetchUserInfo(this.accessToken);
        return this.user;
      }
    }
    return null;
  }

  async signIn() {
    // Sadece gerçek bir Android/iOS cihazda isek ve localhost'ta değilsek PKCE kullan
    const isNative = Capacitor.isNativePlatform() && !isLocalhost;
    
    // APK'da (Android) https://localhost/ engellendiği için custom scheme kullanıyoruz
    const redirectUri = isNative 
      ? 'com.efek0349.mesaitakip:/oauth2redirect' 
      : window.location.origin + window.location.pathname;

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      scope: SCOPES,
      include_granted_scopes: 'true',
      prompt: 'consent select_account'
    });

    if (isNative) {
      // TELEFONDA (GERÇEK): Kalıcı oturum (Refresh Token) için Code Flow + PKCE
      const codeVerifier = this.generateRandomString(64);
      await Preferences.set({ key: CODE_VERIFIER_KEY, value: codeVerifier });
      const codeChallenge = await this.generateCodeChallenge(codeVerifier);

      params.set('response_type', 'code');
      params.set('access_type', 'offline');
      params.set('code_challenge', codeChallenge);
      params.set('code_challenge_method', 'S256');
    } else {
      // TARAYICIDA VEYA LOCALHOST TESTLERİNDE: Hata almamak için basit Token Flow
      params.set('response_type', 'token');
    }

    const url = `${AUTH_URL}?${params.toString()}`;
    window.location.href = url;
  }

  async signOut() {
    this.accessToken = null;
    this.user = null;
    await Preferences.remove({ key: STORAGE_KEY });
    await Preferences.remove({ key: REFRESH_TOKEN_KEY });
    await Preferences.remove({ key: USER_KEY });
    await Preferences.remove({ key: CODE_VERIFIER_KEY });
  }

  // API isteklerini otomatik refresh ile yapan yardımcı metod
  private async apiRequest(url: string, options: any = {}): Promise<Response> {
    if (!this.accessToken) {
      const refreshed = await this.refreshAccessToken();
      if (!refreshed) throw new Error('Oturum kapalı');
    }

    let res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${this.accessToken}`
      }
    });

    if (res.status === 401) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        res = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${this.accessToken}`
          }
        });
      }
    }

    return res;
  }

  async listBackups(): Promise<DriveFile[]> {
    try {
      const q = encodeURIComponent("trashed = false");
      const url = `${DRIVE_API}?spaces=appDataFolder&q=${q}&fields=files(id, name, createdTime)&orderBy=createdTime desc`;
      
      const res = await this.apiRequest(url);
      const data = await res.json();
      return data.files || [];
    } catch (error) {
      return [];
    }
  }

  async uploadBackup(jsonData: string): Promise<boolean> {
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

      const res = await this.apiRequest(`${DRIVE_UPLOAD_API}?uploadType=multipart`, {
        method: 'POST',
        body: formData
      });
      
      return res.ok;
    } catch (error) {
      return false;
    }
  }

  async downloadBackup(fileId: string): Promise<string | null> {
    try {
      const res = await this.apiRequest(`${DRIVE_API}/${fileId}?alt=media`);
      return res.ok ? await res.text() : null;
    } catch (error) {
      return null;
    }
  }

  async deleteBackup(fileId: string): Promise<boolean> {
    try {
      const res = await this.apiRequest(`${DRIVE_API}/${fileId}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (error) {
      return false;
    }
  }

  getUser() { return this.user; }
}

export const googleDriveService = new GoogleDriveService();
