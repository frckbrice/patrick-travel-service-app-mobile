import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Button } from '../../components/ui';
import { COLORS, SPACING } from '../../lib/constants';

export default function PrivacyPolicyScreen() {
    const router = useRouter();

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                <Text variant="headlineMedium" style={styles.title}>
                    Privacy Policy
                </Text>
                <Text variant="bodySmall" style={styles.lastUpdated}>
                    Last updated: October 19, 2025
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    1. Introduction
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    Patrick Travel Services ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    2. Information We Collect
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    <Text style={styles.bold}>Personal Information:</Text>{'\n'}
                    • Name (first and last name){'\n'}
                    • Email address{'\n'}
                    • Phone number{'\n'}
                    • Immigration case details{'\n'}
                    • Uploaded documents (passports, IDs, travel documents){'\n'}
                    • Chat messages with advisors{'\n\n'}

                    <Text style={styles.bold}>Technical Information:</Text>{'\n'}
                    • Device information (model, OS version){'\n'}
                    • Push notification tokens{'\n'}
                    • IP address{'\n'}
                    • App usage data{'\n'}
                    • Crash reports and diagnostics
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    3. How We Use Your Information
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    We use your information to:{'\n\n'}
                    • Provide immigration consultation services{'\n'}
                    • Process and manage your cases{'\n'}
                    • Communicate with you about your cases{'\n'}
                    • Send push notifications for updates{'\n'}
                    • Store and manage your documents securely{'\n'}
                    • Improve our services{'\n'}
                    • Comply with legal obligations{'\n'}
                    • Prevent fraud and ensure security
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    4. Third-Party Services
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    We use the following third-party services:{'\n\n'}

                    <Text style={styles.bold}>Firebase (Google):</Text>{'\n'}
                    • Authentication{'\n'}
                    • Real-time database{'\n'}
                    • Cloud messaging{'\n'}
                    • Analytics{'\n\n'}

                    <Text style={styles.bold}>UploadThing:</Text>{'\n'}
                    • Document storage and management{'\n\n'}

                    <Text style={styles.bold}>Expo:</Text>{'\n'}
                    • Push notification delivery{'\n\n'}

                    These services may collect information as described in their respective privacy policies.
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    5. Data Security
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    We implement industry-standard security measures:{'\n\n'}
                    • End-to-end encryption for data transmission (HTTPS/TLS){'\n'}
                    • Encrypted storage in device keychain{'\n'}
                    • Secure authentication with Firebase{'\n'}
                    • Regular security audits{'\n'}
                    • Access controls and authentication{'\n'}
                    • Biometric authentication option (Face ID/Touch ID)
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    6. Your Rights (GDPR)
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    You have the right to:{'\n\n'}
                    • <Text style={styles.bold}>Access:</Text> View all your personal data{'\n'}
                    • <Text style={styles.bold}>Rectification:</Text> Update incorrect information{'\n'}
                    • <Text style={styles.bold}>Erasure:</Text> Delete your account and data{'\n'}
                    • <Text style={styles.bold}>Data Portability:</Text> Export your data in JSON format{'\n'}
                    • <Text style={styles.bold}>Object:</Text> Opt-out of certain data processing{'\n'}
                    • <Text style={styles.bold}>Withdraw Consent:</Text> At any time{'\n\n'}

                    To exercise these rights, contact us at: privacy@patricktravel.com
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    7. Data Retention
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    We retain your data for as long as:{'\n\n'}
                    • Your account is active{'\n'}
                    • Necessary to provide services{'\n'}
                    • Required by law (typically 7 years for immigration documents){'\n\n'}

                    When you delete your account, we permanently erase your personal data within 30 days, except where legal obligations require retention.
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    8. Children's Privacy
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    Our service is not intended for users under 18 years of age. We do not knowingly collect personal information from children.
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    9. International Data Transfers
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    Your information may be transferred to and processed in countries outside your country of residence. We ensure appropriate safeguards are in place to protect your data in compliance with GDPR.
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    10. Changes to This Policy
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy in the app and updating the "Last updated" date.
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    11. Contact Us
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    For questions about this Privacy Policy or to exercise your rights:{'\n\n'}
                    Email: privacy@patricktravel.com{'\n'}
                    Address: [Your Business Address]{'\n'}
                    Data Protection Officer: [DPO Name/Contact]
                </Text>

                <Button
                    title="Close"
                    onPress={() => router.back()}
                    style={styles.closeButton}
                />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: SPACING.lg,
    },
    title: {
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: SPACING.xs,
    },
    lastUpdated: {
        color: COLORS.textSecondary,
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontWeight: 'bold',
        color: COLORS.text,
        marginTop: SPACING.lg,
        marginBottom: SPACING.sm,
    },
    paragraph: {
        color: COLORS.text,
        lineHeight: 24,
        marginBottom: SPACING.md,
    },
    bold: {
        fontWeight: 'bold',
    },
    closeButton: {
        marginTop: SPACING.xl,
        marginBottom: SPACING.xl,
    },
});

