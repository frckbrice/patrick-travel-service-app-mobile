import { useCallback, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { uploadThingService } from './services/uploadthing';

type UseUploadThingProps = {
  onClientUploadComplete?: (res: any[]) => void;
  onUploadError?: (error: any) => void;
};

type OpenImagePickerOptions = {
  input?: any;
  source?: 'library' | 'camera';
  onInsufficientPermissions?: () => void;
  onCancel?: () => void;
};

export function useImageUploader(_endpoint: string, opts?: UseUploadThingProps) {
  const [isUploading, setIsUploading] = useState(false);

  const openImagePicker = useCallback(async (options: OpenImagePickerOptions = {}) => {
    try {
      const source = options.source || 'library';

      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (perm.status !== 'granted') {
          options.onInsufficientPermissions?.();
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        });
        if (result.canceled) {
          options.onCancel?.();
          return;
        }
        setIsUploading(true);
        const asset = result.assets[0];
        const upload = await uploadThingService.uploadFile(
          asset.uri,
          `profile_${Date.now()}.jpg`,
          'image/jpeg',
        );
        setIsUploading(false);
        if (!upload.success || !upload.url) throw new Error(upload.error || 'Upload failed');
        opts?.onClientUploadComplete?.([{ url: upload.url, ufsUrl: upload.url }]);
        return;
      }

      // library
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        options.onInsufficientPermissions?.();
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled) {
        options.onCancel?.();
        return;
      }
      setIsUploading(true);
      const asset = result.assets[0];
      const upload = await uploadThingService.uploadFile(
        asset.uri,
        `profile_${Date.now()}.jpg`,
        'image/jpeg',
      );
      setIsUploading(false);
      if (!upload.success || !upload.url) throw new Error(upload.error || 'Upload failed');
      opts?.onClientUploadComplete?.([{ url: upload.url, ufsUrl: upload.url }]);
    } catch (error) {
      setIsUploading(false);
      opts?.onUploadError?.(error);
    }
  }, [opts]);

  return { openImagePicker, isUploading };
}

export function useDocumentUploader(_endpoint: string, opts?: UseUploadThingProps) {
  // Minimal stub for parity; not used right now
  const [isUploading] = useState(false);
  const openDocumentPicker = async () => {
    opts?.onUploadError?.(new Error('Not implemented'));
  };
  return { openDocumentPicker, isUploading } as any;
}


