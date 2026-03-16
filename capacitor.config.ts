import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.efek0349.mesaitakip',
  appName: 'Mesai Takip',
  webDir: 'dist',
  bundledWebRuntime: false,
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
      backgroundColor: '#3B82F6'
    },
    Share: {
      // Share plugin ayarları
    },
    GoogleAuth: {
      scopes: ["email", "profile", "openid", "https://www.googleapis.com/auth/drive.file"],
      serverClientId: "971204589871-r2gf4ca92i7om90ffijlgns165sng61k.apps.googleusercontent.com",
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