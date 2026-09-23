import type { StorageProviderName } from '@forestwatch/types';

export type UploadInput = {
  key: string;
  body: Buffer;
  mimeType: string;
};

export type StoredFile = {
  provider: StorageProviderName;
  key: string;
  url: string;
  mimeType: string;
  size: number;
};

export interface StorageProvider {
  readonly name: StorageProviderName;
  upload(input: UploadInput): Promise<StoredFile>;
  delete(key: string): Promise<void>;
  getUrl(key: string): Promise<string>;
  getSignedUrl?(key: string): Promise<string>;
}
