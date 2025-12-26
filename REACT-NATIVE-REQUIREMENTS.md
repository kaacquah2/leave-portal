# React Native App Development Requirements
## Complete Setup Guide for Building Mobile Apps

This guide covers all requirements needed to build React Native apps for iOS and Android.

---

## 📋 System Requirements Overview

### Minimum Requirements:
- **Operating System**: Windows 10/11, macOS 10.15+, or Linux
- **RAM**: 8GB minimum (16GB recommended)
- **Storage**: 10GB free space minimum
- **Processor**: Multi-core processor (Intel/AMD/Apple Silicon)

---

## 🖥️ Operating System Requirements

### For iOS Development:
- ✅ **macOS REQUIRED** (Windows/Linux cannot build iOS apps)
  - macOS 10.15 (Catalina) or later
  - macOS 11+ (Big Sur) recommended
  - Apple Silicon (M1/M2) or Intel Mac

### For Android Development:
- ✅ **Windows, macOS, or Linux** - All supported
  - Windows 10/11
  - macOS 10.15+
  - Linux (Ubuntu 18.04+, Debian, etc.)

### For Both Platforms:
- ✅ **macOS** - Can build both iOS and Android
- ⚠️ **Windows** - Android only (need Mac/cloud for iOS)
- ⚠️ **Linux** - Android only (need Mac/cloud for iOS)

---

## 🛠️ Core Software Requirements

### 1. Node.js (Required)

**Version**: Node.js 18.x or 20.x (LTS recommended)

**Installation:**

**Windows/macOS:**
- Download from: https://nodejs.org/
- Or use nvm (Node Version Manager):
  ```bash
  # macOS/Linux
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
  
  # Windows
  # Download from: https://github.com/coreybutler/nvm-windows/releases
  
  # Install Node.js
  nvm install 20
  nvm use 20
  ```

**Verify:**
```bash
node --version  # Should show v18.x.x or v20.x.x
npm --version   # Should show 9.x.x or 10.x.x
```

### 2. Package Manager

**npm** (comes with Node.js) or **yarn**:

```bash
# npm (included)
npm --version

# Or install yarn
npm install -g yarn
yarn --version
```

### 3. Git (Required)

**Installation:**
- **Windows**: https://git-scm.com/download/win
- **macOS**: `xcode-select --install` (includes Git)
- **Linux**: `sudo apt-get install git`

**Verify:**
```bash
git --version
```

---

## 📱 iOS Development Requirements (macOS Only)

### 1. Xcode (Required)

**Version**: Xcode 14+ (latest recommended)

**Installation:**
1. Open App Store on Mac
2. Search for "Xcode"
3. Install (large download ~15GB)
4. Open Xcode and accept license agreement

**Verify:**
```bash
xcode-select --version
xcodebuild -version
```

### 2. Xcode Command Line Tools

```bash
xcode-select --install
```

### 3. CocoaPods (iOS Dependency Manager)

```bash
sudo gem install cocoapods
pod --version
```

### 4. iOS Simulator

Comes with Xcode. Launch from:
- Xcode → Open Developer Tool → Simulator
- Or: `open -a Simulator`

### 5. Apple Developer Account

**For Testing on Real Device:**
- Free Apple ID (for development)
- Or paid Apple Developer Program ($99/year) for App Store distribution

**Sign up:**
- Free: https://appleid.apple.com/
- Paid: https://developer.apple.com/programs/

---

## 🤖 Android Development Requirements

### 1. Java Development Kit (JDK)

**Version**: JDK 17 or 21 (LTS)

**Installation:**

**Windows/macOS:**
- Download from: https://adoptium.net/
- Or use Homebrew (macOS):
  ```bash
  brew install openjdk@17
  ```

**Linux:**
```bash
sudo apt-get install openjdk-17-jdk
```

**Set JAVA_HOME:**

**Windows:**
```powershell
# Add to System Environment Variables
JAVA_HOME = C:\Program Files\Java\jdk-17
```

**macOS/Linux:**
```bash
# Add to ~/.zshrc or ~/.bashrc
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export PATH=$JAVA_HOME/bin:$PATH
```

**Verify:**
```bash
java -version
javac -version
echo $JAVA_HOME  # macOS/Linux
echo %JAVA_HOME% # Windows
```

### 2. Android Studio (Required)

**Download**: https://developer.android.com/studio

**Installation Steps:**
1. Download Android Studio
2. Run installer
3. During setup, install:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (AVD)
   - Performance (Intel HAXM) - for faster emulator

**Verify:**
- Open Android Studio
- Go to: Tools → SDK Manager
- Ensure Android SDK is installed

### 3. Android SDK

**Components Needed:**
- Android SDK Platform 33 (or latest)
- Android SDK Build-Tools
- Android Emulator
- Google Play services

**Set ANDROID_HOME:**

