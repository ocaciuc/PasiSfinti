# Android Deep Link Setup for Google OAuth

This document explains how to configure Android deep linking for Google OAuth to redirect back into the mobile app.

## 1. Configure Android Intent Filters

After running `npx cap add android`, you need to add the following intent filter to your `android/app/src/main/AndroidManifest.xml` file.

Find the `<activity>` tag for your main activity and add this intent filter inside it:

```xml
<activity
    android:name=".MainActivity"
    android:exported="true"
    android:launchMode="singleTask"
    ...>
    
    <!-- Existing intent-filter -->
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>

    <!-- ADD THIS: Deep link intent filter for OAuth callback -->
    <intent-filter android:autoVerify="false">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        
        <!-- Custom URL scheme: pelerinaj://auth/callback -->
        <data android:scheme="pelerinaj" />
    </intent-filter>
</activity>
```

**IMPORTANT NOTES:**
- `android:launchMode="singleTask"` is CRITICAL - it ensures the app reuses the existing instance instead of creating a new one
- `android:exported="true"` is required for deep links to work on Android 12+
- `android:autoVerify="false"` since we're using a custom scheme, not HTTPS app links

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
2. App opens Google OAuth in **in-app browser** (Capacitor Browser plugin)
3. User authenticates with Google
4. Google redirects to Supabase callback
5. Supabase redirects to `pelerinaj://auth/callback#access_token=...`
6. Android intercepts this custom URL scheme and sends it to the app
7. App's deep link listener (`appUrlOpen` event) receives the URL
8. The in-app browser is automatically closed
9. App parses the tokens and sets the session
10. User is navigated to the dashboard

## 5. Testing

To test deep links on Android:

```bash
# Test the URL scheme from command line
adb shell am start -W -a android.intent.action.VIEW -d "pelerinaj://auth/callback#access_token=test&refresh_token=test" app.lovable.ee3834849f11481bad7f08d619b104bd
```

## 6. Troubleshooting

### App doesn't open from redirect / stays in browser
This is usually caused by one of these issues:

1. **Missing `launchMode="singleTask"`** in AndroidManifest.xml
   - Add `android:launchMode="singleTask"` to the main activity

2. **Intent filter not added correctly**
   - Verify the intent filter is correctly added to AndroidManifest.xml
   - Make sure the URL scheme matches exactly: `pelerinaj`
   - Rebuild the app after making changes:
     ```bash
     npx cap sync android
     npx cap run android
     ```

3. **Redirect URL not added to Supabase**
   - Go to Supabase Dashboard > Authentication > URL Configuration
   - Add `pelerinaj://auth/callback` to the redirect URLs list
   - **This is CRITICAL** - without this, the OAuth flow won't redirect to the app

4. **App not rebuilt after changes**
   - Always run `npx cap sync android` after any code changes
   - Then rebuild and reinstall the app

5. **Capacitor not detecting native platform**
   - Make sure you ran `npm run build` before `npx cap sync android`
   - Check that `@capacitor/core`, `@capacitor/app`, and `@capacitor/browser` are installed
   - Verify the app is running on the device, not in a web view that simulates mobile

6. **External browser opens instead of in-app browser**
   - Ensure `@capacitor/browser` plugin is properly installed
   - Run `npx cap sync android` to sync the plugin
   - The in-app browser should open with `presentationStyle: 'fullscreen'`

### OAuth tokens not being parsed
- Check the console logs in Android Studio for `[capacitor-auth]` messages
- Look for "App URL opened event:" to see if the deep link was received
- Verify the redirect URL in Supabase includes the custom scheme

### Session not persisting
- Make sure `localStorage` is working in the WebView
- Check for any errors in the Capacitor logs related to Supabase

### Browser doesn't close after OAuth
- The `Browser.close()` call happens automatically when the deep link is received
- Check console logs for "[capacitor-auth] Closing in-app browser"
- If the browser shows a blank page, ensure `launchMode="singleTask"` is set

## 7. Full AndroidManifest.xml Example

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:exported="true"
            android:launchMode="singleTask"
            android:theme="@style/AppTheme.NoActionBarLaunch">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <intent-filter android:autoVerify="false">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="pelerinaj" />
            </intent-filter>

        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>

    </application>

    <queries>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="https" />
        </intent>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="pelerinaj" />
        </intent>
    </queries>

</manifest>
```

## 8. Verifying the Setup

After making all changes:

1. Pull the latest code: `git pull`
2. Install dependencies: `npm install`
3. Build the web assets: `npm run build`
4. Sync with Capacitor: `npx cap sync android`
5. Open in Android Studio: `npx cap open android`
6. Build and run on device/emulator
7. Test the "Continuă cu Google" button

The logs should show:
```
[capacitor-auth] Starting Google OAuth with redirect: pelerinaj://auth/callback isNative: true
[capacitor-auth] Opening OAuth URL in in-app browser
[capacitor-auth] App URL opened event: pelerinaj://auth/callback#access_token=...
[capacitor-auth] Closing in-app browser
[capacitor-auth] Found OAuth tokens, setting session...
[capacitor-auth] Session set successfully from deep link
[useDeepLinkHandler] Auth success, navigating to dashboard
```
