import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.crunchytimes.app',
  appName: 'Crunchy Times',
  webDir: 'out',
  server: {
    url: 'https://crunchy-time.vercel.app/',
    cleartext: true
  }
};

export default config;
