import type { StorageProviderName } from '@forestwatch/types';
import { LocalStorageProvider } from './local-provider';
import type { StorageProvider } from './provider';
import { SupabaseStorageProvider } from './supabase-provider';

export type StorageFactoryInput = {
  provider: StorageProviderName | string;
  localRoot: string;
  publicBaseUrl: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  supabaseBucket?: string;
};

export function createStorageProvider(input: StorageFactoryInput): StorageProvider {
  if (input.provider === 'local') {
    return new LocalStorageProvider(input.localRoot, input.publicBaseUrl);
  }

  if (input.provider === 'supabase') {
    return new SupabaseStorageProvider({
      url: input.supabaseUrl ?? '',
      serviceRoleKey: input.supabaseServiceRoleKey ?? '',
      bucket: input.supabaseBucket ?? '',
    });
  }

  throw new Error(`Unsupported storage provider: ${input.provider}`);
}
