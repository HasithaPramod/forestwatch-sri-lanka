export function thumbnailKeyFor(key: string): string {
  assertSafeStorageKey(key);
  const lastDot = key.lastIndexOf('.');
  const lastSlash = Math.max(key.lastIndexOf('/'), key.lastIndexOf('\\'));
  if (lastDot > lastSlash) {
    return `${key.slice(0, lastDot)}-thumb.webp`;
  }
  return `${key}-thumb.webp`;
}

export function assertSafeStorageKey(key: string): void {
  if (!key || key.trim() !== key) {
    throw new Error('Storage key must be a non-empty trimmed path.');
  }

  if (key.startsWith('/') || key.startsWith('\\') || /^[a-zA-Z]:/.test(key)) {
    throw new Error('Storage key must be relative.');
  }

  const segments = key.split(/[\\/]/);
  if (segments.some((segment) => segment === '..' || segment === '')) {
    throw new Error('Storage key must not contain empty or parent path segments.');
  }
}
