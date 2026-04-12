/**
 *  Google Drive Yedekleme Servisi
 *  Android: Kalıcı Oturum (Refresh Token)
 *  Web: Geçici Oturum (Token Flow - Secret gerektirmez)
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Dialog } from '@capacitor/dialog';

const CLIENT_ID = Capacitor.isNativePlatform()
  ? '971204589871-5r68r9ut9ou73r9aie1enblcpbmf7rm5.apps.googleusercontent.com' // Android Client ID
  : '971204589871-r2gf4ca92i7om90ffijlgns165sng61k.apps.googleusercontent.com'; // Web Client ID

const SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';

const STORAGE_KEY = 'gd_access';
const REFRESH_TOKEN_KEY = 'gd_refresh';
const EXPIRES_AT_KEY = 'gd_exp';
const USER_KEY = 'gd_user';
const CODE_VERIFIER_KEY = 'gd_cv';

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
  private expiresAt: number = 0;
  private isProcessing = false;

  constructor() {
    this.initNativeListeners();
    this.handleRedirect();
  }

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

  private async initNativeListeners() {
    if (Capacitor.isNativePlatform()) {
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
  }

  private async handleRedirect() {
    if (Capacitor.isNativePlatform()) return;

    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    // Web'de Implicit Flow (token) veya Code Flow (code) gelebilir
    const token = url.searchParams.get('access_token') || hashParams.get('access_token');
    const expiresIn = url.searchParams.get('expires_in') || hashParams.get('expires_in');
    const code = url.searchParams.get('code');

    if (token) {
      await this.saveTokens({ access_token: token, expires_in: parseInt(expiresIn || '3600') });
      await this.fetchUserInfo(token);
      window.history.replaceState({}, document.title, window.location.pathname);
      window.location.reload();
    } else if (code) {
      await this.handleCode(code);
    }
  }

  private async handleCode(code: string) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const { value: verifier } = await Preferences.get({ key: CODE_VERIFIER_KEY });
      if (!verifier) throw new Error('Oturum anahtarı bulunamadı.');

      const redirectUri = Capacitor.isNativePlatform()
        ? 'com.efek0349.mesaitakip:/oauth2redirect'
        : window.location.origin + window.location.pathname;

      const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          code,
          code_verifier: verifier,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri
        })
      });

      const data = await res.json();
      if (res.ok) {
        await this.saveTokens(data);
        await this.fetchUserInfo(data.access_token);
        await Preferences.remove({ key: CODE_VERIFIER_KEY });
        if (Capacitor.isNativePlatform()) {
          await Dialog.alert({ title: 'Başarılı', message: 'Google Drive bağlantısı kuruldu!' });
          window.location.href = '/';
        } else {
          window.history.replaceState({}, document.title, window.location.pathname);
          window.location.reload();
        }
      } else {
        throw new Error(data.error_description || data.error);
      }
    } catch (e: any) {
      if (Capacitor.isNativePlatform()) {
        await Dialog.alert({ title: 'Giriş Hatası', message: e.message });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async saveTokens(data: any) {
    this.accessToken = data.access_token;
    this.expiresAt = Date.now() + (data.expires_in * 1000);
    await Preferences.set({ key: STORAGE_KEY, value: data.access_token });
    await Preferences.set({ key: EXPIRES_AT_KEY, value: this.expiresAt.toString() });
    if (data.refresh_token) {
      await Preferences.set({ key: REFRESH_TOKEN_KEY, value: data.refresh_token });
    }
  }

  private async refresh() {
    const { value: refresh } = await Preferences.get({ key: REFRESH_TOKEN_KEY });
    if (!refresh) return false;

    try {
      const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          grant_type: 'refresh_token',
          refresh_token: refresh
        })
      });
      if (!res.ok) {
        if (res.status === 400 || res.status === 401) await this.signOut();
        return false;
      }
      const data = await res.json();
      await this.saveTokens(data);
      return true;
    } catch (e) {
      return false;
    }
  }

  async init(): Promise<GoogleUser | null> {
    const { value: token } = await Preferences.get({ key: STORAGE_KEY });
    const { value: exp } = await Preferences.get({ key: EXPIRES_AT_KEY });
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
    this.expiresAt = parseInt(exp);
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

    if (!this.user && this.accessToken) await this.fetchUserInfo(this.accessToken);
    return this.user;
  }

  async signIn() {
    const redirectUri = Capacitor.isNativePlatform()
      ? 'com.efek0349.mesaitakip:/oauth2redirect'
      : window.location.origin + window.location.pathname;

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      scope: SCOPES,
    });

    if (Capacitor.isNativePlatform()) {
      // ANDROID: Code Flow + PKCE (Secret gerekmez, Refresh Token verir)
      const verifier = this.randomString(64);
      const challenge = await this.sha256(verifier);
      await Preferences.set({ key: CODE_VERIFIER_KEY, value: verifier });

      params.set('response_type', 'code');
      params.set('access_type', 'offline');
      params.set('prompt', 'consent select_account');
      params.set('code_challenge', challenge);
      params.set('code_challenge_method', 'S256');
    } else {
      // WEB: Token Flow (Secret gerekmez, Refresh Token VERMEZ ama çalışır)
      params.set('response_type', 'token');
      params.set('prompt', 'select_account');
    }

    window.location.href = `${AUTH_URL}?${params.toString()}`;
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
      }
    } catch (e) {
      console.error('User info error', e);
    }
  }

  async signOut() {
    this.accessToken = null;
    this.user = null;
    this.expiresAt = 0;
    await Preferences.remove({ key: STORAGE_KEY });
    await Preferences.remove({ key: REFRESH_TOKEN_KEY });
    await Preferences.remove({ key: USER_KEY });
    await Preferences.remove({ key: CODE_VERIFIER_KEY });
    await Preferences.remove({ key: EXPIRES_AT_KEY });
  }

  private async apiRequest(url: string, options: any = {}): Promise<Response> {
    if (!this.accessToken || Date.now() > this.expiresAt - 60000) {
      const ok = await this.refresh();
      if (!ok) {
        await this.signOut();
        throw new Error('Oturum kapalı');
      }
    }

    let res = await fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${this.accessToken}` }
    });

    if (res.status === 401) {
      const ok = await this.refresh();
      if (ok) {
        res = await fetch(url, {
          ...options,
          headers: { ...options.headers, Authorization: `Bearer ${this.accessToken}` }
        });
      } else {
        await this.signOut();
        throw new Error('Oturum süresi doldu');
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
    } catch (error) { return []; }
  }

  async uploadBackup(jsonData: string): Promise<boolean> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
      const metadata = { name: `backup_${timestamp}.json`, mimeType: 'application/json', parents: ['appDataFolder'] };
      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', new Blob([jsonData], { type: 'application/json' }));
      const res = await this.apiRequest(`${DRIVE_UPLOAD_API}?uploadType=multipart`, { method: 'POST', body: formData });
      return res.ok;
    } catch (error) { return false; }
  }

  async downloadBackup(fileId: string): Promise<string | null> {
    try {
      const res = await this.apiRequest(`${DRIVE_API}/${fileId}?alt=media`);
      return res.ok ? await res.text() : null;
    } catch (error) { return null; }
  }

  async deleteBackup(fileId: string): Promise<boolean> {
    try {
      const res = await this.apiRequest(`${DRIVE_API}/${fileId}`, { method: 'DELETE' });
      return res.ok;
    } catch (error) { return false; }
  }

  getUser() { return this.user; }
}

export const googleDriveService = new GoogleDriveService();
