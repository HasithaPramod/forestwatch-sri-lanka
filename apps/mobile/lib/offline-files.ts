import type { FieldPhoto } from '@/lib/photo';

export async function persistLocalPhoto(clientUuid: string, photo: FieldPhoto): Promise<FieldPhoto> {
  try {
    const FileSystem = await import('expo-file-system/legacy');
    const root = FileSystem.documentDirectory;
    if (!root) {
      return photo;
    }
    const dir = `${root}offline/${clientUuid}/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const dest = `${dir}${photo.filename}`;
    await FileSystem.copyAsync({ from: photo.uri, to: dest });
    return {
      uri: dest,
      filename: photo.filename,
      mimeType: photo.mimeType,
      upload: {
        uri: dest,
        name: photo.filename,
        type: photo.mimeType,
      },
    };
  } catch {
    return photo;
  }
}

export async function deleteLocalPhoto(uri: string | null): Promise<void> {
  if (!uri || !uri.includes('/offline/')) {
    return;
  }
  try {
    const FileSystem = await import('expo-file-system/legacy');
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Keep the SQLite row even if the file is already gone.
  }
}
