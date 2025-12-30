# HR Leave Portal - Mobile App

React Native mobile application for the Ministry of Fisheries and Aquaculture HR Leave Portal.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Expo CLI installed: `npm install -g expo-cli`
- iOS Simulator (macOS) or Android Emulator

### Setup

1. **Install dependencies:**
   ```bash
   cd mobile
   npm install
   ```

2. **Configure API URL:**
   Create a `.env` file:
   ```
   EXPO_PUBLIC_API_URL=https://your-app.vercel.app
   ```

3. **Start development server:**
   ```bash
   npm start
   ```

4. **Run on device:**
   - Scan QR code with Expo Go app (iOS/Android)
   - Or press `i` for iOS simulator, `a` for Android emulator

## 📱 Features

- ✅ User authentication
- ✅ Leave request submission
- ✅ Leave balance viewing
- ✅ Leave history
- ✅ Push notifications
- ✅ Offline support
- ✅ Biometric authentication

## 🏗️ Project Structure

```
mobile/
├── app/              # Expo Router screens
├── components/       # Reusable components
├── lib/             # Utilities and API client
├── hooks/           # Custom React hooks
├── services/        # API services
└── assets/          # Images, fonts, etc.
```

## 📦 Building for Production

### iOS
```bash
eas build --platform ios
```

### Android
```bash
eas build --platform android
```

## 🔗 API Integration

The mobile app connects to your existing Next.js API endpoints. No changes needed to the backend!

All API routes are available at: `https://your-app.vercel.app/api/*`

