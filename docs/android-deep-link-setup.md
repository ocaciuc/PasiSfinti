# Android Deep Link Setup for Google OAuth

This document explains how to configure Android deep linking for Google OAuth to redirect back into the mobile app.

## 1. Configure Android Intent Filters

After running `npx cap add android`, you need to add the following intent filter to your `android/app/src/main/AndroidManifest.xml` file.

Find the `<activity>` tag for your main activity and add this intent filter inside it:

```xml
<activity
    android:name=".MainActivity"
    ...>
    
    <!-- Existing intent-filter -->
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>

    <!-- ADD THIS: Deep link intent filter for OAuth callback -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        
        <!-- Custom URL scheme: pelerinaj://auth/callback -->
        <data android:scheme="pelerinaj" />
    </intent-filter>
</activity>
```

## 2. Configure Supabase OAuth Redirect URLs

In your Supabase dashboard, go to **Authentication > URL Configuration** and add the following redirect URL:

```
pelerinaj://auth/callback
```

This tells Supabase to redirect back to your mobile app after Google OAuth is complete.

## 3. Configure Google Cloud Console

In the Google Cloud Console for your OAuth credentials:

1. Go to **APIs & Services > Credentials**
2. Edit your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   - `https://yanjhfqqdcevlzmwsrnj.supabase.co/auth/v1/callback` (for Supabase)

## 4. How It Works

1. User taps "Continuă cu Google" in the app
2. App opens Google OAuth in system browser or in-app browser
3. User authenticates with Google
4. Google redirects to Supabase callback
5. Supabase redirects to `pelerinaj://auth/callback#access_token=...`
6. Android intercepts this URL scheme and opens the app
7. App's deep link listener parses the tokens and sets the session

## 5. Testing

To test deep links on Android:

```bash
# Test the URL scheme from command line
adb shell am start -W -a android.intent.action.VIEW -d "pelerinaj://auth/callback" app.lovable.ee3834849f11481bad7f08d619b104bd
```

## 6. Troubleshooting

### App doesn't open from redirect
- Verify the intent filter is correctly added to AndroidManifest.xml
- Make sure the URL scheme matches exactly: `pelerinaj`
- Rebuild the app after making changes: `npx cap sync android`

### OAuth tokens not being parsed
- Check the console logs in Android Studio for "App URL opened:" messages
- Verify the redirect URL in Supabase includes the custom scheme

### Session not persisting
- Make sure `localStorage` is working in the WebView
- Check for any errors in the Capacitor logs
