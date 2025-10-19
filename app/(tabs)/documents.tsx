import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Text, TextInput } from 'react-native';
import { FAB, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { documentsApi } from '../../lib/api/documents.api';
import { Document, DocumentType } from '../../lib/types';
import { Card, StatusBadge, EmptyState } from '../../components/ui';
import { useDebounce } from '../../lib/hooks';
import { COLORS, SPACING, DOCUMENT_TYPE_LABELS } from '../../lib/constants';
import { format } from 'date-fns';

export default function DocumentsScreen() {
    useRequireAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState<DocumentType | undefined>();

    const fetchDocuments = async () => {
        setIsLoading(true);
        const response = await documentsApi.getAllDocuments();
        if (response.success && response.data) {
            setDocuments(response.data);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    // Debounce search query for performance (avoid filtering on every keystroke)
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    // Memoize filtered documents to avoid unnecessary recalculations
    const filteredDocuments = useMemo(() => {
        return documents.filter((doc) => {
            const matchesSearch = doc.originalName.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
            const matchesType = !selectedType || doc.documentType === selectedType;
            return matchesSearch && matchesType;
        });
    }, [documents, debouncedSearchQuery, selectedType]);

    // Memoize file icon getter for performance
    const getFileIcon = useCallback((mimeType: string) => {
        if (mimeType.includes('pdf')) return 'file-pdf-box';
        if (mimeType.includes('image')) return 'file-image';
        return 'file-document';
    }, []);

    // Memoize render function for better FlatList performance
    const renderDocumentItem = useCallback(({ item, index }: { item: Document; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
            <Card onPress={() => router.push(`/document/${item.id}`)} style={styles.card}>
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <View style={styles.fileInfo}>
                            <View style={[styles.iconContainer, { backgroundColor: COLORS.primary + '15' }]}>
                                <MaterialCommunityIcons
                                    name={getFileIcon(item.mimeType)}
                                    size={32}
                                    color={COLORS.primary}
                                />
                            </View>
                            <View style={styles.fileDetails}>
                                <Text style={styles.fileName} numberOfLines={1}>
                                    {item.originalName}
                                </Text>
                                <Text style={styles.fileType}>
                                    {DOCUMENT_TYPE_LABELS[item.documentType]}
                                </Text>
                            </View>
                        </View>
                        <StatusBadge status={item.status} />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.footer}>
                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons
                                name="calendar"
                                size={14}
                                color={COLORS.textSecondary}
                            />
                            <Text style={styles.infoText}>
                                {format(new Date(item.uploadDate), 'MMM dd, yyyy')}
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <MaterialCommunityIcons
                                name="file"
                                size={14}
                                color={COLORS.textSecondary}
                            />
                            <Text style={styles.infoText}>
                                {(item.fileSize / 1024).toFixed(2)} KB
                            </Text>
                        </View>
                    </View>
                </View>
            </Card>
        </Animated.View>
    ), [router, getFileIcon, t]);

    // Memoize key extractor for FlatList performance
    const keyExtractor = useCallback((item: Document) => item.id, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.searchContainer}>
                    <MaterialCommunityIcons
                        name="magnify"
                        size={20}
                        color={COLORS.textSecondary}
                        style={styles.searchIcon}
                    />
                    <TextInput
                        placeholder={t('documents.searchDocuments')}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={styles.searchInput}
                        placeholderTextColor={COLORS.textSecondary}
                    />
                </View>
            </View>

            <View style={styles.filters}>
                <Chip
                    selected={!selectedType}
                    onPress={() => setSelectedType(undefined)}
                    style={styles.filterChip}
                >
                    {t('documents.all')}
                </Chip>
                {(['PASSPORT', 'ID_CARD', 'DIPLOMA', 'OTHER'] as DocumentType[]).map((type) => (
                    <Chip
                        key={type}
                        selected={selectedType === type}
                        onPress={() => setSelectedType(type)}
                        style={styles.filterChip}
                    >
                        {DOCUMENT_TYPE_LABELS[type]}
                    </Chip>
                ))}
            </View>

            <FlatList
                data={filteredDocuments}
                renderItem={renderDocumentItem}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={fetchDocuments} />
                }
                ListEmptyComponent={
                    <EmptyState
                        icon="file-document-outline"
                        title={t('documents.noDocuments')}
                        description={t('documents.noDocumentsDescription')}
                        actionText={t('documents.uploadDocument')}
                        onAction={() => router.push('/document/upload')}
                    />
                }
                // Performance optimizations
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                initialNumToRender={10}
                windowSize={10}
                getItemLayout={(data, index) => ({
                    length: 140, // Approximate item height
                    offset: 140 * index,
                    index,
                })}
            />

            <FAB
                icon="plus"
                style={styles.fab}
                onPress={() => router.push('/document/upload')}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        padding: SPACING.md,
        backgroundColor: COLORS.surface,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
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
    filters: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        flexWrap: 'wrap',
    },
    filterChip: {
        marginRight: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    list: {
        padding: SPACING.md,
    },
    card: {
        marginBottom: SPACING.md,
    },
    cardContent: {
        padding: SPACING.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.md,
    },
    fileInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fileDetails: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    fileName: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
    },
    fileType: {
        fontSize: 13,
        color: COLORS.textSecondary,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginBottom: SPACING.md,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginLeft: SPACING.xs,
    },
    fab: {
        position: 'absolute',
        right: SPACING.md,
        bottom: SPACING.md,
        backgroundColor: COLORS.primary,
    },
});

