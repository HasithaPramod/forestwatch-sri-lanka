import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assertSafeStorageKey } from '@forestwatch/utils';
import type { StorageProvider, StoredFile, UploadInput } from './provider';

export class LocalStorageProvider implements StorageProvider {
  readonly name = 'local' as const;

  constructor(
    private readonly rootDir: string,
    private readonly publicBaseUrl: string,
  ) {}

  async upload(input: UploadInput): Promise<StoredFile> {
    assertSafeStorageKey(input.key);
    const target = this.resolve(input.key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, input.body);

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
    await unlink(this.resolve(key)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    });
  }

  async getUrl(key: string): Promise<string> {
    assertSafeStorageKey(key);
    const base = this.publicBaseUrl.replace(/\/$/, '');
    return `${base}/${key.split('\\').join('/')}`;
  }

  async getSignedUrl(key: string): Promise<string> {
    return this.getUrl(key);
  }

  private resolve(key: string): string {
    const root = path.resolve(this.rootDir);
    const target = path.resolve(root, key);
    const prefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
    if (target !== root && !target.startsWith(prefix)) {
      throw new Error('Storage key escaped the configured root.');
    }
    return target;
  }
}