**Windows:**
```powershell
# Add to System Environment Variables
ANDROID_HOME = C:\Users\YourUsername\AppData\Local\Android\Sdk
# Add to PATH:
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
%ANDROID_HOME%\tools\bin
```

**macOS/Linux:**
```bash
# Add to ~/.zshrc or ~/.bashrc
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

**Verify:**
```bash
echo $ANDROID_HOME  # macOS/Linux
adb version
```

### 4. Android Virtual Device (AVD)

**Create Emulator:**
1. Open Android Studio
2. Tools → Device Manager
3. Create Virtual Device
4. Choose device (e.g., Pixel 5)
5. Download system image (API 33 recommended)
6. Finish setup

### 5. Google Play Account (For Publishing)

**For App Store Distribution:**
- Google Play Developer Account: $25 one-time fee
- Sign up: https://play.google.com/console/signup

---

## 🚀 React Native Setup

### Option 1: Expo (Recommended for Beginners)

**Installation:**
```bash
npm install -g expo-cli
# Or
npm install -g @expo/cli

# Verify
expo --version
```

**Create Project:**
```bash
npx create-expo-app@latest hr-leave-portal-mobile
cd hr-leave-portal-mobile
```

**Start Development:**
```bash
npm start
# Or
expo start
```

### Option 2: React Native CLI (Advanced)

**Installation:**
```bash
npm install -g react-native-cli
# Or use npx (no global install needed)
```

**Create Project:**
```bash
npx react-native@latest init HRLeavePortal
cd HRLeavePortal
```

**Start Development:**
```bash
# iOS (macOS only)
npm run ios

# Android
npm run android
```

---

## 📦 Additional Tools & Services

### 1. EAS Build (Expo Application Services)

**For Building Production Apps:**

```bash
npm install -g eas-cli
eas login
eas build:configure
```

**Account**: Free Expo account (sign up at expo.dev)

### 2. Code Editor

**Recommended:**
- **VS Code** (Free) - https://code.visualstudio.com/
  - Extensions:
    - React Native Tools
    - ESLint
    - Prettier
    - TypeScript

- **Android Studio** - For Android-specific development
- **Xcode** - For iOS-specific development

### 3. Version Control

**Git** (already covered above)

**GitHub/GitLab/Bitbucket** account for code hosting

### 4. Testing Tools

**Optional but Recommended:**
- **Jest** - Unit testing (included with React Native)
- **Detox** - E2E testing
- **React Native Testing Library**

---

## 💰 Account & Subscription Requirements

### Free (Development Only):
- ✅ Apple ID (free) - Test on iOS device
- ✅ Google Account (free) - Test on Android device
- ✅ Expo account (free) - Build and test

### Paid (For App Store Distribution):
- 💰 **Apple Developer Program**: $99/year
  - Required for: App Store distribution, TestFlight
  - Sign up: https://developer.apple.com/programs/
  
- 💰 **Google Play Developer**: $25 one-time
  - Required for: Google Play Store distribution
  - Sign up: https://play.google.com/console/signup

### Optional Services:
- **Firebase** - Free tier available (push notifications, analytics)
- **App Center** - Free tier (CI/CD, crash reporting)
- **CodePush** - Free tier (over-the-air updates)

---

## 🖥️ Hardware Requirements

### Minimum:
- **RAM**: 8GB
- **Storage**: 50GB free space
- **CPU**: Dual-core processor

### Recommended:
- **RAM**: 16GB+
- **Storage**: 100GB+ free space
- **CPU**: Quad-core or better
- **macOS**: Apple Silicon (M1/M2) for best performance

### For iOS Development:
- **Mac computer** (required)
- **iPhone/iPad** (optional, for testing on real device)

### For Android Development:
- **Any computer** (Windows/macOS/Linux)
- **Android device** (optional, for testing on real device)

---

## 📋 Complete Setup Checklist

### ✅ Core Setup
- [ ] Install Node.js 18+ or 20+
- [ ] Install Git
- [ ] Install code editor (VS Code)
- [ ] Create GitHub/Git account

### ✅ For iOS Development (macOS Only)
- [ ] Install Xcode from App Store
- [ ] Install Xcode Command Line Tools
- [ ] Install CocoaPods
- [ ] Create Apple ID (free) or Developer Account ($99/year)
- [ ] Accept Xcode license: `sudo xcodebuild -license accept`

### ✅ For Android Development
- [ ] Install JDK 17 or 21
- [ ] Set JAVA_HOME environment variable
- [ ] Install Android Studio
- [ ] Install Android SDK
- [ ] Set ANDROID_HOME environment variable
- [ ] Create Android Virtual Device (AVD)
- [ ] Create Google Play Developer account ($25) - if publishing

### ✅ React Native Setup
- [ ] Install Expo CLI or React Native CLI
- [ ] Create new project
- [ ] Test on simulator/emulator
- [ ] Install EAS CLI (for builds)

### ✅ Development Tools
- [ ] Install VS Code extensions
- [ ] Set up Git repository
- [ ] Configure environment variables
- [ ] Test on real device (optional)

---

## 🚀 Quick Start Commands

### 1. Verify All Requirements

```bash
# Check Node.js
node --version

