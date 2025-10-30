import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui';
import { COLORS, SPACING } from '../../lib/constants';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          {t('legal.privacy.title')}
        </Text>
        <Text variant="bodySmall" style={styles.lastUpdated}>
          {t('legal.privacy.lastUpdated')}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('legal.privacy.introduction.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          {t('legal.privacy.introduction.content')}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('legal.privacy.informationWeCollect.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          <Text style={styles.bold}>{t('legal.privacy.informationWeCollect.personalInfo')}</Text>
          {'\n'}{t('legal.privacy.informationWeCollect.personalInfoList')}{'\n\n'}
          <Text style={styles.bold}>{t('legal.privacy.informationWeCollect.technicalInfo')}</Text>
          {'\n'}{t('legal.privacy.informationWeCollect.technicalInfoList')}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('legal.privacy.howWeUseInfo.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          {t('legal.privacy.howWeUseInfo.content')}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('legal.privacy.thirdPartyServices.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          {t('legal.privacy.thirdPartyServices.content')}
          <Text style={styles.bold}>{t('legal.privacy.thirdPartyServices.firebase')}</Text>
          {'\n'}{t('legal.privacy.thirdPartyServices.firebaseList')}{'\n\n'}
          <Text style={styles.bold}>{t('legal.privacy.thirdPartyServices.uploadThing')}</Text>
          {'\n'}{t('legal.privacy.thirdPartyServices.uploadThingList')}{'\n\n'}
          <Text style={styles.bold}>{t('legal.privacy.thirdPartyServices.expo')}</Text>
          {'\n'}{t('legal.privacy.thirdPartyServices.expoList')}{'\n\n'}
          {t('legal.privacy.thirdPartyServices.note')}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('legal.privacy.dataSecurity.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          {t('legal.privacy.dataSecurity.content')}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('legal.privacy.yourRights.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          {t('legal.privacy.yourRights.content')}
          <Text style={styles.bold}>{t('legal.privacy.yourRights.access')}</Text>
          {t('legal.privacy.yourRights.accessDesc')}
          <Text style={styles.bold}>{t('legal.privacy.yourRights.rectification')}</Text>
          {t('legal.privacy.yourRights.rectificationDesc')}
          <Text style={styles.bold}>{t('legal.privacy.yourRights.erasure')}</Text>
          {t('legal.privacy.yourRights.erasureDesc')}
          <Text style={styles.bold}>{t('legal.privacy.yourRights.dataPortability')}</Text>
          {t('legal.privacy.yourRights.dataPortabilityDesc')}
          <Text style={styles.bold}>{t('legal.privacy.yourRights.object')}</Text>
          {t('legal.privacy.yourRights.objectDesc')}
          <Text style={styles.bold}>{t('legal.privacy.yourRights.withdrawConsent')}</Text>
          {t('legal.privacy.yourRights.withdrawConsentDesc')}{'\n\n'}
          {t('legal.privacy.yourRights.contactNote')}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('legal.privacy.dataRetention.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          {t('legal.privacy.dataRetention.content')}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('legal.privacy.childrensPrivacy.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          {t('legal.privacy.childrensPrivacy.content')}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('legal.privacy.internationalTransfers.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          {t('legal.privacy.internationalTransfers.content')}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('legal.privacy.changesToPolicy.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          {t('legal.privacy.changesToPolicy.content')}
        </Text>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('legal.privacy.contactUs.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.paragraph}>
          {t('legal.privacy.contactUs.content')}
          {t('legal.privacy.contactUs.email')}
          {t('legal.privacy.contactUs.phone')}
          {t('legal.privacy.contactUs.address')}
          {t('legal.privacy.contactUs.dpo')}
          {t('legal.privacy.contactUs.dpoEmail')}
          {t('legal.privacy.contactUs.dpoPhone')}
          {t('legal.privacy.contactUs.supportHours')}
        </Text>

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
  closeButton: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
  },
});
