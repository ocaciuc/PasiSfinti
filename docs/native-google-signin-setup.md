# Native Google Sign-In Setup Guide

This guide explains how to set up native Android Google Sign-In using Google Identity Services SDK.

## Overview

The app uses native Google Sign-In (One Tap) instead of browser-based OAuth. This provides:
- No browser or Chrome Custom Tab opened
- Faster, seamless sign-in experience  
- Better integration with device Google accounts
- Uses `signInWithIdToken` instead of OAuth redirects

## Prerequisites

1. **Google Cloud Project** with OAuth 2.0 credentials
2. **Android Studio** for native code compilation
3. **SHA-1 fingerprint** of your signing key

## Setup Steps

### 1. Get Your SHA-1 Fingerprint

For debug builds:
```bash
cd android
./gradlew signingReport
```

For release builds, use your release keystore:
```bash
keytool -list -v -keystore your-release-key.keystore -alias your-alias
```

### 2. Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (same one used in Supabase)
3. Navigate to **APIs & Services > Credentials**

4. **Create Android OAuth Client ID** (if not exists):
   - Application type: Android
   - Package name: `app.lovable.ee3834849f11481bad7f08d619b104bd`
   - SHA-1 certificate fingerprint: Your debug/release SHA-1

5. **Note your Web Client ID** (NOT Android Client ID):
   - This is used in the app code
   - It's the same one configured in Supabase
   - Looks like: `XXXX.apps.googleusercontent.com`

### 3. Update Web Client ID in Code

Edit `src/lib/native-google-signin.ts` and update:

```typescript
const GOOGLE_WEB_CLIENT_ID = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';
```

### 4. Add Google Play Services to Gradle

Edit `android/app/build.gradle`:

```gradle
dependencies {
    // ... existing dependencies
    
    // Google Identity Services (One Tap)
    implementation 'com.google.android.gms:play-services-auth:21.0.0'
}
```

### 5. Register the Plugin in MainActivity

Edit `android/app/src/main/java/app/lovable/ee3834849f11481bad7f08d619b104bd/MainActivity.kt`:

```kotlin
package app.lovable.ee3834849f11481bad7f08d619b104bd

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        // Register the native Google Sign-In plugin
        registerPlugin(GoogleSignInPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
```

### 6. Build and Test

```bash
# Pull latest code
git pull

# Install dependencies
npm install

# Build web assets
npm run build

# Sync with Android
npx cap sync android

# Run on device/emulator
npx cap run android
```

## How It Works

1. User taps "Continue with Google" button
2. Native One Tap UI appears (no browser)
3. User selects their Google account
4. App receives Google ID Token
5. App calls `supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })`
6. Supabase verifies the token and creates/returns session
7. User is authenticated!

## Troubleshooting

### "One Tap sign-in failed"
- Ensure SHA-1 is correctly registered in Google Cloud Console
- Check that package name matches exactly
- Verify the Web Client ID is correct (not Android Client ID)

### "No ID token received"
- User may have cancelled the sign-in
- Check logcat for detailed error messages

### "Supabase signInWithIdToken error"
- Verify Web Client ID matches Supabase Google provider settings
- Check Supabase Dashboard > Auth > Providers > Google is enabled

## Files Overview

| File | Purpose |
|------|---------|
| `GoogleSignInPlugin.kt` | Native Android Kotlin plugin |
| `src/lib/native-google-signin.ts` | JavaScript bridge and Supabase integration |
| `src/pages/Auth.tsx` | Uses native sign-in on mobile |

## Security Notes

- The Web Client ID is public and safe to include in code
- The actual authentication happens on Google's servers
- Supabase verifies the ID token server-side
- No client secret is exposed in the mobile app
