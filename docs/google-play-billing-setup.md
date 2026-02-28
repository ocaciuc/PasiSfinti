# Google Play Billing Integration Guide

This guide explains how to set up Google Play Billing for the "Light a Candle" in-app purchase.

## Overview

The app uses Google Play Billing Library v7 for consumable in-app purchases. Users pay 5 RON to light a virtual candle that burns for 24 hours.

## Architecture

1. **Native Android Plugin** (`BillingPlugin.kt`) - bridges Google Play Billing to Capacitor
2. **JavaScript Bridge** (`src/lib/play-billing.ts`) - TypeScript API for the plugin
3. **Server Verification** (`verify-purchase` Edge Function) - validates purchases server-side
4. **Database** - `candle_purchases` table with `purchase_token` and `order_id` columns

## Setup Steps

### 1. Add Billing Library to Gradle

Edit `android/app/build.gradle`:

```gradle
dependencies {
    // ... existing dependencies
    
    // Google Play Billing Library
    implementation 'com.android.billingclient:billing:7.1.1'
}
```

### 2. Register the Plugin in MainActivity

Edit `android/app/src/main/java/.../MainActivity.kt`:

```kotlin
class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(GoogleSignInPlugin::class.java)
        registerPlugin(BillingPlugin::class.java)  // Add this line
        super.onCreate(savedInstanceState)
    }
}
```

### 3. Create Product in Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Navigate to **Monetization > In-app products**
4. Click **Create product**
5. Configure:
   - **Product ID**: `light_candle_5ron`
   - **Product type**: Managed product (consumable)
   - **Name**: Lumânare Virtuală
   - **Description**: Aprinde o lumânare virtuală care arde 24 de ore
   - **Default price**: 5 RON
6. **Activate** the product

### 4. Server-Side Verification (Production)

For full security, set up Google Play Developer API verification:

1. **Create a Service Account** in Google Cloud Console:
   - Go to IAM & Admin > Service Accounts
   - Create new service account
   - Download JSON key file

2. **Link to Google Play Console**:
   - Go to Google Play Console > Setup > API access
   - Link Google Cloud project
   - Grant the service account **Financial data** permission

3. **Add the secret** to Supabase:
   - Go to Supabase Dashboard > Edge Functions > Secrets
   - Add `GOOGLE_SERVICE_ACCOUNT_KEY` with the JSON key contents

4. **Uncomment verification code** in `supabase/functions/verify-purchase/index.ts`

### 5. Build and Test

```bash
git pull
npm install
npm run build
npx cap sync android
npx cap run android
```

## Purchase Flow

1. User taps "Aprinde Lumânarea" button
2. Confirmation dialog appears with price
3. User confirms → Google Play purchase sheet opens
4. After payment:
   - Purchase token sent to `verify-purchase` edge function
   - Server validates and records in `candle_purchases` table
   - Purchase consumed (so user can buy again)
   - Thank-you message displayed
   - Candle animation starts with 24h timer

## Handling Edge Cases

### Pending Transactions
- If payment is pending (bank transfer, etc.), user sees a message
- App checks for pending purchases on next launch
- Once confirmed, candle is lit automatically

### Purchase Restoration
- On app launch, `getPendingPurchases()` checks for unacknowledged purchases
- Any unfinished purchases are verified and consumed

### Duplicate Prevention
- `purchase_token` column has a unique index
- Server rejects duplicate tokens with 409 status

## Testing

### Test with License Testers
1. Add tester emails in Google Play Console > Setup > License testing
2. License testers can make purchases without real charges
3. Test products return immediately for testers

### Test Card Numbers
Google provides test card numbers for sandbox testing.

## Files Overview

| File | Purpose |
|------|---------|
| `BillingPlugin.kt` | Native Android billing plugin |
| `src/lib/play-billing.ts` | JavaScript bridge for billing |
| `src/pages/Candle.tsx` | UI with purchase flow |
| `supabase/functions/verify-purchase/index.ts` | Server-side verification |

## Google Play Policy Compliance

- ✅ All digital goods sold through Google Play Billing (not external payment)
- ✅ Consumable product correctly acknowledged and consumed
- ✅ Price displayed before purchase confirmation
- ✅ Clear description of what user receives
- ✅ Server-side verification prevents fraud
