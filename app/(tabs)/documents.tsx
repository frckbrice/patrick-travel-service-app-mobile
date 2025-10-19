import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, FAB, Card, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { documentsApi } from '../../lib/api/documents.api';
import { Document } from '../../lib/types';
import { COLORS, SPACING, DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_COLORS } from '../../lib/constants';
import { format } from 'date-fns';

export default function DocumentsScreen() {
    useRequireAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(false);

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

    const getFileIcon = (mimeType: string) => {
        if (mimeType.includes('pdf')) return 'file-pdf-box';
        if (mimeType.includes('image')) return 'file-image';
        return 'file-document';
    };

    const renderDocumentItem = ({ item }: { item: Document }) => (
        <TouchableOpacity onPress={() => router.push(`/document/${item.id}`)}>
            <Card style={styles.card}>
                <Card.Content>
                    <View style={styles.cardHeader}>
                        <View style={styles.fileInfo}>
                            <MaterialCommunityIcons
                                name={getFileIcon(item.mimeType)}
                                size={40}
                                color={COLORS.primary}
                            />
                            <View style={styles.fileDetails}>
                                <Text variant="titleMedium" numberOfLines={1}>
                                    {item.originalName}
                                </Text>
                                <Text variant="bodySmall" style={styles.fileType}>
                                    {DOCUMENT_TYPE_LABELS[item.documentType]}
                                </Text>
                            </View>
                        </View>
                        <Chip
                            style={[
                                styles.statusChip,
                                { backgroundColor: DOCUMENT_STATUS_COLORS[item.status] + '20' },
                            ]}
                            textStyle={{ color: DOCUMENT_STATUS_COLORS[item.status] }}
                        >
                            {DOCUMENT_STATUS_LABELS[item.status]}
                        </Chip>
                    </View>
                    <Text variant="bodySmall" style={styles.date}>
                        {t('documents.uploaded')} {format(new Date(item.uploadDate), 'MMM dd, yyyy')}
                    </Text>
                    <Text variant="bodySmall" style={styles.size}>
                        {t('documents.size')} {(item.fileSize / 1024).toFixed(2)} KB
                    </Text>
                </Card.Content>
            </Card>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={documents}
                renderItem={renderDocumentItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={fetchDocuments} />
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <MaterialCommunityIcons
                            name="file-document-outline"
                            size={64}
                            color={COLORS.textSecondary}
                        />
                        <Text variant="bodyLarge" style={styles.emptyText}>
                            {t('documents.noDocuments')}
                        </Text>
                    </View>
                }
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
    list: {
        padding: SPACING.md,
    },
    card: {
        marginBottom: SPACING.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.sm,
    },
    fileInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    fileDetails: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    fileType: {
        color: COLORS.textSecondary,
    },
    statusChip: {
        height: 28,
    },
    date: {
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    size: {
        color: COLORS.textSecondary,
    },
    empty: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xxl,
        marginTop: SPACING.xxl,
    },
    emptyText: {
        marginTop: SPACING.md,
        color: COLORS.textSecondary,
    },
    fab: {
        position: 'absolute',
        right: SPACING.md,
        bottom: SPACING.md,
        backgroundColor: COLORS.primary,
    },
});

