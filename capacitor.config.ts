import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.ee3834849f11481bad7f08d619b104bd',
  appName: 'pasi-comunitate-sfanta',
  webDir: 'dist',
  server: {
    url: 'https://ee383484-9f11-481b-ad7f-08d619b104bd.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  // Deep link configuration for OAuth callbacks
  plugins: {
    App: {
      // Configure URL scheme for deep linking
      // The app will respond to URLs like: pelerinaj://auth/callback
    }
  },
  android: {
    // Android will use the custom URL scheme defined in AndroidManifest.xml
    allowMixedContent: true
  }
};

export default config;
