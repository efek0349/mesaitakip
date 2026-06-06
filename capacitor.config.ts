import { CapacitorConfig } from '@capacitor/cli';

// capacitor.config.ts build sırasında değil, doğrudan Node.js ile çalışır
// Bu yüzden import.meta.env yerine process.env kullanıyoruz
import * as dotenv from 'dotenv';
dotenv.config();

const config: CapacitorConfig = {
  appId: 'com.efek0349.mesaitakip',
  appName: 'Mesai Takip',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#3B82F6',
      showSpinner: false
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '#3B82F6',
      overlaysWebView: false
    },
    Share: {},
    GoogleAuth: {
      scopes: ["email", "profile", "openid", "https://www.googleapis.com/auth/drive.file"],
      serverClientId: process.env.VITE_GOOGLE_WEB_CLIENT_ID,
      forceCodeForRefreshToken: true
    }
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined
    }
  }
};

export default config;
