# Android App Assets Setup

This guide explains how to configure the app icon and splash screen for Android using Capacitor.

## Assets Location

The production-ready branding assets are located in the `public/` folder:
- `public/app-icon.png` - Main app icon
- `public/app-icon-foreground.png` - Foreground layer for adaptive icons
- `public/splash.png` - Splash screen image

## Android Configuration

After running `npx cap sync android`, configure the assets in Android Studio:

### 1. App Icon (Adaptive Icon)

1. Open the Android project in Android Studio
2. Right-click `app/src/main/res` → **New** → **Image Asset**
3. Select **Launcher Icons (Adaptive and Legacy)**
4. For **Foreground Layer**: 
   - Select **Image** and browse to `public/app-icon-foreground.png`
5. For **Background Layer**:
   - Select **Color** and use `#4B0082` (Indigo - brand primary color)
6. Click **Next** → **Finish**

### 2. Splash Screen

Add to `android/app/src/main/res/values/styles.xml`:

```xml
<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
    <item name="windowSplashScreenBackground">#4B0082</item>
    <item name="windowSplashScreenAnimatedIcon">@drawable/splash</item>
    <item name="windowSplashScreenAnimationDuration">200</item>
    <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
</style>
```

Copy the splash image:
```bash
cp public/splash.png android/app/src/main/res/drawable/splash.png
```

### 3. Capacitor Splash Screen Plugin (Optional)

For more control, install the Capacitor Splash Screen plugin:

```bash
npm install @capacitor/splash-screen
npx cap sync
```

Add to `capacitor.config.ts`:
```typescript
plugins: {
  SplashScreen: {
    launchShowDuration: 2000,
    backgroundColor: "#4B0082",
    androidSplashResourceName: "splash",
    showSpinner: false,
  }
}
```

## Brand Colors Reference

- Primary (Indigo): `#4B0082`
- Earth Gold: `#C7A44A`
- Soft Clay: `#C9B49A`
- Stone Grey: `#A9A9A9`
