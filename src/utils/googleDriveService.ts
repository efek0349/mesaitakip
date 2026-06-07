/**
 *  Google Drive Yedekleme Servisi
 *  Android : Kalıcı Oturum (PKCE + Refresh Token, doğrudan Google)
 *  Web     : Kalıcı Oturum (PKCE + Refresh Token, Cloudflare Worker)
 *  Tauri   : Kalıcı Oturum (Loopback 127.0.0.1:7890, Rust TCP listener)
 */

/* global RequestInit */
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Dialog } from '@capacitor/dialog';

// Platform tespiti
const IS_NATIVE = Capacitor.isNativePlatform();
//const IS_TAURI  = '__TAURI__' in window;
const IS_TAURI =
  typeof window !== "undefined" &&
  window.location.hostname === "tauri.localhost";

const CLIENT_ID = IS_NATIVE
  ? import.meta.env.VITE_GOOGLE_ANDROID_CLIENT_ID
  : import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID;

// Desktop için ayrı Client ID (Google Console'da "Desktop app" tipi oluşturulmalı)
const DESKTOP_CLIENT_ID = (import.meta.env.VITE_GOOGLE_DESKTOP_CLIENT_ID as string) || CLIENT_ID;

// Cloudflare Worker URL — web'de token exchange burada yapılır
const WORKER_URL = import.meta.env.VITE_WORKER_URL?.replace(/\/$/, '');

// Tauri loopback — Google Console'da http://127.0.0.1:7890 kayıtlı olmalı
const LOOPBACK_PORT = 7890;
const LOOPBACK_URI  = `http://127.0.0.1:${LOOPBACK_PORT}`;

const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
const AUTH_URL         = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL        = 'https://oauth2.googleapis.com/token';
const DRIVE_API        = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';

const STORAGE_KEY       = 'gd_access';
const REFRESH_TOKEN_KEY = 'gd_refresh';
const EXPIRES_AT_KEY    = 'gd_exp';
const USER_KEY          = 'gd_user';
const CODE_VERIFIER_KEY = 'gd_cv';

export interface GoogleUser {
  email: string;
  name: string;
  imageUrl: string;
}

export interface DriveFile {
  id: string;
  name: string;
  createdTime: string;
}

class GoogleDriveService {
  private accessToken: string | null = null;
  private user: GoogleUser | null = null;
  private expiresAt: number = 0;
  private isProcessing = false;
  private listenersInitialized = false;
  private initPromise: Promise<GoogleUser | null> | null = null;

