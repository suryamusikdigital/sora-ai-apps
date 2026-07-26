import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sora.ai.android',
  appName: 'Sora AI',
  webDir: 'dist',
  android: {
    webContentsDebuggingEnabled: true,
    allowMixedContent: true
  },
  server: {
    cleartext: true,
    // url: 'http://localhost:3001' // Commented out to use bundled files instead of live server
  }
};

export default config;
