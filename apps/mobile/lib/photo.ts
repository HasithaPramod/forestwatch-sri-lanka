import type { UploadPart } from '@forestwatch/api-client';
import * as ImagePicker from 'expo-image-picker';

export type FieldPhoto = {
  upload: UploadPart;
  filename: string;
  uri: string;
  mimeType: string;
};

export async function pickFieldPhoto(source: 'camera' | 'library'): Promise<FieldPhoto | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.status !== 'granted') {
    return null;
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  const filename = asset.fileName ?? `photo-${Date.now()}.jpg`;
  const type = asset.mimeType ?? 'image/jpeg';
  const upload: UploadPart = asset.file
    ? asset.file
    : {
        uri: asset.uri,
        name: filename,
        type,
      };

  return {
    uri: asset.uri,
    filename,
    mimeType: type,
    upload,
  };
}
