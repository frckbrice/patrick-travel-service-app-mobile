#!/bin/bash

# Create directory structure
mkdir -p app/{(auth),(tabs)} features/auth/{screens,hooks,schemas} lib/{firebase,api,storage,services,types,constants} stores/auth assets

# Create essential config files
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "jsx": "react-native",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "noEmit": true,
    "isolatedModules": true,
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "**/*.ts",
    "**/*.tsx",
    ".expo/types/**/*.ts",
    "expo-env.d.ts"
  ],
  "exclude": [
    "node_modules"
  ],
  "extends": "expo/tsconfig.base"
}
EOF

cat > .gitignore << 'EOF'
node_modules/
.expo/
dist/
npm-debug.*
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/
.env
.env.local
EOF

cat > babel.config.js << 'EOF'
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
EOF

cat > metro.config.js << 'EOF'
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
module.exports = config;
EOF

cat > .prettierrc << 'EOF'
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
EOF

cat > README.md << 'EOF'
# Patrick Travel Services - Mobile App

React Native mobile application for immigration services.

## Setup

1. Install dependencies: `pnpm install`
2. Configure environment variables (see ENV_TEMPLATE.md)
3. Start app: `pnpm start`

## Stack

- React Native + Expo
- Firebase Auth
- Firebase Realtime Database
- UploadThing
- TanStack Query
- Zustand
EOF

echo "Mobile app structure created! Run 'pnpm install' to install dependencies."
