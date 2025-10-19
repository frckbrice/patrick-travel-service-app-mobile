#!/bin/bash

# This script helps identify hardcoded strings that need translation
# Run from mobile directory: bash scripts/apply-i18n.sh

echo "🌍 Scanning for hardcoded strings in screens..."
echo ""

# List of screen files
SCREENS=(
  "features/auth/screens/RegisterScreen.tsx"
  "features/auth/screens/ForgotPasswordScreen.tsx"  
  "app/(auth)/verify-email.tsx"
  "app/(tabs)/index.tsx"
  "app/(tabs)/cases.tsx"
  "app/(tabs)/documents.tsx"
  "app/(tabs)/messages.tsx"
  "app/(tabs)/profile.tsx"
  "app/case/[id].tsx"
  "app/case/new.tsx"
  "app/document/upload.tsx"
  "app/document/[id].tsx"
  "app/message/[id].tsx"
  "app/help/faq.tsx"
  "app/help/contact.tsx"
  "app/profile/edit.tsx"
  "app/profile/change-password.tsx"
  "app/profile/notifications.tsx"
  "app/profile/settings.tsx"
)

for screen in "${SCREENS[@]}"; do
  if [ -f "$screen" ]; then
    echo "📄 $screen"
    # Check if useTranslation is imported
    if grep -q "useTranslation" "$screen"; then
      echo "  ✅ useTranslation imported"
    else
      echo "  ❌ Missing useTranslation import"
    fi
  fi
done

echo ""
echo "📋 To apply translations:"
echo "1. Add: import { useTranslation } from 'react-i18next';"
echo "2. Add: const { t } = useTranslation();"
echo "3. Replace hardcoded strings with t('key')"
echo ""
echo "See I18N_IMPLEMENTATION.md for full guide"