# Check npm
npm --version

# Check Git
git --version

# Check Java (Android)
java -version

# Check Android SDK (Android)
echo $ANDROID_HOME  # macOS/Linux
echo %ANDROID_HOME% # Windows

# Check Xcode (iOS - macOS only)
xcodebuild -version

# Check CocoaPods (iOS - macOS only)
pod --version
```

### 2. Create React Native Project

**With Expo (Easier):**
```bash
npx create-expo-app@latest hr-leave-portal-mobile
cd hr-leave-portal-mobile
npm start
```

**With React Native CLI:**
```bash
npx react-native@latest init HRLeavePortal
cd HRLeavePortal

# iOS (macOS only)
npm run ios

# Android
npm run android
```

### 3. Test on Simulator/Emulator

**iOS Simulator (macOS):**
```bash
# Open Simulator
open -a Simulator

# Or from Xcode
# Xcode → Open Developer Tool → Simulator
```

**Android Emulator:**
```bash
# List available emulators
emulator -list-avds

# Start emulator
emulator -avd Pixel_5_API_33
```

---

## 🐛 Common Issues & Solutions

### Issue: "Command not found: react-native"
**Solution**: Use `npx` instead:
```bash
npx react-native@latest init MyApp
```

### Issue: "JAVA_HOME not set" (Android)
**Solution**: Set environment variable (see Android setup above)

### Issue: "ANDROID_HOME not set" (Android)
**Solution**: Set environment variable (see Android setup above)

### Issue: "CocoaPods not found" (iOS)
**Solution**: 
```bash
sudo gem install cocoapods
cd ios && pod install
```

### Issue: "Xcode license not accepted" (iOS)
**Solution**:
```bash
sudo xcodebuild -license accept
```

### Issue: "Metro bundler port already in use"
**Solution**:
```bash
# Kill process on port 8081
# macOS/Linux
lsof -ti:8081 | xargs kill -9

# Windows
netstat -ano | findstr :8081
taskkill /PID <PID> /F
```

---

## 📊 Platform Comparison

| Requirement | iOS | Android |
|------------|-----|---------|
| **OS** | macOS only | Windows/macOS/Linux |
| **IDE** | Xcode | Android Studio |
| **SDK** | iOS SDK (via Xcode) | Android SDK |
| **Emulator** | iOS Simulator | Android Emulator |
| **Account** | Apple Developer ($99/yr) | Google Play ($25 one-time) |
| **Language** | Swift/Objective-C | Java/Kotlin |
| **Build Tool** | Xcode | Gradle |

---

## 🎯 Recommended Setup for Your Project

Based on your Next.js HR Leave Portal:

### Option 1: Expo (Easiest)
```bash
# Install Expo CLI
npm install -g @expo/cli

# Create project
npx create-expo-app@latest hr-leave-portal-mobile

# Install dependencies
cd hr-leave-portal-mobile
npm install axios @react-navigation/native @react-navigation/stack
npm install @react-native-async-storage/async-storage
npm install expo-notifications expo-camera

# Start development
npm start
```

### Option 2: React Native CLI (More Control)
```bash
# Create project
npx react-native@latest init HRLeavePortal

# Install dependencies
cd HRLeavePortal
npm install axios @react-navigation/native

# Run on iOS (macOS)
npm run ios

# Run on Android
npm run android
```

---

## 📝 Summary

### Minimum Requirements:
1. ✅ **Node.js 18+** - Runtime
2. ✅ **Git** - Version control
3. ✅ **Code Editor** - VS Code recommended

### For iOS:
4. ✅ **macOS** - Required
5. ✅ **Xcode** - Required
6. ✅ **Apple Developer Account** - $99/year (for distribution)

### For Android:
7. ✅ **JDK 17+** - Required
8. ✅ **Android Studio** - Required
9. ✅ **Android SDK** - Required
10. ✅ **Google Play Account** - $25 one-time (for distribution)

### Recommended:
11. ✅ **Expo CLI** - Easier development
12. ✅ **EAS CLI** - For building production apps
13. ✅ **VS Code** - Best editor for React Native

---

## 🚀 Next Steps

1. **Install core requirements** (Node.js, Git)
2. **Choose your platform** (iOS, Android, or both)
3. **Install platform-specific tools** (Xcode for iOS, Android Studio for Android)
4. **Create React Native project** (Expo or CLI)
5. **Start developing!**

See `MOBILE-APP-CONVERSION-GUIDE.md` for detailed implementation steps.

---

**Last Updated**: 2024
**Questions?** Refer to React Native docs: https://reactnative.dev/docs/getting-started

