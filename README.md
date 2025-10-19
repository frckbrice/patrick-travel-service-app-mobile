# Patrick Travel Services - Mobile App 📱

> Complete production-ready React Native mobile application for Patrick Travel Services immigration management platform.

## 🌟 Overview

A comprehensive mobile application that allows clients to:
- Manage immigration cases
- Upload and track documents
- Chat in real-time with advisors using Firebase
- Receive notifications
- Track case progress
- Access FAQs and support

## ✨ Features

### 🔐 Authentication & Security
- Email/password login with Firebase
- User registration with validation
- Password recovery flow
- Email verification
- Secure token storage (expo-secure-store)
- Auto-login functionality
- Remember me option

### 📊 Dashboard
- Quick statistics overview (cases, documents, messages)
- Recent activity timeline
- Quick action buttons
- Pull-to-refresh

### 📂 Case Management
- View all cases with filtering
- Search by reference number
- Case details with status history
- Real-time status updates
- Submit new cases (ready for implementation)
- Timeline visualization

### 📄 Document Management  
- Upload documents via UploadThing
- Support for images and PDFs (max 10MB)
- Document categorization
- Status tracking (pending, approved, rejected)
- File preview and download
- Camera and gallery integration

### 💬 Real-time Messaging
- Chat with advisors using Firebase Realtime Database
- Message history
- Unread count badges
- Read receipts
- Typing indicators support
- File attachments support

### 🔔 Notifications
- In-app notifications
- Email notifications
- Case status updates
- Message alerts
- Document status changes

### ❓ Help & Support
- Searchable FAQ system
- Contact support form
- Email integration

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (or yarn/npm)
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Studio

### Installation

```bash
cd mobile
pnpm install
```

### Configuration

1. Create `.env` file (see `.env.example` or `ENV_TEMPLATE.md`):

```bash
# API
EXPO_PUBLIC_API_URL=http://localhost:3000

# Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=your-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
EXPO_PUBLIC_FIREBASE_DATABASE_URL=your-db-url

# UploadThing
EXPO_PUBLIC_UPLOADTHING_API_KEY=your-key
EXPO_PUBLIC_UPLOADTHING_APP_ID=your-app-id
```

2. Set up Firebase:
   - Create Firebase project
   - Enable Realtime Database
   - Enable Email/Password authentication
   - Copy config to `.env`

3. Set up UploadThing:
   - Create account at uploadthing.com
   - Get API key and App ID
   - Add to `.env`

### Running

```bash
# Start development server
pnpm start

# Run on iOS
pnpm ios

# Run on Android
pnpm android

# Run on web
pnpm web
```

## 📱 Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | React Native + Expo |
| **Navigation** | Expo Router (file-based) |
| **State Management** | Zustand |
| **Data Fetching** | TanStack Query |
| **Forms** | React Hook Form + Zod |
| **UI Library** | React Native Paper |
| **Icons** | Expo Vector Icons |
| **Real-time Chat** | Firebase Realtime Database |
| **Authentication** | Firebase Auth |
| **File Upload** | UploadThing |
| **Storage** | Expo Secure Store |
| **HTTP Client** | Axios |
| **Date Handling** | date-fns |
| **Language** | TypeScript |

## 📁 Project Structure

```
mobile/
├── app/                          # Expo Router app directory
│   ├── (auth)/                   # Authentication screens
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── forgot-password.tsx
│   │   └── verify-email.tsx
│   ├── (tabs)/                   # Main tab navigation
│   │   ├── index.tsx             # Dashboard
│   │   ├── cases.tsx             # Cases list
│   │   ├── documents.tsx         # Documents list
│   │   ├── messages.tsx          # Chat conversations
│   │   └── profile.tsx           # User profile
│   ├── case/
│   │   └── [id].tsx              # Case details
│   ├── document/
│   │   └── upload.tsx            # Document upload
│   ├── message/
│   │   └── [id].tsx              # Chat screen
│   ├── help/
│   │   ├── faq.tsx               # FAQs
│   │   └── contact.tsx           # Contact support
│   ├── _layout.tsx               # Root layout + providers
│   └── index.tsx                 # Entry point
├── components/
│   └── DashboardCard.tsx         # Reusable UI components
├── features/
│   └── auth/                     # Auth feature module
│       ├── hooks/
│       │   └── useAuth.ts        # Auth hooks
│       ├── schemas/
│       │   └── authSchemas.ts    # Validation schemas
│       └── screens/              # Auth screen components
├── lib/
│   ├── api/                      # API client modules
│   │   ├── auth.api.ts
│   │   ├── cases.api.ts
│   │   ├── documents.api.ts
│   │   ├── faq.api.ts
│   │   ├── notifications.api.ts
│   │   └── user.api.ts
│   ├── constants/
│   │   └── index.ts              # App constants
│   ├── firebase/
│   │   └── config.ts             # Firebase setup
│   ├── services/
│   │   ├── chat.ts               # Firebase chat service
│   │   ├── email.ts              # Email service
│   │   └── uploadthing.ts        # File upload service
│   ├── storage/
│   │   └── secureStorage.ts      # Secure storage utility
│   ├── types/
│   │   └── index.ts              # TypeScript types
│   └── utils/
│       └── logger.ts             # Custom logger
├── stores/                       # Zustand stores
│   ├── auth/
│   │   └── authStore.ts
│   ├── cases/
│   │   └── casesStore.ts
│   └── notifications/
│       └── notificationsStore.ts
├── app.json                      # Expo configuration
├── package.json
├── tsconfig.json
├── ENV_TEMPLATE.md
├── SETUP_GUIDE.md               # Detailed setup instructions
└── IMPLEMENTATION_SUMMARY.md    # Complete feature list
```

## 🔧 Development

```bash
# Type checking
pnpm type-check

# Linting
pnpm lint

# Format code
pnpm format
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

## 🔐 Security

- JWT token-based authentication
- Secure storage for sensitive data
- HTTPS only in production
- File upload validation (size, type)
- Input sanitization
- Authentication required for all protected routes

## 📚 Documentation

- **SETUP_GUIDE.md** - Complete setup instructions
- **IMPLEMENTATION_SUMMARY.md** - Detailed feature list
- **ENV_TEMPLATE.md** - Environment variables reference

## 🐛 Troubleshooting

### Cannot connect to backend
- Verify backend is running
- Check `EXPO_PUBLIC_API_URL` in `.env`
- For physical devices, use your computer's IP (not localhost)

### Firebase errors
- Verify all Firebase config in `.env`
- Check Firebase Console for enabled services
- Ensure database rules allow read/write

### Metro bundler issues
```bash
npx expo start -c
```

## 🆘 Support

For detailed help, see:
1. `SETUP_GUIDE.md` - Setup instructions
2. `IMPLEMENTATION_SUMMARY.md` - Feature documentation
3. Console errors for debugging

## ✅ Production Ready

- [x] Type-safe TypeScript codebase
- [x] Error handling & loading states
- [x] Secure authentication
- [x] Real-time messaging
- [x] File upload integration
- [x] Form validation
- [x] Consistent UI/UX
- [x] Pull-to-refresh
- [x] Search & filtering
- [x] Responsive design

## 📄 License

Proprietary - Patrick Travel Services

---

**Built with ❤️ for Patrick Travel Services**

For questions or support, contact the development team.

