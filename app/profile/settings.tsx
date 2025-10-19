import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, List, RadioButton, Divider } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { useTheme } from '../../lib/theme/ThemeContext';
import { COLORS, SPACING } from '../../lib/constants';

type ThemeMode = 'light' | 'dark' | 'auto';

export default function SettingsScreen() {
    useRequireAuth();
    const { t } = useTranslation();
    const { themeMode, setThemeMode } = useTheme();

    const handleThemeChange = (mode: string) => {
        setThemeMode(mode as ThemeMode);
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                <Text variant="bodyLarge" style={styles.description}>
                    {t('settings.customize')}
                </Text>

                <List.Section>
                    <List.Subheader>{t('settings.appearance')}</List.Subheader>

                    <List.Item
                        title={t('settings.lightMode')}
                        description={t('settings.lightDesc')}
                        left={(props) => <List.Icon {...props} icon="white-balance-sunny" />}
                        right={() => (
                            <RadioButton
                                value="light"
                                status={themeMode === 'light' ? 'checked' : 'unchecked'}
                                onPress={() => handleThemeChange('light')}
                            />
                        )}
                        onPress={() => handleThemeChange('light')}
                    />

                    <Divider />

                    <List.Item
                        title={t('settings.darkMode')}
                        description={t('settings.darkDesc')}
                        left={(props) => <List.Icon {...props} icon="moon-waning-crescent" />}
                        right={() => (
                            <RadioButton
                                value="dark"
                                status={themeMode === 'dark' ? 'checked' : 'unchecked'}
                                onPress={() => handleThemeChange('dark')}
                            />
                        )}
                        onPress={() => handleThemeChange('dark')}
                    />

                    <Divider />

                    <List.Item
                        title={t('settings.autoMode')}
                        description={t('settings.autoDesc')}
                        left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
                        right={() => (
                            <RadioButton
                                value="auto"
                                status={themeMode === 'auto' ? 'checked' : 'unchecked'}
                                onPress={() => handleThemeChange('auto')}
                            />
                        )}
                        onPress={() => handleThemeChange('auto')}
                    />
                </List.Section>

                <View style={styles.note}>
                    <Text variant="bodySmall" style={styles.noteText}>
                        {t('settings.darkModeNote')}
                    </Text>
                </View>
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
        flex: 1,
    },
    description: {
        padding: SPACING.lg,
        color: COLORS.textSecondary,
    },
    note: {
        padding: SPACING.lg,
        marginTop: SPACING.md,
    },
    noteText: {
        color: COLORS.textSecondary,
        fontStyle: 'italic',
    },
});

