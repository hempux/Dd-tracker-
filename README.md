# Dd-Tracker – Food Expiry Tracker

A minimal, aesthetic Android app for tracking food expiry dates using barcode scanning.

## Features

- **Barcode scanning** – Tap the floating button (bottom-left) to open the camera and scan any food item's barcode
- **Swedish product lookup** – Automatically identifies products using [Open Food Facts](https://se.openfoodfacts.org) (Swedish-first, falls back to global database)
- **Best-before dates** – Tap any item to set or change its best-before date
- **Expiry notifications** – Get a local push notification 7 days before an item expires, and again on the expiry day
- **Google Drive sync** – Back up and restore your food list to Google Drive using your Google account
- **Item sharing** – Share any item's name, barcode and expiry date via the system share sheet
- **Offline-first** – All data stored locally using AsyncStorage; Google Drive sync is optional

## Visual Design

- Dark theme (`#0a0a0f` background) with purple (`#6c63ff`) accents
- Status-color-coded cards: 🟢 OK · 🟡 < 7 days · 🔴 < 3 days · ⬛ Expired
- Floating Action Button (bottom-left corner) with glow animation
- Smooth spring animations on interactions

## Status Indicators

| Color | Meaning |
|-------|---------|
| 🟢 Green | More than 7 days remaining |
| 🟡 Amber | 4–7 days remaining (warning) |
| 🔴 Red | 0–3 days remaining (critical) |
| ⬛ Gray | Already expired |
| 🟣 Purple | No date set |

## Tech Stack

- **Framework**: React Native + Expo SDK 51
- **Language**: TypeScript
- **Storage**: `@react-native-async-storage/async-storage`
- **Barcode scanning**: `expo-camera` / `expo-barcode-scanner`
- **Notifications**: `expo-notifications`
- **Google Auth**: `expo-auth-session`
- **Sharing**: `expo-sharing`
- **Date picker**: `@react-native-community/datetimepicker`

## Getting Started

```bash
# Install dependencies
npm install

# Start Expo dev server
npm start

# Run on Android device/emulator
npm run android
```

## Google Drive Setup

To enable Google Drive sync:
1. Create a project at [Google Cloud Console](https://console.cloud.google.com)
2. Enable the Google Drive API
3. Create an OAuth 2.0 client ID (Android app)
4. Set `EXPO_PUBLIC_GOOGLE_CLIENT_ID` in your `.env` file

```
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

## Project Structure

```
src/
├── App.tsx                    # Root component
├── theme.ts                   # Colors, fonts, spacing
├── types/
│   └── index.ts               # TypeScript types
├── utils/
│   └── dateUtils.ts           # Date helpers
├── services/
│   ├── barcodeApi.ts          # Open Food Facts API
│   ├── storage.ts             # AsyncStorage CRUD
│   ├── notifications.ts       # Expo push notifications
│   ├── googleDrive.ts         # Google Drive sync
│   └── sharing.ts             # Item sharing
├── components/
│   ├── FoodItemCard.tsx        # List item card
│   ├── FABButton.tsx           # Floating action button
│   ├── DatePickerModal.tsx     # Date selection modal
│   └── ItemDetailModal.tsx     # Item detail & actions
└── screens/
    ├── HomeScreen.tsx          # Main list screen
    └── ScannerScreen.tsx       # Barcode scanner
```

## Build for Android

```bash
# Using EAS Build
npm run build:android
```

