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
import { ModernHeader } from '../../components/ui/ModernHeader';
import { SPACING } from '../../lib/constants';
import { useThemeColors } from '../../lib/theme/ThemeContext';
import { useTabBarPadding } from '../../lib/hooks/useTabBarPadding';
import { useTabBarScroll } from '../../lib/hooks/useTabBarScroll';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FAQScreen() {
  useRequireAuth();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const tabBarPadding = useTabBarPadding();
  const scrollProps = useTabBarScroll();
  const insets = useSafeAreaInsets();
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
    [groupedFAQs, expandedId, colors]
  );

  // Memoize key extractor
  const keyExtractor = useCallback((item: string) => item, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Modern Gradient Header */}
      <ModernHeader
        variant="gradient"
        gradientColors={[colors.primary, colors.secondary, colors.accent]}
        title="FAQ"
        subtitle="Frequently Asked Questions"
        showBackButton
        showSearch
        searchPlaceholder={t('help.searchFAQ')}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      />
      
      <View style={styles.content}>
        <FlatList
          data={Object.keys(groupedFAQs)}
          renderItem={renderCategory}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.list,
            {
              paddingTop: SPACING.md,
              paddingBottom: SPACING.xxl + tabBarPadding + SPACING.lg + insets?.bottom || 0
            }
          ]}
          onScroll={scrollProps.onScroll}
          scrollEventThrottle={scrollProps.scrollEventThrottle}
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
          showsVerticalScrollIndicator={true}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Will be set dynamically
  },
  content: {
    flex: 1,
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
    paddingHorizontal: SPACING.md,
    flexGrow: 1,
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
