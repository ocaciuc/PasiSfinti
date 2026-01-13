import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.ee3834849f11481bad7f08d619b104bd',
  appName: 'pasi-comunitate-sfanta',
  webDir: 'dist',
  // Deep link configuration for OAuth callbacks
  plugins: {
    App: {
      // Configure URL scheme for deep linking
      // The app will respond to URLs like: pelerinaj://auth/callback
    }
  },
  android: {
    // Android will use the custom URL scheme defined in AndroidManifest.xml
  }
};

export default config;
