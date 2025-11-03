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

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingBottom: insets.bottom }]}>
      <ThemeAwareHeader
        title={t('legal.privacy.title')}
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
            {t('legal.privacy.lastUpdated')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100)}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.privacy.introduction.title')}
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: colors.text }]}>
            {t('legal.privacy.introduction.content')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150)}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.privacy.informationWeCollect.title')}
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: colors.text }]}>
            <Text style={[styles.bold, { color: colors.text }]}>
              {t('legal.privacy.informationWeCollect.personalInfo')}
            </Text>
            {'\n'}{t('legal.privacy.informationWeCollect.personalInfoList')}{'\n\n'}
            <Text style={[styles.bold, { color: colors.text }]}>
              {t('legal.privacy.informationWeCollect.technicalInfo')}
            </Text>
            {'\n'}{t('legal.privacy.informationWeCollect.technicalInfoList')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.privacy.howWeUseInfo.title')}
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: colors.text }]}>
            {t('legal.privacy.howWeUseInfo.content')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250)}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.privacy.thirdPartyServices.title')}
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: colors.text }]}>
            {t('legal.privacy.thirdPartyServices.content')}
            <Text style={[styles.bold, { color: colors.text }]}>
              {t('legal.privacy.thirdPartyServices.firebase')}
            </Text>
            {'\n'}{t('legal.privacy.thirdPartyServices.firebaseList')}{'\n\n'}
            <Text style={[styles.bold, { color: colors.text }]}>
              {t('legal.privacy.thirdPartyServices.uploadThing')}
            </Text>
            {'\n'}{t('legal.privacy.thirdPartyServices.uploadThingList')}{'\n\n'}
            <Text style={[styles.bold, { color: colors.text }]}>
              {t('legal.privacy.thirdPartyServices.expo')}
            </Text>
            {'\n'}{t('legal.privacy.thirdPartyServices.expoList')}{'\n\n'}
            {t('legal.privacy.thirdPartyServices.note')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.privacy.dataSecurity.title')}
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: colors.text }]}>
            {t('legal.privacy.dataSecurity.content')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(350)}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.privacy.yourRights.title')}
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: colors.text }]}>
            {t('legal.privacy.yourRights.content')}
            <Text style={[styles.bold, { color: colors.primary }]}>
              {t('legal.privacy.yourRights.access')}
            </Text>
            {t('legal.privacy.yourRights.accessDesc')}
            <Text style={[styles.bold, { color: colors.primary }]}>
              {t('legal.privacy.yourRights.rectification')}
            </Text>
            {t('legal.privacy.yourRights.rectificationDesc')}
            <Text style={[styles.bold, { color: colors.primary }]}>
              {t('legal.privacy.yourRights.erasure')}
            </Text>
            {t('legal.privacy.yourRights.erasureDesc')}
            <Text style={[styles.bold, { color: colors.primary }]}>
              {t('legal.privacy.yourRights.dataPortability')}
            </Text>
            {t('legal.privacy.yourRights.dataPortabilityDesc')}
            <Text style={[styles.bold, { color: colors.primary }]}>
              {t('legal.privacy.yourRights.object')}
            </Text>
            {t('legal.privacy.yourRights.objectDesc')}
            <Text style={[styles.bold, { color: colors.primary }]}>
              {t('legal.privacy.yourRights.withdrawConsent')}
            </Text>
            {t('legal.privacy.yourRights.withdrawConsentDesc')}{'\n\n'}
            {t('legal.privacy.yourRights.contactNote')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400)}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.privacy.dataRetention.title')}
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: colors.text }]}>
            {t('legal.privacy.dataRetention.content')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(450)}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.privacy.childrensPrivacy.title')}
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: colors.text }]}>
            {t('legal.privacy.childrensPrivacy.content')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500)}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.privacy.internationalTransfers.title')}
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: colors.text }]}>
            {t('legal.privacy.internationalTransfers.content')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(550)}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.privacy.changesToPolicy.title')}
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: colors.text }]}>
            {t('legal.privacy.changesToPolicy.content')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600)}>
          <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>
            {t('legal.privacy.contactUs.title')}
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { color: colors.text }]}>
            {t('legal.privacy.contactUs.content')}
            {t('legal.privacy.contactUs.email')}
            {t('legal.privacy.contactUs.phone')}
            {t('legal.privacy.contactUs.address')}
            {t('legal.privacy.contactUs.dpo')}
            {t('legal.privacy.contactUs.dpoEmail')}
            {t('legal.privacy.contactUs.dpoPhone')}
            {t('legal.privacy.contactUs.supportHours')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(650)} style={styles.buttonContainer}>
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
  buttonContainer: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  closeButton: {
    marginTop: SPACING.md,
  },
});
