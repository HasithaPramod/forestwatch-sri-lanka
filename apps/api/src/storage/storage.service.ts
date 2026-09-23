import { Injectable } from '@nestjs/common';
import { IMAGE } from '@forestwatch/config';
import {
  createStorageProvider,
  ImageProcessingError,
  processImage,
  type StorageProvider,
  type StoredFile,
  type UploadInput,
} from '@forestwatch/storage';
import type { PublicImage, StorageProviderName } from '@forestwatch/types';
import { thumbnailKeyFor } from '@forestwatch/utils';
import { ApiException } from '../common/http/api-exception';
import { getEnv } from '../env';

export type StoredOptimizedImage = {
  provider: StorageProviderName;
  objectKey: string;
  thumbnailKey: string;
  url: string;
  thumbnailUrl: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
};

@Injectable()
export class StorageService {
  private readonly provider: StorageProvider;

  constructor() {
    const env = getEnv();
    this.provider = createStorageProvider({
      provider: env.STORAGE_PROVIDER,
      localRoot: env.STORAGE_LOCAL_ROOT,
      publicBaseUrl: env.STORAGE_PUBLIC_BASE_URL,
      supabaseUrl: env.SUPABASE_URL,
      supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseBucket: env.SUPABASE_STORAGE_BUCKET,
    });
  }

  get name(): StorageProvider['name'] {
    return this.provider.name;
  }

  upload(input: UploadInput): Promise<StoredFile> {
    return this.provider.upload(input);
  }

  delete(key: string): Promise<void> {
    return this.provider.delete(key);
  }

  getUrl(key: string): Promise<string> {
    return this.provider.getUrl(key);
  }

  async resolvePublicImage(objectKey: string | null | undefined): Promise<PublicImage | null> {
    if (!objectKey) {
      return null;
    }
    const [url, thumbnailUrl] = await Promise.all([this.getUrl(objectKey), this.getUrl(thumbnailKeyFor(objectKey))]);
    return { url, thumbnailUrl };
  }

  async putOptimizedImage(objectKey: string, body: Buffer): Promise<StoredOptimizedImage> {
    if (body.byteLength > IMAGE.maxUploadBytes) {
      throw new ApiException(400, 'INVALID_IMAGE', 'Image exceeds the maximum upload size.');
    }

    let processed;
    try {
      processed = await processImage(body);
    } catch (error) {
      if (error instanceof ImageProcessingError) {
        throw new ApiException(400, 'INVALID_IMAGE', error.message);
      }
      throw error;
    }

    const thumbnailKey = thumbnailKeyFor(objectKey);
    try {
      const original = await this.upload({
        key: objectKey,
        body: processed.original,
        mimeType: processed.mimeType,
      });
      const thumbnail = await this.upload({
        key: thumbnailKey,
        body: processed.thumbnail,
        mimeType: processed.mimeType,
      });
      return {
        provider: this.name,
        objectKey,
        thumbnailKey,
        url: original.url,
        thumbnailUrl: thumbnail.url,
        mimeType: processed.mimeType,
        width: processed.width,
        height: processed.height,
        sizeBytes: processed.original.byteLength,
      };
    } catch (error) {
      await this.delete(objectKey).catch(() => undefined);
      await this.delete(thumbnailKey).catch(() => undefined);
      throw error;
    }
  }

  async removeOptimizedImage(objectKey: string | null | undefined): Promise<void> {
    if (!objectKey) {
      return;
    }
    await this.delete(objectKey);
    await this.delete(thumbnailKeyFor(objectKey));
  }
}
