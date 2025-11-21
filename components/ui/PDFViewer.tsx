import React, { useState } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { COLORS, SPACING } from '../../lib/constants';
import { Alert } from '../../lib/utils/alert';

const { width, height } = Dimensions.get('window');

interface PDFViewerProps {
    filePath: string;
    fileName: string;
    onClose?: () => void;
    isLocalFile?: boolean; // Indicates if filePath is a local file URI
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
    filePath,
    fileName,
    onClose,
    isLocalFile = false
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSharing, setIsSharing] = useState(false);

    const handleShare = async () => {
        setIsSharing(true);
        try {
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(filePath, {
                    mimeType: 'application/pdf',
                    dialogTitle: `Share ${fileName}`,
                    UTI: 'application/pdf',
                });
            } else {
                Alert.alert('Sharing Not Available', 'Sharing is not available on this device');
            }
        } catch (error: any) {
            Alert.alert('Share Error', error.message || 'Failed to share file');
        } finally {
            setIsSharing(false);
        }
    };

    const handleDownload = async () => {
        setIsSharing(true);
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
            setIsSharing(false);
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
                    onPress={isLocalFile ? handleShare : handleDownload}
                    loading={isSharing}
                    disabled={isSharing}
                    style={styles.downloadButton}
                >
                    {isLocalFile ? 'Share PDF' : 'Download PDF'}
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
                        icon={isLocalFile ? "share-variant" : "download"}
                        size={20}
                        iconColor={COLORS.primary}
                        onPress={isLocalFile ? handleShare : handleDownload}
                        disabled={isSharing}
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

                {isLocalFile ? (
                    // For local files, try to view directly using file:// URI
                    <WebView
                        source={{ uri: filePath }}
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
                ) : (
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
                )}
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
    localFileContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
        backgroundColor: COLORS.background,
    },
    localFileText: {
        marginTop: SPACING.md,
        color: COLORS.text,
        textAlign: 'center',
    },
    localFileSubtext: {
        marginTop: SPACING.sm,
        marginBottom: SPACING.lg,
        color: COLORS.textSecondary,
        textAlign: 'center',
        paddingHorizontal: SPACING.lg,
    },
    shareButton: {
        marginTop: SPACING.md,
    },
});

