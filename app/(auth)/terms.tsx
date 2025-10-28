import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui';
import { COLORS, SPACING } from '../../lib/constants';

export default function TermsAndConditionsScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          {t('legal.terms.title')}
        </Text>
        <Text variant="bodySmall" style={styles.lastUpdated}>
          {t('legal.terms.lastUpdated')}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('legal.terms.acceptance.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          {t('legal.terms.acceptance.content')}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('legal.terms.serviceDescription.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          {t('legal.terms.serviceDescription.content')}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('legal.terms.userAccounts.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          <Text style={styles.bold}>{t('legal.terms.userAccounts.accountCreation')}</Text>
          {'\n'}{t('legal.terms.userAccounts.accountCreationList')}{'\n\n'}
          <Text style={styles.bold}>{t('legal.terms.userAccounts.accountSecurity')}</Text>
          {'\n'}{t('legal.terms.userAccounts.accountSecurityList')}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('legal.terms.acceptableUse.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          {t('legal.terms.acceptableUse.content')}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('legal.terms.intellectualProperty.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          {t('legal.terms.intellectualProperty.content')}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('legal.terms.documentUpload.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          {t('legal.terms.documentUpload.content')}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('legal.terms.serviceLimitations.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          <Text style={styles.bold}>{t('legal.terms.serviceLimitations.weDoNotGuarantee')}</Text>
          {'\n'}{t('legal.terms.serviceLimitations.limitationsList')}{'\n\n'}
          {t('legal.terms.serviceLimitations.note')}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('legal.terms.feesAndPayment.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          {t('legal.terms.feesAndPayment.content')}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('legal.terms.termination.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          <Text style={styles.bold}>{t('legal.terms.termination.youMay')}</Text>
          {'\n'}{t('legal.terms.termination.youMayList')}{'\n\n'}
          <Text style={styles.bold}>{t('legal.terms.termination.weMay')}</Text>
          {'\n'}{t('legal.terms.termination.weMayList')}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('legal.terms.limitationOfLiability.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          {t('legal.terms.limitationOfLiability.content')}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('legal.terms.indemnification.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          {t('legal.terms.indemnification.content')}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('legal.terms.disputeResolution.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          {t('legal.terms.disputeResolution.content')}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('legal.terms.changesToTerms.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          {t('legal.terms.changesToTerms.content')}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('legal.terms.contactInformation.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          {t('legal.terms.contactInformation.content')}
          {t('legal.terms.contactInformation.email')}
          {t('legal.terms.contactInformation.phone')}
          {t('legal.terms.contactInformation.address')}
          {t('legal.terms.contactInformation.supportHours')}
        </Text>

        <View style={styles.disclaimer}>
          <Text variant="bodySmall" style={styles.disclaimerText}>
            {t('legal.terms.disclaimer')}
          </Text>
        </View>

        <Button
          title={t('legal.close')}
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
