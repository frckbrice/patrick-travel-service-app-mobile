import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
} from 'react-native';
import { List } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { faqApi } from '../../lib/api/faq.api';
import { FAQ } from '../../lib/types';
import { useDebounce } from '../../lib/hooks';
import { EmptyState, Card } from '../../components/ui';
import { SPACING } from '../../lib/constants';
import { useThemeColors } from '../../lib/theme/ThemeContext';

export default function FAQScreen() {
  useRequireAuth();
  const { t } = useTranslation();
  const colors = useThemeColors();
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
      // Ensure data is an array before filtering
      const faqData = Array.isArray(response.data) ? response.data : [];
      setFaqs(faqData.filter((faq) => faq.isActive));
    }
    setIsLoading(false);
  };

  // Debounce search for performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Memoize filtered and grouped FAQs
  const groupedFAQs = useMemo(() => {
    const filtered = faqs.filter(
      (faq) =>
        faq.question
          .toLowerCase()
          .includes(debouncedSearchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );

    return filtered.reduce(
      (acc, faq) => {
        if (!acc[faq.category]) {
          acc[faq.category] = [];
        }
        acc[faq.category].push(faq);
        return acc;
      },
      {} as Record<string, FAQ[]>
    );
  }, [faqs, debouncedSearchQuery]);

  // Memoize render function
  const renderCategory = useCallback(
    ({ item: category, index }: { item: string; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
        <View style={styles.categoryContainer}>
          <Text style={[styles.categoryTitle, { color: colors.text }]}>{category}</Text>
          {groupedFAQs[category].map((faq, faqIndex) => (
            <Animated.View
              key={faq.id}
              entering={FadeInDown.delay(
                index * 50 + faqIndex * 30
              ).springify()}
            >
              <List.Accordion
                title={faq.question}
                expanded={expandedId === faq.id}
                onPress={() =>
                  setExpandedId(expandedId === faq.id ? null : faq.id)
                }
                style={[styles.accordion, { backgroundColor: colors.surface }]}
                titleStyle={[styles.accordionTitle, { color: colors.text }]}
              >
                <View style={[styles.answerContainer, { backgroundColor: colors.background }]}>
                  <Text style={[styles.answer, { color: colors.textSecondary }]}>{faq.answer}</Text>
                </View>
              </List.Accordion>
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    ),
    [groupedFAQs, expandedId]
  );

  // Memoize key extractor
  const keyExtractor = useCallback((item: string) => item, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={colors.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          placeholder={t('help.searchFAQ')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: colors.text }]}
          placeholderTextColor={colors.textSecondary}
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
    backgroundColor: 'transparent', // Will be set dynamically
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  accordion: {
    marginBottom: SPACING.xs,
    borderRadius: 12,
  },
  accordionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  answerContainer: {
    padding: SPACING.md,
  },
  answer: {
    fontSize: 14,
    lineHeight: 20,
  },
});
