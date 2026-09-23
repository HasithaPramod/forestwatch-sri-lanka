import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertSafeStorageKey } from '@forestwatch/utils';
import type { StorageProvider, StoredFile, UploadInput } from './provider';

export type SupabaseStorageConfig = {
  url: string;
  serviceRoleKey: string;
  bucket: string;
};

export class SupabaseStorageProvider implements StorageProvider {
  readonly name = 'supabase' as const;
  private readonly client: SupabaseClient;

  constructor(private readonly config: SupabaseStorageConfig) {
    if (!config.url || !config.serviceRoleKey || !config.bucket) {
      throw new Error(
        'SupabaseStorageProvider requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET.',
      );
    }

    this.client = createClient(config.url, config.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async upload(input: UploadInput): Promise<StoredFile> {
    assertSafeStorageKey(input.key);
    const { error } = await this.client.storage.from(this.config.bucket).upload(input.key, input.body, {
      contentType: input.mimeType,
      upsert: true,
    });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    return {
      provider: this.name,
      key: input.key,
      url: await this.getUrl(input.key),
      mimeType: input.mimeType,
      size: input.body.byteLength,
    };
  }

  async delete(key: string): Promise<void> {
    assertSafeStorageKey(key);
    const { error } = await this.client.storage.from(this.config.bucket).remove([key]);
    if (error) {
      throw new Error(`Supabase delete failed: ${error.message}`);
    }
  }

  async getUrl(key: string): Promise<string> {
    assertSafeStorageKey(key);
    const { data } = this.client.storage.from(this.config.bucket).getPublicUrl(key);
    return data.publicUrl;
  }

  async getSignedUrl(key: string): Promise<string> {
    assertSafeStorageKey(key);
    const { data, error } = await this.client.storage
      .from(this.config.bucket)
      .createSignedUrl(key, 60 * 60);

    if (error || !data) {
      throw new Error(`Supabase signed URL failed: ${error?.message ?? 'unknown error'}`);
    }

    return data.signedUrl;
  }
}