  private randomString(length: number) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    return Array.from(crypto.getRandomValues(new Uint8Array(length)))
      .map(x => chars[x % chars.length])
      .join('');
  }

  private async sha256(str: string) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return btoa(String.fromCharCode(...new Uint8Array(buf)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // Redirect URI — platforma göre
  private getRedirectUri(): string {
    if (IS_NATIVE) return 'com.efek0349.mesaitakip:/oauth2redirect';
    if (IS_TAURI)  return LOOPBACK_URI;
    return window.location.origin; // + window.location.pathname;
  }

  // Aktif Client ID — platforma göre
  private getClientId(): string {
    if (IS_NATIVE) return CLIENT_ID;
    if (IS_TAURI)  return DESKTOP_CLIENT_ID;
    return CLIENT_ID;
  }

  private async initNativeListeners() {
    if (this.listenersInitialized || !IS_NATIVE) return;
    this.listenersInitialized = true;
    try {
      const { App } = await import('@capacitor/app');
      App.addListener('appUrlOpen', async (event) => {
        const url = new URL(event.url);
        const code = url.searchParams.get('code');
        if (code) await this.handleCode(code);
      });
      const launchUrl = await App.getLaunchUrl();
      if (launchUrl?.url) {
        const url = new URL(launchUrl.url);
        const code = url.searchParams.get('code');
        if (code) await this.handleCode(code);
      }
    } catch (e) {
      console.warn('App plugin error', e);
    }
  }

  // Tauri: Rust TCP listener'ı başlat, oauth-code event'ini bekle
  private async startLoopbackListener(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Google girişi zaman aşımına uğradı (5 dakika)'));
      }, 5 * 60 * 1000);

      Promise.all([
        import('@tauri-apps/api/event'),
        import('@tauri-apps/api/core'),
      ]).then(([{ listen }, { invoke }]) => {
        // Rust'tan gelen code event'ini dinle
        listen<string>('oauth-code', async (event) => {
          clearTimeout(timeout);
          try {
            await this.handleCode(event.payload);
            resolve();
          } catch (e) {
            reject(e);
          }
        });

        // Kullanıcı iptal ettiyse
        listen<string>('oauth-error', (event) => {
          clearTimeout(timeout);
          reject(new Error(`Google OAuth hatası: ${event.payload}`));
        });

        // Rust tarafında TCP listener başlat
        invoke('start_oauth_listener').catch(reject);
      }).catch(reject);
    });
  }

  private async handleRedirect() {
    // Native ve Tauri'de bu flow çalışmaz
    if (IS_NATIVE || IS_TAURI) return;

    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    if (code) {
      await this.handleCode(code);
    }
    // Eski implicit flow hash temizliği
    if (window.location.hash.includes('access_token=')) {
      window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
    }
  }

  // Token exchange — platforma göre doğru endpoint'e gider
  private async exchangeToken(params: Record<string, string>): Promise<Response> {
    if (IS_NATIVE) {
      // Android: Google'a direkt (PKCE, client_secret gerekmez)
      return fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params)
      });
    }

    if (IS_TAURI) {
      // Desktop: Google'a direkt (Desktop app client, PKCE)
      // Desktop client type PKCE ile client_secret gerektirmez
      return fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params)
      });
    }

    // Web: Cloudflare Worker üzerinden (client_secret Worker'da güvenli)
    if (!WORKER_URL) throw new Error('VITE_WORKER_URL tanımlanmamış');
    return fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
  }

  private async handleCode(code: string) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const { value: verifier } = await Preferences.get({ key: CODE_VERIFIER_KEY });
      if (!verifier) {
        this.isProcessing = false;
        return;
      }

      const redirectUri = this.getRedirectUri();
      const clientId    = this.getClientId();

      const res = await this.exchangeToken({
        client_id:     clientId,
        code,
        grant_type:    'authorization_code',
        redirect_uri:  redirectUri,
        code_verifier: verifier
      });

      const data = await res.json();

      if (res.ok) {
        await this.saveTokens(data);
        await this.fetchUserInfo(data.access_token);
        await Preferences.remove({ key: CODE_VERIFIER_KEY });

        if (IS_NATIVE) {
          await Dialog.alert({ title: 'Başarılı', message: 'Google Drive bağlantısı kuruldu!' });
          window.location.href = '/';
        } else if (IS_TAURI) {
          // Tauri'de sayfa reload yok — event ile UI'ı güncelle
          window.dispatchEvent(new CustomEvent('google-auth-success'));
        } else {
          window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
          window.location.reload();
        }
      } else {
        throw new Error(data.error_description || data.error);
      }
    } catch (e: any) {
      console.error('Login error', e);
      if (IS_NATIVE) {
        await Dialog.alert({ title: 'Giriş Hatası', message: e.message });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async saveTokens(data: { access_token: string; expires_in: number; refresh_token?: string }) {
    if (!data.access_token) return;

    this.accessToken = data.access_token;
    this.expiresAt   = Date.now() + (Number(data.expires_in || 3600) * 1000);

    await Preferences.set({ key: STORAGE_KEY,    value: data.access_token });
    await Preferences.set({ key: EXPIRES_AT_KEY, value: this.expiresAt.toString() });

    if (data.refresh_token) {
      await Preferences.set({ key: REFRESH_TOKEN_KEY, value: data.refresh_token });
    }
  }

  private async refresh(): Promise<boolean> {
    const { value: refresh } = await Preferences.get({ key: REFRESH_TOKEN_KEY });
    if (!refresh) return false;

    try {
      const res = await this.exchangeToken({
        client_id:     this.getClientId(),
        grant_type:    'refresh_token',
        refresh_token: refresh
      });

      if (!res.ok) {
        if (res.status === 400 || res.status === 401) {
          await this.signOut();
        }
        return false;
      }

      const data = await res.json();
      await this.saveTokens(data);
      return true;
    } catch {
      return false;
    }
  }

  async init(): Promise<GoogleUser | null> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        await this.initNativeListeners();
        await this.handleRedirect();

        const { value: token }   = await Preferences.get({ key: STORAGE_KEY });
        const { value: exp }     = await Preferences.get({ key: EXPIRES_AT_KEY });
        const { value: userStr } = await Preferences.get({ key: USER_KEY });

        if (!token || !exp) {
          const { value: hasRefresh } = await Preferences.get({ key: REFRESH_TOKEN_KEY });
          if (hasRefresh) {
            const ok = await this.refresh();
            if (ok && this.accessToken) {
              await this.fetchUserInfo(this.accessToken);
              return this.user;
            }
          }
          return null;
        }

        this.accessToken = token;
        this.expiresAt   = parseInt(exp);
        if (userStr) this.user = JSON.parse(userStr);

        if (Date.now() > this.expiresAt - 60000) {
          const ok = await this.refresh();
          if (ok && this.accessToken) {
            await this.fetchUserInfo(this.accessToken);
            return this.user;
          }
          await this.signOut();
          return null;
        }

        if (!this.user && this.accessToken) {
          await this.fetchUserInfo(this.accessToken);
        }

        return this.user;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  async signIn() {
    const redirectUri = this.getRedirectUri();
    const clientId    = this.getClientId();

    const verifier  = this.randomString(64);
    const challenge = await this.sha256(verifier);
    await Preferences.set({ key: CODE_VERIFIER_KEY, value: verifier });

    const params = new URLSearchParams({
      client_id:             clientId,
      redirect_uri:          redirectUri,
      scope:                 SCOPES,
      response_type:         'code',
      prompt:                'consent select_account',
      code_challenge:        challenge,
      code_challenge_method: 'S256',
      access_type:           'offline'
    });

    if (IS_TAURI) {
      // Sistem tarayıcısını aç, loopback listener başlat
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(`${AUTH_URL}?${params.toString()}`);
      // Rust TCP server code'u yakalar ve 'oauth-code' event'i gönderir
      await this.startLoopbackListener();
    } else {
      window.location.href = `${AUTH_URL}?${params.toString()}`;
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
          email:    data.email,
          name:     data.name,
          imageUrl: data.picture
        };
        await Preferences.set({ key: USER_KEY, value: JSON.stringify(this.user) });
      }
    } catch (e) {
      console.error('User info error', e);
    }
  }

  async signOut() {
    this.accessToken = null;
    this.user        = null;
    this.expiresAt   = 0;
    await Promise.all([
      Preferences.remove({ key: STORAGE_KEY }),
      Preferences.remove({ key: REFRESH_TOKEN_KEY }),
      Preferences.remove({ key: USER_KEY }),
      Preferences.remove({ key: CODE_VERIFIER_KEY }),
      Preferences.remove({ key: EXPIRES_AT_KEY }),
    ]);
  }

  private async apiRequest(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.accessToken || Date.now() > this.expiresAt - 60000) {
      const ok = await this.refresh();
      if (!ok) {
        await this.signOut();
        throw new Error('Oturum kapalı. Lütfen tekrar giriş yapın.');
      }
    }

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${this.accessToken}`);

    let res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      const ok = await this.refresh();
      if (ok) {
        headers.set('Authorization', `Bearer ${this.accessToken}`);
        res = await fetch(url, { ...options, headers });
      } else {
        await this.signOut();
        throw new Error('Oturum süresi doldu. Lütfen tekrar giriş yapın.');
      }
    }

    return res;
  }

  async listBackups(): Promise<DriveFile[]> {
    try {
      const q   = encodeURIComponent("name contains 'backup_' and trashed = false");
      const url = `${DRIVE_API}?q=${q}&fields=files(id, name, createdTime)&orderBy=createdTime desc`;
      const res = await this.apiRequest(url);
      const data = await res.json();
      return data.files || [];
    } catch { return []; }
  }

  async uploadBackup(jsonData: string): Promise<boolean> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
      const metadata  = { name: `backup_${timestamp}.json`, mimeType: 'application/json' };
      const formData  = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file',     new Blob([jsonData],                  { type: 'application/json' }));
      const res = await this.apiRequest(`${DRIVE_UPLOAD_API}?uploadType=multipart`, { method: 'POST', body: formData });
      return res.ok;
    } catch { return false; }
  }

  async downloadBackup(fileId: string): Promise<string | null> {
    try {
      const res = await this.apiRequest(`${DRIVE_API}/${fileId}?alt=media`);
      return res.ok ? await res.text() : null;
    } catch { return null; }
  }

  async deleteBackup(fileId: string): Promise<boolean> {
    try {
      const res = await this.apiRequest(`${DRIVE_API}/${fileId}`, { method: 'DELETE' });
      return res.ok;
    } catch { return false; }
  }

  getUser() { return this.user; }

  getSessionRemainingMinutes(): number | null {
    if (!this.accessToken || !this.expiresAt) return null;
    const remaining = this.expiresAt - Date.now();
    if (remaining <= 0) return 0;
    return Math.floor(remaining / 60000);
  }

  isSessionExpired(): boolean {
    if (!this.expiresAt) return true;
    return Date.now() > this.expiresAt;
  }
}

export const googleDriveService = new GoogleDriveService();
