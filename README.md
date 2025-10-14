# Patrick Travel Services - Mobile App 

React Native mobile app for Patrick Travel Services immigration platform.

##  Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm start

# Run on iOS
pnpm ios

# Run on Android  
pnpm android
```

##  Tech Stack

- **React Native + Expo** - Cross-platform mobile framework
- **Firebase Auth** - User authentication
- **Firebase Realtime Database** - Real-time chat/messaging
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management
- **React Hook Form + Zod** - Form handling and validation
- **Expo Router** - File-based navigation
- **React Native Paper** - UI components
- **UploadThing** - File uploads (uploadthing.com)
- **Axios** - HTTP client

##  Project Structure

```
mobile/
├── app/                    # Expo Router app directory
│   ├── (auth)/            # Auth screens (login, register)
│   ├── (tabs)/            # Main tab navigation
│   ├── _layout.tsx        # Root layout
│   └── index.tsx          # Entry point
├── features/              # Feature modules
│   └── auth/              # Authentication feature
│       ├── hooks/         # Auth hooks
│       ├── schemas/       # Validation schemas
│       └── screens/       # Auth screens
├── lib/                   # Shared utilities
│   ├── api/              # API client (axios)
│   ├── firebase/         # Firebase config
│   ├── services/         # External services (UploadThing)
│   ├── storage/          # Secure storage
│   ├── types/            # TypeScript types
│   └── constants/        # App constants
└── stores/               # Zustand stores
```

##  Configuration

1. Copy `.env.example` to `.env`
2. Add your Firebase credentials
3. Add your API URL
4. Add UploadThing API key

##  Environment Variables

See `ENV_TEMPLATE.md` for required environment variables.

##  Features

-  Firebase Authentication
-  Real-time chat with Firebase Realtime Database
-  File uploads with UploadThing
-  Secure token storage
-  Tab-based navigation
-  Type-safe routing
-  Case management (TODO)
-  Document management (TODO)
-  Push notifications (TODO)

##  Development

```bash
# Type checking
pnpm type-check

# Linting
pnpm lint

# Format code
pnpm format
```

##  Building

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

##  Related Repositories

- Web Platform: https://github.com/frckbrice/patrick-travel-service-web
- Mobile App: https://github.com/frckbrice/patrick-travel-service-app-mobile

##  License

Proprietary - Avom brice, 
portfolio: https://maebrieporfolio.vercel.app

