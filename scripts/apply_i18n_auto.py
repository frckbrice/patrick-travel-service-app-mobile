#!/usr/bin/env python3
"""
Automated i18n string replacement script
This helps identify and suggest replacements for hardcoded strings
"""

import re
import os

# Translation mappings - common patterns
TRANSLATIONS = {
    # Auth screens
    '"Welcome Back"': "t('auth.welcomeBack')",
    '"Sign in to continue to Patrick Travel Services"': "t('auth.signInToContinue')",
    '"Create Account"': "t('auth.createAccount')",
    '"Sign up to get started with Patrick Travel Services"': "t('auth.signUpToGetStarted')",
    '"Email"': "t('auth.email')",
    '"Password"': "t('auth.password')",
    '"Confirm Password"': "t('auth.confirmPassword')",
    '"First Name"': "t('auth.firstName')",
    '"Last Name"': "t('auth.lastName')",
    '"Phone (Optional)"': "t('auth.phoneOptional')",
    '"Sign In"': "t('auth.signIn')",
    '"Sign Up"': "t('auth.signUp')",
    '"Remember me"': "t('auth.rememberMe')",
    '"Forgot Password?"': "t('auth.forgotPassword')",
    '"Don\'t have an account? "': "t('auth.dontHaveAccount') + ' '",
    '"Already have an account? "': "t('auth.alreadyHaveAccount') + ' '",
    
    # Dashboard
    '"Total Cases"': "t('dashboard.totalCases')",
    '"Active Cases"': "t('dashboard.activeCases')",
    '"Pending Documents"': "t('dashboard.pendingDocuments')",
    '"Unread Messages"': "t('dashboard.unreadMessages')",
    '"Quick Actions"': "t('dashboard.quickActions')",
    '"Submit New Case"': "t('dashboard.submitNewCase')",
    '"Upload Document"': "t('dashboard.uploadDocument')",
    '"View FAQs"': "t('dashboard.viewFAQs')",
    
    # Cases
    '"Search by reference number"': "t('cases.searchByReference')",
    '"No cases found"': "t('cases.noCasesFound')",
    '"Message Advisor"': "t('cases.messageAdvisor')",
    '"Status History"': "t('cases.statusHistory')",
    
    # Common
    '"Loading..."': "t('common.loading')",
    '"Success"': "t('common.success')",
    '"Error"': "t('common.error')",
    '"OK"': "t('common.ok')",
    '"Cancel"': "t('common.cancel')",
    '"Save"': "t('common.save')",
    '"Delete"': "t('common.delete')",
}

def find_hardcoded_strings(file_path):
    """Find potential hardcoded strings in a file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all string literals
    pattern = r'"([^"\\]*(\\.[^"\\]*)*)"'
    matches = re.findall(pattern, content)
    
    # Filter for likely UI strings (longer than 2 chars, not paths/codes)
    ui_strings = []
    for match in matches:
        string = match[0] if isinstance(match, tuple) else match
        if len(string) > 2 and not string.startswith('/') and not string.startswith('#'):
            ui_strings.append(f'"{string}"')
    
    return list(set(ui_strings))

def check_file(file_path):
    """Check a file for hardcoded strings"""
    if not os.path.exists(file_path):
        return
    
    print(f"\n📄 {file_path}")
    
    # Check if useTranslation is imported
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'useTranslation' not in content:
        print("  ❌ Missing: import { useTranslation } from 'react-i18next';")
        print("  ❌ Missing: const { t } = useTranslation();")
    else:
        print("  ✅ useTranslation imported")
    
    # Find hardcoded strings
    strings = find_hardcoded_strings(file_path)
    if strings:
        print(f"  Found {len(strings)} potential hardcoded strings")
        # Show first 5
        for s in strings[:5]:
            if s in TRANSLATIONS:
                print(f"    {s} → {TRANSLATIONS[s]}")

# Files to check
files = [
    "features/auth/screens/RegisterScreen.tsx",
    "features/auth/screens/ForgotPasswordScreen.tsx",
    "app/(tabs)/index.tsx",
    "app/(tabs)/cases.tsx",
    "app/(tabs)/documents.tsx",
    "app/(tabs)/messages.tsx",
    "app/(tabs)/profile.tsx",
]

print("🌍 i18n Checker - Patrick Travel Services Mobile")
print("=" * 60)

for file in files:
    check_file(file)

print("\n✅ Check complete!")
print("\nSee I18N_IMPLEMENTATION.md for full translation guide")


