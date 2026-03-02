# HumanoidMaker React Native Mobile App

This mobile app now runs as a WebView shell around your existing ecommerce website, with a native bottom tab menu for smoother navigation.

## Bottom Navigation Tabs

- Home -> `/`
- Wishlist -> `/wishlist`
- Cart -> `/cart`
- Orders -> `/orders`
- Account -> `/settings/account`

Each tab hosts the web app in-app using `react-native-webview`.

## Prerequisites

- Node.js 18+
- npm 9+
- Web app + API running from repository root (`npm run dev`), usually on `http://localhost:3000`
- Android emulator or iOS simulator/device

## Install Dependencies

```bash
cd mobile-app
npm install
npx expo install react-native-webview
```

## Environment

Copy `.env.example` to `.env` and set:

```env
EXPO_PUBLIC_WEB_URL=http://10.0.2.2:3000
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

`EXPO_PUBLIC_WEB_URL` is the frontend URL loaded inside the WebView.

## URL Tips by Platform

- Android emulator: `http://10.0.2.2:3000`
- iOS simulator: `http://localhost:3000`
- Physical device: `http://<your-lan-ip>:3000`

If `EXPO_PUBLIC_WEB_URL` is not set, the app now tries platform defaults plus detected Expo LAN host automatically.

## Run App

```bash
cd mobile-app
npx expo start --clear
```

Then choose:

- `a` for Android
- `i` for iOS
- `w` for web

Or run directly:

```bash
npx expo run:android
npx expo run:ios
npx expo start --web
```

## Where to Change Tab URLs

Edit `src/navigation/RootNavigator.js` (`tabs` array).

## Timeout Fix (`ERR_CONNECTION_TIMED_OUT`)

If you see `net::ERR_CONNECTION_TIMED_OUT`:

1. Start backend/web app from repository root:
   ```bash
   npm run dev
   ```
2. Confirm site opens in desktop browser:
   - `http://localhost:3000`
3. If testing on physical phone, set:
   ```env
   EXPO_PUBLIC_WEB_URL=http://<your-lan-ip>:3000
   ```
4. Restart Expo after env change:
   ```bash
   npx expo start --clear
   ```
