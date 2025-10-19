import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, TextInput, SegmentedButtons } from 'react-native-paper';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useRequireAuth } from '../../features/auth/hooks/useAuth';
import { uploadThingService } from '../../lib/services/uploadthing';
import { documentsApi } from '../../lib/api/documents.api';
import { useCasesStore } from '../../stores/cases/casesStore';
import { DocumentType } from '../../lib/types';
import { COLORS, SPACING, MAX_FILE_SIZE, DOCUMENT_TYPE_LABELS } from '../../lib/constants';

export default function UploadDocumentScreen() {
    useRequireAuth();
    const { t } = useTranslation();
    const router = useRouter();
    const cases = useCasesStore((state) => state.cases);
    const [selectedCaseId, setSelectedCaseId] = useState('');
    const [documentType, setDocumentType] = useState<DocumentType>(DocumentType.OTHER);
    const [fileUri, setFileUri] = useState('');
    const [fileName, setFileName] = useState('');
    const [fileSize, setFileSize] = useState(0);
    const [mimeType, setMimeType] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
            });

            if (!result.canceled && result.assets[0]) {
                const file = result.assets[0];
                if (file.size && file.size > MAX_FILE_SIZE) {
                    Alert.alert(t('common.error'), 'File size exceeds 10MB limit');
                    return;
                }

                setFileUri(file.uri);
                setFileName(file.name);
                setFileSize(file.size || 0);
                setMimeType(file.mimeType || 'application/octet-stream');
            }
        } catch (error) {
            Alert.alert(t('common.error'), 'Failed to pick document');
        }
    };

    const pickImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
            Alert.alert('Permission Required', 'Please grant permission to access photos');
            return;
        }

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                const file = result.assets[0];
                setFileUri(file.uri);
                setFileName(`image_${Date.now()}.jpg`);
                setFileSize(file.fileSize || 0);
                setMimeType('image/jpeg');
            }
        } catch (error) {
            Alert.alert(t('common.error'), 'Failed to pick image');
        }
    };

    const handleUpload = async () => {
        if (!selectedCaseId || !fileUri || !fileName) {
            Alert.alert(t('common.error'), 'Please select a case and file');
            return;
        }

        setIsUploading(true);

        try {
            // Upload to UploadThing
            const uploadResult = await uploadThingService.uploadFile(
                fileUri,
                fileName,
                mimeType
            );

            if (!uploadResult.success || !uploadResult.url) {
                throw new Error(uploadResult.error || t('errors.uploadFailed'));
            }

            // Save document metadata to backend
            const response = await documentsApi.uploadDocument({
                caseId: selectedCaseId,
                documentType,
                fileName: uploadResult.name || fileName,
                filePath: uploadResult.url,
                fileSize,
                mimeType,
            });

            if (response.success) {
                Alert.alert(t('common.success'), t('documents.uploadSuccess'), [
                    {
                        text: t('common.ok'),
                        onPress: () => router.back(),
                    },
                ]);
            } else {
                throw new Error(response.error || t('errors.uploadFailed'));
            }
        } catch (error: any) {
            Alert.alert(t('common.error'), error.message || t('errors.uploadFailed'));
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                <Text variant="titleMedium" style={styles.label}>
                    {t('documents.selectCase')}
                </Text>
                <SegmentedButtons
                    value={selectedCaseId}
                    onValueChange={setSelectedCaseId}
                    buttons={cases.slice(0, 3).map((c) => ({
                        value: c.id,
                        label: c.referenceNumber,
                    }))}
                />

                <Text variant="titleMedium" style={[styles.label, { marginTop: SPACING.lg }]}>
                    {t('documents.documentType')}
                </Text>
                <SegmentedButtons
                    value={documentType}
                    onValueChange={(value) => setDocumentType(value as DocumentType)}
                    buttons={[
                        { value: DocumentType.PASSPORT, label: 'Passport' },
                        { value: DocumentType.ID_CARD, label: 'ID' },
                        { value: DocumentType.OTHER, label: 'Other' },
                    ]}
                />

                <View style={styles.filePicker}>
                    <Text variant="titleMedium" style={styles.label}>
                        {t('documents.selectFile')}
                    </Text>
                    <View style={styles.fileButtons}>
                        <Button
                            mode="outlined"
                            icon="file-document"
                            onPress={pickDocument}
                            style={styles.fileButton}
                        >
                            {t('documents.pickDocument')}
                        </Button>
                        <Button
                            mode="outlined"
                            icon="image"
                            onPress={pickImage}
                            style={styles.fileButton}
                        >
                            {t('documents.pickImage')}
                        </Button>
                    </View>

                    {fileName && (
                        <View style={styles.selectedFile}>
                            <MaterialCommunityIcons name="file" size={40} color={COLORS.primary} />
                            <View style={styles.fileInfo}>
                                <Text variant="bodyMedium">{fileName}</Text>
                                <Text variant="bodySmall" style={styles.fileSize}>
                                    {(fileSize / 1024).toFixed(2)} KB
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                <Button
                    mode="contained"
                    onPress={handleUpload}
                    loading={isUploading}
                    disabled={isUploading || !fileName || !selectedCaseId}
                    style={styles.uploadButton}
                >
                    {t('documents.uploadDocument')}
                </Button>
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
        padding: SPACING.lg,
    },
    label: {
        marginBottom: SPACING.sm,
        color: COLORS.text,
    },
    filePicker: {
        marginTop: SPACING.lg,
    },
    fileButtons: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    fileButton: {
        flex: 1,
    },
    selectedFile: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.md,
        padding: SPACING.md,
        backgroundColor: COLORS.surface,
        borderRadius: 8,
    },
    fileInfo: {
        marginLeft: SPACING.md,
        flex: 1,
    },
    fileSize: {
        color: COLORS.textSecondary,
    },
    uploadButton: {
        marginTop: SPACING.xl,
        paddingVertical: SPACING.sm,
    },
});

