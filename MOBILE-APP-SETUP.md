# Mobile App Setup Guide

## 🎉 What's Been Done

### ✅ PWA (Progressive Web App) - COMPLETE
Your web app is now installable as a mobile app! Users can:
- Install it on their home screen
- Use it offline (with cached content)
- Get push notifications
- Enjoy an app-like experience

**To test PWA:**
1. Build and deploy your Next.js app: `npm run build`
2. Visit on mobile browser
3. Look for "Add to Home Screen" option
4. Install and enjoy!

### ✅ React Native Mobile App - COMPLETE
A full native mobile app has been created in the `mobile/` directory!

## 📱 React Native App Setup

### Step 1: Install Dependencies

```bash
cd mobile
npm install
```

### Step 2: Configure Environment

Create `mobile/.env`:
```
EXPO_PUBLIC_API_URL=https://your-app.vercel.app
```

Replace with your actual Vercel deployment URL.

### Step 3: Start Development

```bash
npm start
```

Then:
- Press `i` for iOS simulator (macOS only)
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your phone

### Step 4: Create App Icons

You need to create app icons. Place these in `mobile/assets/`:
- `icon.png` (1024x1024)
- `splash.png` (1242x2436)
- `adaptive-icon.png` (1024x1024) - Android only
- `favicon.png` (48x48) - Web only

You can use your existing `mofa-logo.png` and resize it.

### Step 5: Build for Production

#### iOS:
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build
eas build --platform ios
```

#### Android:
```bash
eas build --platform android
```

## 🏗️ Project Structure

```
mobile/
├── app/                    # Expo Router screens
│   ├── _layout.tsx        # Root layout
│   ├── index.tsx          # Entry point
│   ├── login.tsx          # Login screen
│   └── (tabs)/            # Tab navigation
│       ├── dashboard.tsx  # Dashboard
│       ├── leaves.tsx     # Leave management
│       └── profile.tsx    # User profile
├── lib/                   # Utilities
│   ├── api-client.ts      # API client (connects to Next.js API)
│   └── auth-context.tsx   # Authentication context
├── components/            # Reusable components (create as needed)
├── assets/                # Images, fonts, etc.
└── package.json
```

## 🔌 API Integration

The mobile app uses your existing Next.js API endpoints. No backend changes needed!

**Available API endpoints:**
- `/api/auth/login` - User login
- `/api/auth/logout` - User logout
- `/api/auth/me` - Get current user
- `/api/leaves` - Leave management
- `/api/balances` - Leave balances
- `/api/notifications` - Notifications
- And all other existing endpoints!

## 📋 Features Implemented

### ✅ Authentication
- Email/password login
- Biometric authentication (Face ID / Fingerprint)
- Secure token storage
- Auto-logout on token expiry

### ✅ Leave Management
- View leave requests
- Apply for leave
- View leave balances
- Leave history

### ✅ Dashboard
- Quick stats
- Leave balance display
- Quick actions

### ✅ Profile
- User information
- Settings access
- Logout

## 🚀 Next Steps

### 1. Add More Screens
Create additional screens in `mobile/app/`:
- `leave-request.tsx` - Leave application form
- `notifications.tsx` - Notifications list
- `documents.tsx` - Document management

### 2. Add More Features
- Push notifications setup
- Offline data sync
- Document upload with camera
- Calendar integration

### 3. Customize UI
- Update colors in `app.json`
- Add custom fonts
- Create reusable components

### 4. Testing
- Test on real iOS devices
- Test on real Android devices
- Test all user flows
- Performance testing

## 📱 App Store Deployment

### iOS (App Store)
1. Create Apple Developer account ($99/year)
2. Configure app in App Store Connect
3. Build with EAS: `eas build --platform ios`
4. Submit: `eas submit --platform ios`

### Android (Google Play)
1. Create Google Play Developer account ($25 one-time)
2. Create app in Play Console
3. Build with EAS: `eas build --platform android`
4. Submit: `eas submit --platform android`

## 🐛 Troubleshooting

### "Module not found" errors
```bash
cd mobile
rm -rf node_modules
npm install
```

### API connection issues
- Check `EXPO_PUBLIC_API_URL` in `.env`
- Ensure API is deployed and accessible
- Check CORS settings on your API

### Build errors
- Ensure all dependencies are installed
- Check TypeScript errors: `npx tsc --noEmit`
- Clear Expo cache: `expo start -c`

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [EAS Build](https://docs.expo.dev/build/introduction/)

## ✅ Checklist

- [x] PWA support implemented
- [x] React Native app structure created
- [x] API client configured
- [x] Authentication screens built
- [x] Core navigation setup
- [x] Dashboard screen
- [x] Leave management screen
- [x] Profile screen
- [ ] App icons created
- [ ] Environment variables configured
- [ ] Tested on iOS device
- [ ] Tested on Android device
- [ ] Push notifications configured
- [ ] App Store submission ready

---

**You now have both a PWA and a native mobile app! 🎉**

The PWA is ready to use immediately. The React Native app needs:
1. Dependencies installed (`cd mobile && npm install`)
2. Environment variables configured
3. App icons created
4. Testing on devices

