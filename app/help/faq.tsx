import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Text, TextInput } from 'react-native';
import { List } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { faqApi } from '../../lib/api/faq.api';
import { FAQ } from '../../lib/types';
import { useDebounce } from '../../lib/hooks';
import { EmptyState, Card } from '../../components/ui';
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

    // Debounce search for performance
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    // Memoize filtered and grouped FAQs
    const groupedFAQs = useMemo(() => {
        const filtered = faqs.filter(
            (faq) =>
                faq.question.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                faq.answer.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
        );

        return filtered.reduce((acc, faq) => {
            if (!acc[faq.category]) {
                acc[faq.category] = [];
            }
            acc[faq.category].push(faq);
            return acc;
        }, {} as Record<string, FAQ[]>);
    }, [faqs, debouncedSearchQuery]);

    // Memoize render function
    const renderCategory = useCallback(({ item: category, index }: { item: string; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
            <View style={styles.categoryContainer}>
                <Text style={styles.categoryTitle}>{category}</Text>
                {groupedFAQs[category].map((faq, faqIndex) => (
                    <Animated.View key={faq.id} entering={FadeInDown.delay((index * 50) + (faqIndex * 30)).springify()}>
                        <List.Accordion
                            title={faq.question}
                            expanded={expandedId === faq.id}
                            onPress={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                            style={styles.accordion}
                            titleStyle={styles.accordionTitle}
                        >
                            <View style={styles.answerContainer}>
                                <Text style={styles.answer}>{faq.answer}</Text>
                            </View>
                        </List.Accordion>
                    </Animated.View>
                ))}
            </View>
        </Animated.View>
    ), [groupedFAQs, expandedId]);

    // Memoize key extractor
    const keyExtractor = useCallback((item: string) => item, []);

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <MaterialCommunityIcons 
                    name="magnify" 
                    size={20} 
                    color={COLORS.textSecondary}
                    style={styles.searchIcon}
                />
                <TextInput
                    placeholder={t('help.searchFAQ')}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={styles.searchInput}
                    placeholderTextColor={COLORS.textSecondary}
                />
            </View>

            <FlatList
                data={Object.keys(groupedFAQs)}
                renderItem={renderCategory}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={fetchFAQs} />
                }
                ListEmptyComponent={
                    <EmptyState
                        icon="help-circle-outline"
                        title={t('common.noResults')}
                        description={t('help.noFAQsFound')}
                    />
                }
                // Performance optimizations
                removeClippedSubviews={true}
                maxToRenderPerBatch={5}
                initialNumToRender={5}
                windowSize={5}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        margin: SPACING.md,
        borderRadius: 12,
        paddingHorizontal: SPACING.md,
        height: 48,
    },
    searchIcon: {
        marginRight: SPACING.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
    },
    list: {
        padding: SPACING.md,
    },
    categoryContainer: {
        marginBottom: SPACING.lg,
    },
    categoryTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: SPACING.sm,
        marginLeft: SPACING.xs,
    },
    accordion: {
        backgroundColor: COLORS.surface,
        marginBottom: SPACING.xs,
        borderRadius: 12,
    },
    accordionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
    },
    answerContainer: {
        padding: SPACING.md,
        backgroundColor: COLORS.background,
    },
    answer: {
        fontSize: 14,
        lineHeight: 20,
        color: COLORS.textSecondary,
    },
});

