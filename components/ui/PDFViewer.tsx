import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { COLORS, SPACING } from '../../lib/constants';
import { Alert } from '../../lib/utils/alert';

const { width, height } = Dimensions.get('window');

interface PDFViewerProps {
    filePath: string;
    fileName: string;
    onClose?: () => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
    filePath,
    fileName,
    onClose
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const fileUri = FileSystem.documentDirectory + fileName;
            const downloadResult = await FileSystem.downloadAsync(filePath, fileUri);

            if (downloadResult.status === 200) {
                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                    await Sharing.shareAsync(downloadResult.uri);
                } else {
                    Alert.alert('Download Complete', 'File saved to device');
                }
            } else {
                throw new Error('Download failed');
            }
        } catch (error: any) {
            Alert.alert('Download Error', error.message);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleError = () => {
        setError('Failed to load PDF');
        setIsLoading(false);
    };

    const handleLoadEnd = () => {
        setIsLoading(false);
    };

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <MaterialCommunityIcons
                    name="file-pdf-box"
                    size={64}
                    color={COLORS.textSecondary}
                />
                <Text variant="titleMedium" style={styles.errorText}>
                    {error}
                </Text>
                <Button
                    mode="contained"
                    onPress={handleDownload}
                    loading={isDownloading}
                    disabled={isDownloading}
                    style={styles.downloadButton}
                >
                    Download PDF
                </Button>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <MaterialCommunityIcons
                        name="file-pdf-box"
                        size={24}
                        color={COLORS.error}
                    />
                    <Text variant="titleMedium" style={styles.fileName} numberOfLines={1}>
                        {fileName}
                    </Text>
                </View>
                <View style={styles.headerRight}>
                    <IconButton
                        icon="download"
                        size={20}
                        iconColor={COLORS.primary}
                        onPress={handleDownload}
                        disabled={isDownloading}
                    />
                    {onClose && (
                        <IconButton
                            icon="close"
                            size={20}
                            iconColor={COLORS.textSecondary}
                            onPress={onClose}
                        />
                    )}
                </View>
            </View>

            {/* PDF Viewer */}
            <View style={styles.webViewContainer}>
                {isLoading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text variant="bodyMedium" style={styles.loadingText}>
                            Loading PDF...
                        </Text>
                    </View>
                )}

                <WebView
                    source={{
                        uri: `https://docs.google.com/viewer?url=${encodeURIComponent(filePath)}&embedded=true`,
                    }}
                    style={styles.webView}
                    onError={handleError}
                    onLoadEnd={handleLoadEnd}
                    onHttpError={handleError}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    scalesPageToFit={true}
                    allowsInlineMediaPlayback={true}
                    mediaPlaybackRequiresUserAction={false}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: SPACING.sm,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    fileName: {
        flex: 1,
        color: COLORS.text,
        fontWeight: '500',
    },
    webViewContainer: {
        flex: 1,
        position: 'relative',
    },
    webView: {
        flex: 1,
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        zIndex: 1,
    },
    loadingText: {
        marginTop: SPACING.sm,
        color: COLORS.textSecondary,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
        backgroundColor: COLORS.background,
    },
    errorText: {
        marginTop: SPACING.md,
        marginBottom: SPACING.lg,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    downloadButton: {
        marginTop: SPACING.md,
    },
});

