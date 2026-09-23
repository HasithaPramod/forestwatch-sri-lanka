import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { detectImageKind, processImage } from './image';

describe('processImage', () => {
  it('rejects bytes that are not an image', async () => {
    await expect(processImage(Buffer.from('not-an-image'))).rejects.toThrow(/JPEG, PNG, or WebP/);
  });

  it('accepts a PNG signature', () => {
    expect(detectImageKind(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))).toBe('png');
  });

  it('writes WebP originals at or under 1600px and a smaller thumbnail', async () => {
    const png = await sharp({
      create: { width: 1800, height: 900, channels: 3, background: { r: 32, g: 96, b: 48 } },
    })
      .png()
      .toBuffer();

    const processed = await processImage(png);
    expect(processed.mimeType).toBe('image/webp');
    expect(Math.max(processed.width, processed.height)).toBe(1600);
    expect(Math.max(processed.thumbnailWidth, processed.thumbnailHeight)).toBe(400);
    expect(detectImageKind(processed.original)).toBe('webp');
    expect(detectImageKind(processed.thumbnail)).toBe('webp');
  });
});
