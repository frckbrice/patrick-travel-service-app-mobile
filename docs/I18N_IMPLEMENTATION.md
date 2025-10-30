# 🌍 Internationalization (i18n) Implementation Guide

## ✅ Complete Translation Files

Both English and French translation files have been fully updated with comprehensive keys for all screens.

### Translation Files
- `lib/i18n/locales/en.json` - English (222 lines)
- `lib/i18n/locales/fr.json` - French (222 lines)

### Translation Categories

1. **common** - Common UI elements (buttons, actions, states)
2. **auth** - Authentication screens (login, register, passwords)
3. **dashboard** - Dashboard screen
4. **cases** - Case management screens
5. **documents** - Document management screens  
6. **messages** - Chat/messaging screens
7. **profile** - Profile and settings screens
8. **notifications** - Notification preferences
9. **settings** - App settings (theme, etc.)
10. **help** - FAQ and contact support
11. **onboarding** - Onboarding carousel
12. **errors** - Error messages

## 📝 How to Use Translations in Screens

### 1. Import and Initialize

```typescript
import { useTranslation } from 'react-i18next';

export default function MyScreen() {
  const { t } = useTranslation();
  
  return (
    <Text>{t('common.welcome')}</Text>
  );
}
```

### 2. Translation with Variables

```typescript
// English: "Welcome back, {{name}}!"
<Text>{t('dashboard.welcomeUser', { name: user?.firstName })}</Text>
```

### 3. Nested Keys

```typescript
<Text>{t('auth.signIn')}</Text>           // "Sign In"
<Text>{t('profile.editProfile')}</Text>   // "Edit Profile"
<Text>{t('cases.statusHistory')}</Text>   // "Status History"
```

## 🔄 Screens That Need i18n Update

Due to the large number of screens, here's the complete list of what needs updating:

### Authentication Screens ✅ (Example provided below)
- [x] `features/auth/screens/LoginScreen.tsx`
- [ ] `features/auth/screens/RegisterScreen.tsx`
- [ ] `features/auth/screens/ForgotPasswordScreen.tsx`
- [ ] `app/(auth)/verify-email.tsx`

### Dashboard & Main Tabs
- [ ] `app/(tabs)/index.tsx` - Dashboard
- [ ] `app/(tabs)/cases.tsx` - Cases list
- [ ] `app/(tabs)/documents.tsx` - Documents list
- [ ] `app/(tabs)/messages.tsx` - Messages list
- [ ] `app/(tabs)/profile.tsx` - Profile

### Case Screens
- [ ] `app/case/[id].tsx` - Case details
- [ ] `app/case/new.tsx` - New case form

### Document Screens
- [ ] `app/document/upload.tsx` - Upload document
- [ ] `app/document/[id].tsx` - Document details

### Profile Screens
- [ ] `app/profile/edit.tsx` - Edit profile
- [ ] `app/profile/change-password.tsx` - Change password
- [ ] `app/profile/notifications.tsx` - Notification preferences
- [ ] `app/profile/settings.tsx` - App settings

### Help Screens
- [ ] `app/help/faq.tsx` - FAQs
- [ ] `app/help/contact.tsx` - Contact support

### Message Screen
- [ ] `app/message/[id].tsx` - Chat interface

## 📖 Example: Login Screen with i18n

Here's how to update the LoginScreen:

```typescript
import { useTranslation } from 'react-i18next';

export default function LoginScreen() {
  const { t } = useTranslation();
  
  return (
    <View>
      <Text variant="headlineLarge">
        {t('auth.welcomeBack')}
      </Text>
      <Text variant="bodyLarge">
        {t('auth.signInToContinue')}
      </Text>
      
      <TextInput
        label={t('auth.email')}
        // ...
      />
      
      <TextInput
        label={t('auth.password')}
        // ...
      />
      
      <Checkbox />
      <Text>{t('auth.rememberMe')}</Text>
      
      <Link href="/(auth)/forgot-password">
        <Text>{t('auth.forgotPassword')}</Text>
      </Link>
      
      <Button onPress={handleSubmit}>
        {t('auth.signIn')}
      </Button>
      
      <Text>{t('auth.dontHaveAccount')} </Text>
      <Link href="/(auth)/register">
        <Text>{t('auth.signUp')}</Text>
      </Link>
    </View>
  );
}
```

## 🎯 Quick Reference

### Common Translations
```typescript
t('common.save')           // Save
t('common.cancel')         // Cancel
t('common.delete')         // Delete
t('common.loading')        // Loading...
t('common.error')          // Error
t('common.success')        // Success
```

### Form Labels
```typescript
t('auth.email')           // Email
t('auth.password')        // Password  
t('auth.firstName')       // First Name
t('auth.lastName')        // Last Name
```

### Buttons
```typescript
t('auth.signIn')          // Sign In
t('auth.signUp')          // Sign Up
t('common.submit')        // Submit
t('common.saveChanges')   // Save Changes
```

### Messages
```typescript
t('profile.profileUpdated')     // Profile updated successfully
t('documents.uploadSuccess')    // Document uploaded successfully
t('cases.caseSubmitted')        // Case submitted successfully
```

## 🔄 Pattern for Updating Screens

For each screen file:

1. **Add import**:
   ```typescript
   import { useTranslation } from 'react-i18next';
   ```

2. **Initialize hook**:
   ```typescript
   const { t } = useTranslation();
   ```

3. **Replace hardcoded strings**:
   ```typescript
   // Before
   <Text>Welcome Back</Text>
   
   // After  
   <Text>{t('auth.welcomeBack')}</Text>
   ```

4. **Update Alert dialogs**:
   ```typescript
   // Before
   Alert.alert('Success', 'Profile updated');
   
   // After
   Alert.alert(t('common.success'), t('profile.profileUpdated'));
   ```

## 🌐 Language Switching

Users can switch languages through:
1. Device settings (auto-detected)
2. Manual selection (can be added to Settings screen)

```typescript
import i18n from '../lib/i18n';

// Change language
i18n.changeLanguage('fr'); // French
i18n.changeLanguage('en'); // English
```

## ✨ Benefits

- ✅ Fully bilingual app (English & French)
- ✅ Easy to add more languages
- ✅ Consistent translations across app
- ✅ Single source of truth for all text
- ✅ Dynamic language switching
- ✅ Follows best practices

## 📚 Resources

- Translation files: `lib/i18n/locales/`
- i18n config: `lib/i18n/index.ts`
- Documentation: [react-i18next](https://react.i18next.com/)

---

**Status**: Translation files complete ✅  
**Next Step**: Apply to all screens (pattern provided above)
**Estimated Time**: ~2-3 hours to update all 20+ screens

