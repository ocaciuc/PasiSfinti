# Android Deep Link Setup for Google OAuth

This document explains how to configure Android deep linking for Google OAuth to redirect back into the mobile app.

## How Google OAuth Works on Mobile

1. User taps "Continuă cu Google" in the app
2. App opens Google OAuth in **Chrome Custom Tab** (in-app browser)
3. User authenticates with Google
4. Google redirects to Supabase callback (`https://<PROJECT_ID>.supabase.co/auth/v1/callback`)
5. Supabase processes the auth and redirects to our custom scheme: `pelerinaj://auth/callback#access_token=...`
6. **Android intercepts this custom URL scheme** via the intent-filter
7. The `appUrlOpen` event fires in the app with the URL
8. App parses tokens, sets session, and closes the browser
9. User is navigated to the Dashboard inside the native app

**The key is that the redirect URL must be `pelerinaj://auth/callback`** - this triggers Android's intent-filter.

## 1. Configure Android Intent Filters

After running `npx cap add android`, add the following intent filter to `android/app/src/main/AndroidManifest.xml`.

Find the `<activity>` tag for MainActivity and add:

```xml
<activity
    android:name=".MainActivity"
    android:exported="true"
    android:launchMode="singleTask"
    ...>
    
    <!-- Existing launcher intent-filter -->
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>

    <!-- Deep link intent filter for OAuth callback -->
    <intent-filter android:autoVerify="false">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        
        <!-- Custom URL scheme: pelerinaj://auth/callback -->
        <data android:scheme="pelerinaj" />
    </intent-filter>
</activity>
```

**CRITICAL SETTINGS:**
- `android:launchMode="singleTask"` - **REQUIRED** - ensures the app reuses the existing instance
- `android:exported="true"` - Required for deep links on Android 12+
- `android:autoVerify="false"` - We use a custom scheme, not HTTPS App Links

## 2. Configure Supabase OAuth Redirect URLs

In Supabase Dashboard → **Authentication → URL Configuration**, add:

```
pelerinaj://auth/callback
https://pasi-comunitate-sfanta.lovable.app/auth/callback
```

**CRITICAL:** The custom scheme URL (`pelerinaj://auth/callback`) MUST be added. This is what Supabase redirects to after OAuth.

## 3. Configure Google Cloud Console

In Google Cloud Console → APIs & Services → Credentials:

1. Edit your OAuth 2.0 Client ID
2. Under **Authorized redirect URIs**, ensure this is present:
   - `https://yanjhfqqdcevlzmwsrnj.supabase.co/auth/v1/callback`

Note: You do NOT need to add the custom scheme to Google - only Supabase handles the final redirect.

## 4. Testing Deep Links

Test the URL scheme from command line:

```bash
adb shell am start -W -a android.intent.action.VIEW \
  -d "pelerinaj://auth/callback#access_token=test&refresh_token=test" \
  app.lovable.ee3834849f11481bad7f08d619b104bd
```

If the app opens, the intent-filter is correctly configured.

## 5. Troubleshooting

### Browser stays open after OAuth / Dashboard appears in browser

This is the most common issue. Check:

1. **Supabase redirect URL must include the custom scheme**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Ensure `pelerinaj://auth/callback` is in the redirect URLs list
   - **This is the #1 cause** - if Supabase doesn't have this URL, it won't redirect to the app

2. **AndroidManifest.xml must have correct settings**
   - `android:launchMode="singleTask"` on MainActivity
   - Intent-filter with `android:scheme="pelerinaj"`
   - Rebuild after changes: `npx cap sync android && npx cap run android`

3. **App not rebuilt after code changes**
   ```bash
   npm run build
   npx cap sync android
   npx cap run android
   ```

### OAuth tokens not being parsed

Check Android Studio logcat for `[capacitor-auth]` messages:
- "App URL opened event:" - Deep link was received
- "Found OAuth tokens, setting session" - Tokens were parsed
- "Session set successfully" - Auth completed

### Session not persisting

- The app uses `@capacitor/preferences` for persistent storage
- Check that `hydrateStorageCache()` is called in main.tsx before React renders
- Check logcat for storage-related errors

## 6. Full AndroidManifest.xml Example

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

## 7. Quick Verification Checklist

Before testing, verify:

- [ ] `pelerinaj://auth/callback` is in Supabase redirect URLs
- [ ] AndroidManifest.xml has `android:launchMode="singleTask"`
- [ ] AndroidManifest.xml has intent-filter with `android:scheme="pelerinaj"`
- [ ] You've run `npm run build && npx cap sync android`
- [ ] You've rebuilt the app in Android Studio or via `npx cap run android`

## 8. Expected Log Output

When OAuth works correctly, you should see in Android Studio logcat:

```
[capacitor-auth] Starting Google OAuth with redirect: pelerinaj://auth/callback isNative: true
[capacitor-auth] Opening OAuth URL in in-app browser
[capacitor-auth] Browser opened successfully
... user authenticates in browser ...
[capacitor-auth] App URL opened event: pelerinaj://auth/callback#access_token=...
[capacitor-auth] *** CLOSING BROWSER IMMEDIATELY ***
[capacitor-auth] Browser.close() succeeded
[capacitor-auth] Found OAuth tokens, setting session...
[capacitor-auth] Session set successfully from deep link
[useDeepLinkHandler] Auth success, navigating to dashboard
```

If you don't see "App URL opened event", the deep link isn't being received - check Supabase redirect URLs.
