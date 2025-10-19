import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Button } from '../../components/ui';
import { COLORS, SPACING } from '../../lib/constants';

export default function TermsAndConditionsScreen() {
    const router = useRouter();

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                <Text variant="headlineMedium" style={styles.title}>
                    Terms and Conditions
                </Text>
                <Text variant="bodySmall" style={styles.lastUpdated}>
                    Last updated: October 19, 2025
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    1. Acceptance of Terms
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    By accessing and using the Patrick Travel Services mobile application, you accept and agree to be bound by these Terms and Conditions. If you disagree with any part of these terms, you must not use our application.
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    2. Service Description
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    Patrick Travel Services provides immigration consultation services through our mobile application, including:{'\n\n'}
                    • Case management and tracking{'\n'}
                    • Document upload and verification{'\n'}
                    • Real-time communication with advisors{'\n'}
                    • Push notifications for updates{'\n'}
                    • Access to immigration resources and FAQs
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    3. User Accounts
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    <Text style={styles.bold}>Account Creation:</Text>{'\n'}
                    • You must provide accurate and complete information{'\n'}
                    • You are responsible for maintaining account security{'\n'}
                    • You must be at least 18 years old{'\n'}
                    • One account per person{'\n\n'}

                    <Text style={styles.bold}>Account Security:</Text>{'\n'}
                    • Keep your password confidential{'\n'}
                    • Notify us immediately of unauthorized access{'\n'}
                    • You are responsible for all activities under your account
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    4. Acceptable Use
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    You agree NOT to:{'\n\n'}
                    • Violate any laws or regulations{'\n'}
                    • Upload false or misleading documents{'\n'}
                    • Impersonate another person{'\n'}
                    • Interfere with the app's operation{'\n'}
                    • Use the service for unauthorized purposes{'\n'}
                    • Share your account with others{'\n'}
                    • Attempt to access unauthorized areas{'\n'}
                    • Upload malicious content or viruses
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    5. Intellectual Property
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    All content, features, and functionality of the app are owned by Patrick Travel Services and protected by international copyright, trademark, and other intellectual property laws.
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    6. Document Upload and Storage
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    • You grant us permission to store and process your uploaded documents{'\n'}
                    • You are responsible for the accuracy of uploaded documents{'\n'}
                    • We use secure third-party storage (UploadThing){'\n'}
                    • Documents are retained as long as your account is active or as required by law{'\n'}
                    • You can delete documents at any time
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    7. Service Limitations
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    <Text style={styles.bold}>We do NOT guarantee:</Text>{'\n'}
                    • Visa or immigration approval{'\n'}
                    • Uninterrupted service availability{'\n'}
                    • Error-free operation{'\n'}
                    • Specific processing times{'\n\n'}

                    Immigration outcomes depend on government authorities, not our service. We provide consultation and support but cannot control final decisions.
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    8. Fees and Payment
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    • Service fees are communicated before case submission{'\n'}
                    • Payment terms are specified in your service agreement{'\n'}
                    • Fees are non-refundable except as required by law{'\n'}
                    • We reserve the right to modify fees with notice
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    9. Termination
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    <Text style={styles.bold}>You may:</Text>{'\n'}
                    • Delete your account at any time from app settings{'\n'}
                    • Data will be permanently deleted within 30 days{'\n\n'}

                    <Text style={styles.bold}>We may:</Text>{'\n'}
                    • Suspend or terminate accounts for Terms violations{'\n'}
                    • Terminate service with 30 days notice{'\n'}
                    • Retain data as required by law after termination
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    10. Limitation of Liability
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    Patrick Travel Services shall not be liable for:{'\n\n'}
                    • Immigration application rejections{'\n'}
                    • Delays in processing by government authorities{'\n'}
                    • Loss of data due to circumstances beyond our control{'\n'}
                    • Indirect, incidental, or consequential damages{'\n\n'}

                    Our total liability is limited to the fees paid for services.
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    11. Indemnification
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    You agree to indemnify and hold Patrick Travel Services harmless from any claims, damages, or expenses arising from your use of the app or violation of these Terms.
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    12. Dispute Resolution
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    • Disputes will be resolved through good-faith negotiation{'\n'}
                    • If unresolved, binding arbitration will be used{'\n'}
                    • Governing law: [Specify your jurisdiction]{'\n'}
                    • Venue: [Specify location]
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    13. Changes to Terms
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting in the app. Your continued use constitutes acceptance of modified Terms.
                </Text>

                <Text variant="titleMedium" style={styles.sectionTitle}>
                    14. Contact Information
                </Text>
                <Text variant="bodyMedium" style={styles.paragraph}>
                    For questions about these Terms:{'\n\n'}
                    Email: legal@patricktravel.com{'\n'}
                    Phone: [Your Phone Number]{'\n'}
                    Address: [Your Business Address]
                </Text>

                <View style={styles.disclaimer}>
                    <Text variant="bodySmall" style={styles.disclaimerText}>
                        By using Patrick Travel Services, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions and our Privacy Policy.
                    </Text>
                </View>

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
    disclaimer: {
        backgroundColor: COLORS.primary + '10',
        padding: SPACING.md,
        borderRadius: 8,
        marginTop: SPACING.lg,
        marginBottom: SPACING.md,
    },
    disclaimerText: {
        color: COLORS.text,
        lineHeight: 20,
        textAlign: 'center',
    },
    closeButton: {
        marginTop: SPACING.md,
        marginBottom: SPACING.xl,
    },
});

