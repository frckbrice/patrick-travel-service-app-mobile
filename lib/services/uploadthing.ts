import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import { logger } from '../utils/logger';

const UPLOADTHING_API_KEY = Constants.expoConfig?.extra?.uploadthingApiKey;
const UPLOADTHING_APP_ID = Constants.expoConfig?.extra?.uploadthingAppId;

interface UploadResult {
    success: boolean;
    url?: string;
    key?: string;
    name?: string;
    size?: number;
    error?: string;
}

interface UploadOptions {
    onProgress?: (progress: number) => void;
    metadata?: Record<string, string>;
}

class UploadThingService {
    private apiKey: string;
    private appId: string;
    private baseUrl = 'https://api.uploadthing.com';

    constructor() {
        this.apiKey = UPLOADTHING_API_KEY || '';
        this.appId = UPLOADTHING_APP_ID || '';

        if (!this.apiKey || !this.appId) {
            logger.warn('UploadThing credentials not configured');
        }
    }

    async uploadFile(
        fileUri: string,
        fileName: string,
        mimeType: string,
        options?: UploadOptions
    ): Promise<UploadResult> {
        try {
            if (!this.apiKey || !this.appId) {
                return {
                    success: false,
                    error: 'UploadThing not configured. Please set API key and App ID.',
                };
            }

            logger.info('Starting file upload', { fileName, mimeType });

            // Get file info
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            if (!fileInfo.exists) {
                throw new Error('File does not exist');
            }

            // Create form data
            const formData = new FormData();

            // Add file
            formData.append('file', {
                uri: fileUri,
                name: fileName,
                type: mimeType,
            } as any);

            // Add metadata if provided
            if (options?.metadata) {
                formData.append('metadata', JSON.stringify(options.metadata));
            }

            // Upload to UploadThing
            const response = await FileSystem.uploadAsync(
                `${this.baseUrl}/api/uploadFile`,
                fileUri,
                {
                    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
                    fieldName: 'file',
                    headers: {
                        'X-Uploadthing-Api-Key': this.apiKey,
                        'X-Uploadthing-App-Id': this.appId,
                    },
                    parameters: options?.metadata || {},
                }
            );

            if (response.status !== 200) {
                throw new Error(`Upload failed with status ${response.status}`);
            }

            const result = JSON.parse(response.body);

            logger.info('File uploaded successfully', { fileName, url: result.url });

            return {
                success: true,
                url: result.url,
                key: result.key,
                name: result.name,
                size: result.size,
            };
        } catch (error: any) {
            logger.error('File upload failed', error);
            return {
                success: false,
                error: error.message || 'Upload failed',
            };
        }
    }

    async uploadMultiple(
        files: Array<{ uri: string; name: string; type: string }>,
        options?: UploadOptions
    ): Promise<UploadResult[]> {
        const results: UploadResult[] = [];

        for (const file of files) {
            const result = await this.uploadFile(
                file.uri,
                file.name,
                file.type,
                options
            );
            results.push(result);
        }

        return results;
    }

    async deleteFile(key: string): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/deleteFile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Uploadthing-Api-Key': this.apiKey,
                    'X-Uploadthing-App-Id': this.appId,
                },
                body: JSON.stringify({ key }),
            });

            if (!response.ok) {
                throw new Error(`Delete failed with status ${response.status}`);
            }

            logger.info('File deleted successfully', { key });
            return true;
        } catch (error: any) {
            logger.error('File deletion failed', error);
            return false;
        }
    }

    getFileUrl(key: string): string {
        return `https://utfs.io/f/${key}`;
    }
}

export const uploadThingService = new UploadThingService();

