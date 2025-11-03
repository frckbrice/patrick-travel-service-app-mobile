import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, ThemeAwareHeader } from '../../components/ui';
import { SPACING, FONT_SIZES } from '../../lib/constants';
import { useThemeColors } from '../../lib/theme/ThemeContext';

export default function TermsAndConditionsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingBottom: insets.bottom }]}>
      <ThemeAwareHeader
        title={t('legal.terms.title')}
        showBackButton
        variant="default"
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACING.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(50)}>
          <Text variant="bodySmall" style={[styles.lastUpdated, { color: colors.textSecondary }]}>
            {t('legal.terms.lastUpdated')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100)}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.terms.acceptance.title')}
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: colors.text }]}>
            {t('legal.terms.acceptance.content')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150)}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.terms.serviceDescription.title')}
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: colors.text }]}>
            {t('legal.terms.serviceDescription.content')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.terms.userAccounts.title')}
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: colors.text }]}>
            <Text style={[styles.bold, { color: colors.text }]}>
              {t('legal.terms.userAccounts.accountCreation')}
            </Text>
            {'\n'}{t('legal.terms.userAccounts.accountCreationList')}{'\n\n'}
            <Text style={[styles.bold, { color: colors.text }]}>
              {t('legal.terms.userAccounts.accountSecurity')}
            </Text>
            {'\n'}{t('legal.terms.userAccounts.accountSecurityList')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250)}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.terms.acceptableUse.title')}
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: colors.text }]}>
            {t('legal.terms.acceptableUse.content')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.terms.intellectualProperty.title')}
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: colors.text }]}>
            {t('legal.terms.intellectualProperty.content')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(350)}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.terms.documentUpload.title')}
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: colors.text }]}>
            {t('legal.terms.documentUpload.content')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400)}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.terms.serviceLimitations.title')}
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: colors.text }]}>
            <Text style={[styles.bold, { color: colors.text }]}>
              {t('legal.terms.serviceLimitations.weDoNotGuarantee')}
            </Text>
            {'\n'}{t('legal.terms.serviceLimitations.limitationsList')}{'\n\n'}
            {t('legal.terms.serviceLimitations.note')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(450)}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.terms.feesAndPayment.title')}
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: colors.text }]}>
            {t('legal.terms.feesAndPayment.content')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500)}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.terms.termination.title')}
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: colors.text }]}>
            <Text style={[styles.bold, { color: colors.text }]}>
              {t('legal.terms.termination.youMay')}
            </Text>
            {'\n'}{t('legal.terms.termination.youMayList')}{'\n\n'}
            <Text style={[styles.bold, { color: colors.text }]}>
              {t('legal.terms.termination.weMay')}
            </Text>
            {'\n'}{t('legal.terms.termination.weMayList')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(550)}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.terms.limitationOfLiability.title')}
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: colors.text }]}>
            {t('legal.terms.limitationOfLiability.content')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600)}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.terms.indemnification.title')}
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: colors.text }]}>
            {t('legal.terms.indemnification.content')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(650)}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.terms.disputeResolution.title')}
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: colors.text }]}>
            {t('legal.terms.disputeResolution.content')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(700)}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.terms.changesToTerms.title')}
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: colors.text }]}>
            {t('legal.terms.changesToTerms.content')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(750)}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.terms.contactInformation.title')}
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: colors.text }]}>
            {t('legal.terms.contactInformation.content')}
            {t('legal.terms.contactInformation.email')}
            {t('legal.terms.contactInformation.phone')}
            {t('legal.terms.contactInformation.address')}
            {t('legal.terms.contactInformation.supportHours')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(800)}>
          <View style={[styles.disclaimer, { backgroundColor: colors.primary + '20' }]}>
            <Text variant="bodySmall" style={[styles.disclaimerText, { color: colors.text }]}>
              {t('legal.terms.disclaimer')}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(850)} style={styles.buttonContainer}>
          <Button
            title={t('legal.close')}
            onPress={() => router.back()}
            style={styles.closeButton}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  lastUpdated: {
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xl,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: FONT_SIZES.lg,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
    letterSpacing: 0.5,
  },
  paragraph: {
    fontSize: FONT_SIZES.md,
    lineHeight: 24,
    marginBottom: SPACING.lg,
    letterSpacing: 0.3,
  },
  bold: {
    fontWeight: '700',
    fontSize: FONT_SIZES.md,
  },
  disclaimer: {
    padding: SPACING.md,
    borderRadius: 8,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  disclaimerText: {
    lineHeight: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  closeButton: {
    marginTop: SPACING.md,
  },
});
