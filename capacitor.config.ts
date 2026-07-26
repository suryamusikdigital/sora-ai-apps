import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sora.ai.android',
  appName: 'Sora AI',
  webDir: 'dist',
  android: {
    webContentsDebuggingEnabled: true,
    allowMixedContent: true
  }
};

export default config;
