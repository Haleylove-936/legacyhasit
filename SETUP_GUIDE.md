# LegacyBox — Post-Migration Setup Guide

Everything the code now expects you to configure. Do these in order.

---

## 1. Firebase Project

1. Go to https://console.firebase.google.com → **Create a project** → name it `legacybox`
2. Disable Google Analytics if you don't need it (you can add it later)

### Enable Authentication
3. In Firebase console → **Authentication** → **Get started**
4. Enable these sign-in providers:
   - **Email/Password**
   - **Google** (needed for Android)
   - **Apple** (needed for iOS — requires Apple Developer account first)

### Enable Firestore
5. **Firestore Database** → **Create database** → choose **production mode**
6. Pick a region close to your users (e.g. `us-central1`)
7. After creation, go to **Rules** tab and paste:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }
    match /memories/{memoryId} {
      allow read, write: if request.auth != null &&
        request.auth.uid in get(/databases/$(database)/documents/vaults/$(resource.data.vaultId)).data.memberUids;
    }
    match /vaults/{vaultId} {
      allow read: if request.auth != null &&
        request.auth.uid in resource.data.memberUids;
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        request.auth.uid in resource.data.memberUids;
    }
  }
}
```

### Enable Firebase Storage
8. **Storage** → **Get started** → production mode → same region as Firestore
9. Go to **Rules** tab and paste:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profiles/{uid}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }
    match /photos/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

### Get your Firebase config keys
10. **Project Settings** (gear icon) → **General** → scroll to **Your apps** → **Add app** → Web
11. Copy the config object — you'll need these values for your `.env` files

### Get Firebase Admin credentials
12. **Project Settings** → **Service accounts** → **Generate new private key**
13. Download the JSON file — keep it secret, never commit it

---

## 2. Cloudflare R2 (audio storage)

1. Go to https://dash.cloudflare.com → **R2** → **Create bucket** → name it `legacybox-audio`
2. **Settings** → **Public access** → enable public bucket (so audio URLs work without signing)
   - Or set up a custom domain under **Settings → Custom Domains**
3. **R2 → Manage R2 API tokens** → **Create API token**
   - Permissions: **Object Read & Write** on your bucket
   - Copy the **Access Key ID** and **Secret Access Key**
4. Your Account ID is in the URL: `dash.cloudflare.com/<ACCOUNT_ID>/r2`

---

## 3. Groq API (transcription)

1. Go to https://console.groq.com → sign up → **API Keys** → **Create API Key**
2. Copy the key — free tier gives you ~40 hours/day of Whisper transcription

---

## 4. RevenueCat (in-app purchases)

1. Go to https://app.revenuecat.com → create account → **Create new project** → `LegacyBox`
2. Add your apps:
   - **+ New App** → iOS → enter your Apple Bundle ID
   - **+ New App** → Android → enter your Google Play package name
3. Set up your products in App Store Connect and Google Play Console first (see step 7 & 8 below), then come back and add them in RevenueCat
4. **Project Settings → API Keys** → copy the **Public SDK key** (goes in your app) and note the **Webhook** secret (goes in your server env)

---

## 5. Environment Variables

Create a `.env` file in your project root (never commit this):

```env
# Firebase Admin (from service account JSON)
FIREBASE_PROJECT_ID=legacybox-xxxxx
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@legacybox-xxxxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=legacybox-xxxxx.appspot.com

# Cloudflare R2
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=legacybox-audio
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev  # or your custom domain

# Groq
GROQ_API_KEY=gsk_xxxxx

# RevenueCat
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret

# Session
JWT_SECRET=a_long_random_string_at_least_32_chars
CORS_ORIGINS=https://your-web-app.com,http://localhost:8081

# Owner (your Firebase UID — find it in Firebase console → Authentication → Users)
OWNER_UID=your_firebase_uid
```

Create a `.env.local` (or add to `app.config.ts` extra.env) for the Expo client:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSy...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=legacybox-xxxxx.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=legacybox-xxxxx
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=legacybox-xxxxx.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:xxxxx
EXPO_PUBLIC_API_BASE_URL=https://your-deployed-server.com
```

---

## 6. Deploy the Server

Recommended: **Railway**

1. Go to https://railway.app → **New Project** → **Deploy from GitHub repo**
2. Select your repo
3. Railway auto-detects Node — set the start command to: `npm run start`
4. Go to **Variables** tab → add all your server `.env` values
5. Copy the generated URL → put it in `EXPO_PUBLIC_API_BASE_URL`

---

## 7. Apple App Store Setup

1. Go to https://developer.apple.com → enroll in Apple Developer Program ($99/year)
2. **Certificates, IDs & Profiles** → **Identifiers** → register your Bundle ID (e.g. `com.yourname.legacybox`)
3. **App Store Connect** → **My Apps** → **+** → **New App** → fill in details
4. For in-app purchases: **App Store Connect → Your App → In-App Purchases** → create a subscription product
   - Product ID example: `com.yourname.legacybox.premium_monthly`
   - Add this product ID to RevenueCat

### Enable Apple Sign-In
5. **Certificates, IDs & Profiles** → your App ID → **Capabilities** → enable **Sign In with Apple**
6. In Firebase console → Authentication → Apple → add your Bundle ID and download the config

---

## 8. Google Play Setup

1. Go to https://play.google.com/console → pay the $25 one-time fee
2. **Create app** → fill in details
3. For in-app purchases: **Monetize → Products → Subscriptions** → create subscription
   - Product ID example: `premium_monthly`
   - Add this to RevenueCat

---

## 9. Expo EAS Build

1. Install EAS CLI: `npm install -g eas-cli`
2. `eas login`
3. `eas build:configure` — this creates `eas.json`
4. For iOS: `eas build --platform ios`
5. For Android: `eas build --platform android`
6. Submit to stores: `eas submit --platform ios` / `eas submit --platform android`

---

## 10. What Still Needs Code (not done yet)

These are wired up on the server but the UI doesn't call them yet:

- **Transcription tRPC route** — add a `voice.transcribe` procedure to `server/routers.ts` that calls `transcribeAudio()`, then call it from the record screen after saving audio to R2
- **Cloud sync** — add tRPC procedures for `memory.save`, `memory.list`, `vault.create`, `vault.join` using the Firestore helpers in `server/db.ts`
- **RevenueCat SDK** — install `react-native-purchases`, initialize with your public key, add a paywall screen, gate features by `subscriptionTier` on the user
- **Google Sign-In on native** — install `@react-native-google-signin/google-signin`, wire it to `signInWithGoogle()` in `constants/oauth.ts`
- **Apple Sign-In on native** — install `expo-apple-authentication`, wire it to `signInWithApple()` in `constants/oauth.ts`
- **Profile picture upload** — replace the stub in `lib/profile-picture-service.ts` with a call to `uploadImage()` from `server/storage.ts` via a tRPC upload procedure
