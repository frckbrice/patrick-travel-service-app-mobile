# Patrick Travel Services - Setup Guide

This guide will help you set up and run the Patrick Travel Services immigration management platform.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18 or higher
- **pnpm** (preferred) or yarn
- **PostgreSQL** database server
- **Git**
- **Expo CLI** (for mobile development): `npm install -g expo-cli`
- **iOS Simulator** (Mac only) or **Android Studio** (for Android development)

## 🚀 Quick Start

### Step 1: Initial Setup

```bash
# Navigate to project directory
cd "mpe-digital-project-1"

# Verify pnpm is installed
pnpm --version

# If pnpm is not installed:
npm install -g pnpm
```

### Step 3: Set Up PostgreSQL Database

You have two options:

#### Option B: Use Local PostgreSQL
```bash
# Create a new database
createdb patrick_travel_services

# Your connection string will be:
# postgresql://username:password@localhost:5432/patrick_travel_services
```

### Step 4: Web Application Setup

```bash
cd web

# Install dependencies
pnpm install

# Create .env.local file
touch .env.local
```

Edit `.env.local` and add:

```bash
# Database - Use Supabase connection string or local PostgreSQL
DATABASE_URL="postgresql://username:password@host:5432/database?schema=public"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="your-project-url.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# JWT Secrets - Generate with: openssl rand -base64 32
JWT_SECRET="your-generated-secret-key"
JWT_REFRESH_SECRET="your-generated-refresh-secret-key"

# API Configuration
NEXT_PUBLIC_API_URL="http://localhost:3000"

# Node Environment
NODE_ENV="development"
```

Generate JWT secrets:
```bash
# Run these commands to generate secure secrets
openssl rand -base64 32
openssl rand -base64 32
```

```bash
# Generate Prisma Client
pnpm prisma:generate

# Run database migrations
pnpm prisma:migrate

# (Optional) Open Prisma Studio to view database
pnpm prisma:studio

# Start development server
pnpm dev
```

The web application will be available at **http://localhost:3000**

### Step 5: Mobile Application Setup

```bash
# Open a new terminal
cd mobile

# Install dependencies
pnpm install

# Create .env file
touch .env
```

Edit `.env` and add:

```bash
# API Configuration - Use your computer's IP for physical devices
EXPO_PUBLIC_API_URL="http://localhost:3000"

# Supabase (same as web app)
EXPO_PUBLIC_SUPABASE_URL="your-project-url.supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# Environment
NODE_ENV="development"
```

**Important for physical devices:**
If you're testing on a physical device, replace `localhost` with your computer's IP address:
```bash
# Find your IP address:
# Mac/Linux: ifconfig | grep "inet "
# Windows: ipconfig

EXPO_PUBLIC_API_URL="http://192.168.1.x:3000"
```

```bash
# Start Expo development server
pnpm start

# Or run directly on a platform:
pnpm run ios      # iOS Simulator
pnpm run android  # Android Emulator
pnpm run web      # Web browser
```

## 🗄️ Database Setup

### Create Initial Admin User

After running migrations, you'll need to create an admin user. You can do this via Prisma Studio or directly in the database.

```bash
cd web
pnpm prisma:studio
```

1. Navigate to the **User** table
2. Click **Add record**
3. Fill in:
   - email: admin@patricktravel.com
   - password: (hash with bcrypt - see note below)
   - firstName: Admin
   - lastName: User
   - role: ADMIN
   - isActive: true
   - isVerified: true

**To hash a password:**
```javascript
// You can use this in Node.js console
const bcrypt = require('bcryptjs');
const hashedPassword = await bcrypt.hash('YourPassword123!', 12);
console.log(hashedPassword);
```

## 🧪 Testing the Setup

### Web Application Tests

1. Visit **http://localhost:3000**
2. You should see the landing page
3. Click "Agent Login"
4. Try logging in with the admin credentials you created

### Mobile Application Tests

1. Open the Expo app on your phone or simulator
2. Scan the QR code from the terminal
3. The app should load and show the splash screen
4. Try registering a new client account

## 🔧 Development Workflow

### Running Both Applications

You'll need two terminal windows:

**Terminal 1 - Web App:**
```bash
cd web
pnpm dev
```

**Terminal 2 - Mobile App:**
```bash
cd mobile
pnpm start
```

### Making Database Changes

```bash
cd web

# 1. Edit prisma/schema.prisma
# 2. Create and apply migration
pnpm prisma:migrate

# 3. Regenerate Prisma Client
pnpm prisma:generate
```

### Code Quality Checks

```bash
cd web

# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Check TypeScript types
pnpm type-check

# Run all checks
pnpm validate
```

## 📝 Development Notes


### API Development

API routes are in `web/src/app/api/`. Each route follows this pattern:

```typescript
// web/src/app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ success: true, data: 'Hello' });
}
```

### Adding shadcn/ui Components

```bash
cd web

# Example: Add a button component
pnpm dlx shadcn@latest add button

# Example: Add multiple components
pnpm dlx shadcn@latest add button input card dialog
```

## 🐛 Troubleshooting

### Issue: Cannot connect to database

**Solution:**
1. Check if PostgreSQL is running
2. Verify DATABASE_URL in .env.local
3. Try connecting with `pnpm prisma:studio`

### Issue: Mobile app can't reach API

**Solution:**
1. Make sure web app is running (Terminal 1)
2. If using physical device, use your computer's IP instead of localhost
3. Check firewall settings

### Issue: Prisma migration errors

**Solution:**
```bash
cd web

# Reset database (WARNING: This deletes all data)
pnpm prisma migrate reset

# Or push schema without migrations
pnpm prisma:push
```

### Issue: Module not found errors

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules
pnpm install

# Clear Next.js cache
rm -rf .next
```

### Issue: Port already in use

**Solution:**
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)
```

## 📱 Mobile Development Tips

### Running on iOS Simulator
```bash
cd mobile
pnpm run ios
```

Requirements:
- Mac computer
- Xcode installed
- iOS Simulator running

### Running on Android Emulator
```bash
cd mobile
pnpm run android
```

Requirements:
- Android Studio installed
- Android Emulator created and running
- ANDROID_HOME environment variable set

### Running on Physical Device
1. Install Expo Go app from App Store or Play Store
2. Scan QR code from terminal
3. Make sure your device and computer are on the same network

## 🚢 Building for Production

### Web Application

```bash
cd web

# Build
pnpm build

# Test production build locally
pnpm start

# Deploy to Vercel
# Follow Vercel deployment instructions
```

### Mobile Application

```bash
cd mobile

# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Expo Documentation](https://docs.expo.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)

## 🆘 Getting Help

If you encounter issues not covered in this guide:

1. Check the main README.md
2. Review requirements.md for detailed specifications
3. Check the console for error messages
4. Search existing GitHub issues
5. Contact the development team

---

**Happy Coding! 🚀**
