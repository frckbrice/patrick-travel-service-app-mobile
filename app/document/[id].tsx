import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Alert } from 'react-native';
import { Text, Button, Chip, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { WebView } from 'react-native-webview';
import { Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { documentsApi } from '../../lib/api/documents.api';
import { Document } from '../../lib/types';
import {
    COLORS,
    SPACING,
    DOCUMENT_TYPE_LABELS,
    DOCUMENT_STATUS_LABELS,
    DOCUMENT_STATUS_COLORS,
} from '../../lib/constants';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

export default function DocumentDetailsScreen() {
    useRequireAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [document, setDocument] = useState<Document | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        fetchDocument();
    }, [id]);

    const fetchDocument = async () => {
        // This would need to be implemented in the API
        // For now, using a placeholder
        setIsLoading(false);
    };

    const handleDownload = async () => {
        if (!document) return;

        setIsDownloading(true);

        try {
            const fileUri = FileSystem.documentDirectory + document.fileName;
            const downloadResult = await FileSystem.downloadAsync(
                document.filePath,
                fileUri
            );

            if (downloadResult.status === 200) {
                const canShare = await Sharing.isAvailableAsync();

                if (canShare) {
                    await Sharing.shareAsync(downloadResult.uri);
                } else {
                    Alert.alert(t('common.success'), t('documents.downloadSuccess'));
                }
            } else {
                throw new Error(t('errors.downloadFailed'));
            }
        } catch (error: any) {
            Alert.alert(t('common.error'), error.message || t('errors.downloadFailed'));
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDelete = () => {
        if (!document) return;

        Alert.alert(
            t('documents.deleteDocument'),
            t('documents.confirmDelete'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        const response = await documentsApi.deleteDocument(document.id);
                        if (response.success) {
                            Alert.alert(t('common.success'), t('documents.deleteDocument'), [
                                { text: t('common.ok'), onPress: () => router.back() },
                            ]);
                        } else {
                            Alert.alert(t('common.error'), t('errors.somethingWrong'));
                        }
                    },
                },
            ]
        );
    };

    const renderPreview = () => {
        if (!document) return null;

        const isImage = document.mimeType.startsWith('image/');
        const isPDF = document.mimeType === 'application/pdf';

        if (isImage) {
            return (
                <Image
                    source={{ uri: document.filePath }}
                    style={styles.imagePreview}
                    resizeMode="contain"
                />
            );
        }

        if (isPDF) {
            return (
                <WebView
                    source={{ uri: `https://docs.google.com/viewer?url=${encodeURIComponent(document.filePath)}&embedded=true` }}
                    style={styles.pdfPreview}
                />
            );
        }

        return (
            <View style={styles.noPreview}>
                <MaterialCommunityIcons
                    name="file-document-outline"
                    size={80}
                    color={COLORS.textSecondary}
                />
                <Text variant="bodyLarge" style={styles.noPreviewText}>
                    {t('documents.previewNotAvailable')}
                </Text>
            </View>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!document) {
        return (
            <View style={styles.error}>
                <Text>{t('common.noResults')}</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView>
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <Text variant="titleLarge" style={styles.fileName}>
                            {document.originalName}
                        </Text>
                        <Chip
                            style={[
                                styles.statusChip,
                                { backgroundColor: DOCUMENT_STATUS_COLORS[document.status] + '20' },
                            ]}
                            textStyle={{ color: DOCUMENT_STATUS_COLORS[document.status] }}
                        >
                            {DOCUMENT_STATUS_LABELS[document.status]}
                        </Chip>
                    </View>

                    <Text variant="bodyMedium" style={styles.documentType}>
                        {DOCUMENT_TYPE_LABELS[document.documentType]}
                    </Text>

                    <View style={styles.metadata}>
                        <View style={styles.metadataItem}>
                            <MaterialCommunityIcons
                                name="calendar"
                                size={16}
                                color={COLORS.textSecondary}
                            />
                            <Text variant="bodySmall" style={styles.metadataText}>
                                {format(new Date(document.uploadDate), 'MMM dd, yyyy')}
                            </Text>
                        </View>
                        <View style={styles.metadataItem}>
                            <MaterialCommunityIcons
                                name="file"
                                size={16}
                                color={COLORS.textSecondary}
                            />
                            <Text variant="bodySmall" style={styles.metadataText}>
                                {(document.fileSize / 1024).toFixed(2)} KB
                            </Text>
                        </View>
                    </View>

                    {document.rejectionReason && (
                        <View style={styles.rejectionReason}>
                            <Text variant="bodySmall" style={styles.rejectionLabel}>
                                {t('documents.rejectionReason')}
                            </Text>
                            <Text variant="bodyMedium" style={styles.rejectionText}>
                                {document.rejectionReason}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.previewContainer}>{renderPreview()}</View>
            </ScrollView>

            <View style={styles.actions}>
                <Button
                    mode="contained"
                    icon="download"
                    onPress={handleDownload}
                    loading={isDownloading}
                    disabled={isDownloading}
                    style={styles.actionButton}
                >
                    {t('common.download')}
                </Button>
                {document.status === 'PENDING' && (
                    <Button
                        mode="outlined"
                        icon="delete"
                        onPress={handleDelete}
                        style={styles.actionButton}
                        textColor={COLORS.error}
                    >
                        {t('common.delete')}
                    </Button>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    error: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        padding: SPACING.lg,
        backgroundColor: COLORS.surface,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.sm,
    },
    fileName: {
        flex: 1,
        fontWeight: 'bold',
        color: COLORS.text,
        marginRight: SPACING.sm,
    },
    statusChip: {
        height: 28,
    },
    documentType: {
        color: COLORS.textSecondary,
        marginBottom: SPACING.md,
    },
    metadata: {
        flexDirection: 'row',
        gap: SPACING.lg,
    },
    metadataItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    metadataText: {
        color: COLORS.textSecondary,
    },
    rejectionReason: {
        marginTop: SPACING.md,
        padding: SPACING.md,
        backgroundColor: '#FEE2E2',
        borderRadius: 8,
    },
    rejectionLabel: {
        fontWeight: 'bold',
        color: COLORS.error,
        marginBottom: SPACING.xs,
    },
    rejectionText: {
        color: COLORS.error,
    },
    previewContainer: {
        flex: 1,
        minHeight: 400,
    },
    imagePreview: {
        width: '100%',
        height: 400,
    },
    pdfPreview: {
        flex: 1,
        height: 600,
    },
    noPreview: {
        height: 400,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noPreviewText: {
        marginTop: SPACING.md,
        color: COLORS.textSecondary,
    },
    actions: {
        flexDirection: 'row',
        padding: SPACING.lg,
        gap: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    actionButton: {
        flex: 1,
    },
});

