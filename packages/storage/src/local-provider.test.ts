import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createStorageProvider } from './factory';
import { LocalStorageProvider } from './local-provider';

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('LocalStorageProvider', () => {
  it('writes files under the configured root and rejects traversal', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'forestwatch-storage-'));
    dirs.push(root);
    const provider = new LocalStorageProvider(root, 'http://localhost:3001/api/v1/files');

    const stored = await provider.upload({
      key: 'monitoring/sample.txt',
      body: Buffer.from('ok'),
      mimeType: 'text/plain',
    });

    expect(stored.url).toBe('http://localhost:3001/api/v1/files/monitoring/sample.txt');
    const written = await readFile(path.join(root, 'monitoring', 'sample.txt'), 'utf8');
    expect(written).toBe('ok');

    await expect(
      provider.upload({
        key: '../escape.txt',
        body: Buffer.from('no'),
        mimeType: 'text/plain',
      }),
    ).rejects.toThrow();
  });
});

describe('createStorageProvider', () => {
  it('fails fast when supabase is selected without credentials', () => {
    expect(() =>
      createStorageProvider({
        provider: 'supabase',
        localRoot: './uploads',
        publicBaseUrl: 'http://localhost/files',
      }),
    ).toThrow(/SUPABASE/);
  });
});
