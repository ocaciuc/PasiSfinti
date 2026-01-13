# Android App Icons and Splash Screen Setup

This document explains how to configure app icons and splash screen for the production Android build.

## Generated Assets

The following branding assets have been created in the `public/` folder:

| Asset | Size | Purpose |
|-------|------|---------|
| `app-icon.png` | 1024x1024 | Main app icon (Google Play Store) |
| `app-icon-foreground.png` | 1024x1024 | Foreground layer for adaptive icons |
| `splash.png` | 1280x1920 | Splash/launch screen |

## 1. App Icon Configuration

### Using Android Studio Asset Studio (Recommended)

1. Open the Android project in Android Studio:
   ```bash
   npx cap open android
   ```

2. Right-click on `app/src/main/res` → **New** → **Image Asset**

3. Configure the launcher icon:
   - **Icon Type**: Launcher Icons (Adaptive and Legacy)
   - **Name**: `ic_launcher`
   - **Foreground Layer**: 
     - Source Asset: Select `public/app-icon-foreground.png`
     - Scaling: Resize to 66%
   - **Background Layer**:
     - Color: `#4B0082` (Indigo - brand primary color)

4. Click **Next** → **Finish**

### Manual Method

Copy the generated icon files to the appropriate Android drawable folders:

```
android/app/src/main/res/
├── mipmap-hdpi/      (72x72)
├── mipmap-mdpi/      (48x48)
├── mipmap-xhdpi/     (96x96)
├── mipmap-xxhdpi/    (144x144)
├── mipmap-xxxhdpi/   (192x192)
└── mipmap-anydpi-v26/
    ├── ic_launcher.xml          (adaptive icon config)
    └── ic_launcher_round.xml
```

## 2. Splash Screen Configuration

### Install @capacitor/splash-screen

```bash
npm install @capacitor/splash-screen
npx cap sync
```

### Configure in capacitor.config.ts

Add splash screen configuration:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.ee3834849f11481bad7f08d619b104bd',
  appName: 'pasi-comunitate-sfanta',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#4B0082",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;
```

### Add Splash Screen Images

Copy `public/splash.png` to the Android drawable folders with appropriate sizes:

```
android/app/src/main/res/
├── drawable/splash.png           (default)
├── drawable-land-hdpi/           (800x480)
├── drawable-land-mdpi/           (480x320)
├── drawable-land-xhdpi/          (1280x720)
├── drawable-land-xxhdpi/         (1600x960)
├── drawable-land-xxxhdpi/        (1920x1080)
├── drawable-port-hdpi/           (480x800)
├── drawable-port-mdpi/           (320x480)
├── drawable-port-xhdpi/          (720x1280)
├── drawable-port-xxhdpi/         (960x1600)
└── drawable-port-xxxhdpi/        (1080x1920)
```

## 3. Google Play Store Assets

For Google Play Store submission, you'll also need:

| Asset | Size | Purpose |
|-------|------|---------|
| High-res icon | 512x512 PNG | Play Store listing |
| Feature graphic | 1024x500 PNG | Play Store featured image |
| Screenshots | Various | App preview images |

Use `public/app-icon.png` resized to 512x512 for the high-res icon.

## 4. Brand Colors Reference

| Color | Hex | Usage |
|-------|-----|-------|
| Primary (Indigo) | `#4B0082` | Background, adaptive icon background |
| Accent (Earth Gold) | `#C7A44A` | Icon foreground, highlights |
| Soft Clay | `#C9B49A` | Secondary elements |
| Stone Grey | `#A9A9A9` | Neutral elements |
| White | `#FFFFFF` | Text, light elements |

## 5. Quick Setup Commands

```bash
# After setting up assets
npm run build
npx cap sync android
npx cap open android  # Configure icons in Android Studio
npx cap run android   # Test on device/emulator
```
