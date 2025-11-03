# Patrick Travel Services - Mobile App 📱

[![Status](https://img.shields.io/badge/Status-In%20QA-success)]()
[![Performance](https://img.shields.io/badge/Performance-60%20FPS-brightgreen)]()
[![Security](https://img.shields.io/badge/Security-OAuth%202.0%20%2B%20GDPR-blue)]()
[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-lightgrey)]()

> React Native + Expo app for Patrick Travel Services immigration management.

> ✅ Feature-complete (mobile) | 🚀 Optimized | 📱 iOS & Android | 🔒 GDPR-ready

## 🌟 Overview

The app enables clients to:
- Manage immigration cases
- Upload and track documents
- Chat with advisors (Firebase)
- Receive push notifications (FCM)
- View case progress
- Access FAQs and support

## 🆕 Recent Updates (November 2025)

- New theme-aware headers and notification banners
- i18n refreshed (EN/FR) across auth and tabs
- Push notifications stabilization and deep link fixes
- Docs consolidation under `docs/` with updated guides

See: `docs/IMPLEMENTATION_SUMMARY.md`

## ✨ Features

### 🔐 Authentication & Security
- Email/password with Firebase Auth
- Google OAuth 2.0
- Optional Biometric Auth (Face ID/Touch ID)
- Email verification & password reset
- Secure token storage (expo-secure-store)
- GDPR: Privacy Policy, Terms, consent tracking

### 📊 Dashboard
- Stats overview, recent activity, quick actions, pull-to-refresh

### 📂 Case Management
- Cases list, filters, details with status timeline
- New case flow scaffolded

### 📄 Document Management
- Upload images/PDFs, preview, status tracking
- Camera and gallery integration

### 💬 Messaging
- Real-time chat (Firebase) with read receipts and history

### 🔔 Notifications
- Push notifications with deep links
- Android channels and badge counts

### 🚀 Performance
- Optimized lists, memoization, debounced search
- React Query caching, Hermes engine, Reanimated

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (or yarn/npm)
- Expo CLI (`npm i -g expo-cli`)
- iOS Simulator (macOS) or Android Studio

### Install

```bash
pnpm install
```

### Configure

Create a `.env` in `mobile/` with at least:

```bash
# API
EXPO_PUBLIC_API_URL=https://your-api.example.com

# Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_FIREBASE_DATABASE_URL=...
```

Follow `docs/PUSH_NOTIFICATIONS_SETUP.md` for FCM setup.

### Run

```bash
pnpm start        # start dev server
pnpm ios          # run on iOS
pnpm android      # run on Android
pnpm web          # run on web
```

## 📱 Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | React Native + Expo |
| Navigation | Expo Router |
| State | Zustand |
| Data | TanStack Query |
| Forms | React Hook Form + Zod |
| UI | React Native Paper |
| Auth | Firebase Auth |
| Realtime | Firebase Realtime Database |
| HTTP | Axios |
| Storage | Expo Secure Store |
| Lang | TypeScript |

## 📁 Project Structure

```
mobile/
├── app/
│   ├── (auth)/                       # Login, Register, Forgot, Verify Email
│   ├── (tabs)/                       # Main tabs
│   │   ├── index.tsx                 # Dashboard
│   │   ├── cases.tsx                 # Cases
│   │   ├── documents.tsx             # Documents
│   │   ├── notifications.tsx         # Notification center
│   │   └── profile.tsx               # Profile
│   ├── case/[id].tsx                 # Case details
│   ├── case/new.tsx                  # New case (scaffold)
│   ├── document/upload.tsx           # Document upload
│   ├── message/[id].tsx              # Chat room
│   ├── email/[id].tsx                # Email detail
│   ├── help/{faq,contact}.tsx        # FAQs & Contact
│   └── _layout.tsx                   # Providers & router
├── components/ui/                    # UI components
├── features/auth/                    # Auth screens & logic
├── lib/{api,services,types,...}/     # Core modules
├── stores/                           # Zustand stores
├── docs/                             # All documentation
└── eas.json                          # EAS build profiles
```

## 🔧 Development

```bash
pnpm type-check
pnpm lint
pnpm format
```

## 📦 Builds (EAS)

```bash
pnpm run build:dev:android
pnpm run build:dev:ios
pnpm run build:preview:{android,ios}
pnpm run build:prod:{android,ios}
pnpm run submit:{android,ios}
```

## 🔐 Security

- Token auth, secure storage, HTTPS-only in production
- Input/file validation, authenticated routes

## 📚 Key Docs

- `docs/SETUP_GUIDE.md` – Setup & environment
- `docs/ANDROID_DEV_GUIDE.md` – Android emulator & builds
- `docs/PUSH_NOTIFICATIONS_SETUP.md` – FCM setup
- `docs/AUTHENTICATION_SETUP.md` – Firebase Auth
- `docs/IMPLEMENTATION_SUMMARY.md` – Feature details
- `docs/GDPR_COMPLIANCE.md` – Compliance checklist
- `docs/BACKEND_GDPR_REQUIREMENTS.md` – Backend actions for GDPR

## 🐛 Troubleshooting

- Backend connection: verify API URL in `.env` and device IP
- Firebase: confirm config and enabled services
- Metro cache: `npx expo start -c`

## 🌳 Git Workflow

- Use feature branches: `feat/...`, `chore/...`, `fix/...`
- Current: `chore/i18n-and-feature-updates`

## 📄 License

Proprietary - Patrick Travel Services

---

Built with ❤️ for Patrick Travel Services

