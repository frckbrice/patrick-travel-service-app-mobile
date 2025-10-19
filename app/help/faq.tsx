import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Searchbar, List } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { faqApi } from '../../lib/api/faq.api';
import { FAQ } from '../../lib/types';
import { COLORS, SPACING } from '../../lib/constants';

export default function FAQScreen() {
    useRequireAuth();
    const { t } = useTranslation();
    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchFAQs();
    }, []);

    const fetchFAQs = async () => {
        setIsLoading(true);
        const response = await faqApi.getAllFAQs();
        if (response.success && response.data) {
            setFaqs(response.data.filter((faq) => faq.isActive));
        }
        setIsLoading(false);
    };

    const filteredFAQs = faqs.filter(
        (faq) =>
            faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groupedFAQs = filteredFAQs.reduce((acc, faq) => {
        if (!acc[faq.category]) {
            acc[faq.category] = [];
        }
        acc[faq.category].push(faq);
        return acc;
    }, {} as Record<string, FAQ[]>);

    return (
        <View style={styles.container}>
            <Searchbar
                placeholder={t('help.searchFAQ')}
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchbar}
            />

            <FlatList
                data={Object.keys(groupedFAQs)}
                renderItem={({ item: category }) => (
                    <List.Section>
                        <List.Subheader style={styles.category}>{category}</List.Subheader>
                        {groupedFAQs[category].map((faq) => (
                            <List.Accordion
                                key={faq.id}
                                title={faq.question}
                                expanded={expandedId === faq.id}
                                onPress={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                                style={styles.accordion}
                            >
                                <List.Item
                                    title={faq.answer}
                                    titleNumberOfLines={100}
                                    style={styles.answer}
                                />
                            </List.Accordion>
                        ))}
                    </List.Section>
                )}
                keyExtractor={(item) => item}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={fetchFAQs} />
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text>{t('common.noResults')}</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    searchbar: {
        margin: SPACING.md,
        elevation: 0,
        backgroundColor: COLORS.surface,
    },
    category: {
        fontWeight: 'bold',
        color: COLORS.text,
    },
    accordion: {
        backgroundColor: COLORS.surface,
    },
    answer: {
        backgroundColor: COLORS.background,
    },
    empty: {
        alignItems: 'center',
        padding: SPACING.xl,
    },
});

