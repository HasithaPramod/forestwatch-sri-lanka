import { IMAGE } from '@forestwatch/config';
import sharp from 'sharp';

export class ImageProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageProcessingError';
  }
}

export type ProcessedImage = {
  mimeType: typeof IMAGE.outputMimeType;
  width: number;
  height: number;
  original: Buffer;
  thumbnail: Buffer;
  thumbnailWidth: number;
  thumbnailHeight: number;
};

export function detectImageKind(buffer: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (buffer.byteLength < 12) {
    return null;
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'png';
  }
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'webp';
  }
  return null;
}

export async function processImage(buffer: Buffer): Promise<ProcessedImage> {
  if (buffer.byteLength > IMAGE.maxUploadBytes) {
    throw new ImageProcessingError('Image exceeds the maximum upload size.');
  }

  if (!detectImageKind(buffer)) {
    throw new ImageProcessingError('File is not a JPEG, PNG, or WebP image.');
  }

  const source = sharp(buffer, { failOn: 'error', limitInputPixels: IMAGE.maxInputPixels }).rotate();
  const meta = await source.metadata();
  if (!meta.width || !meta.height) {
    throw new ImageProcessingError('Image dimensions could not be read.');
  }
  if (meta.width > IMAGE.maxDimension || meta.height > IMAGE.maxDimension) {
    throw new ImageProcessingError('Image dimensions are too large.');
  }

  const original = await source
    .clone()
    .resize({
      width: IMAGE.maxLongEdge,
      height: IMAGE.maxLongEdge,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  const thumbnail = await source
    .clone()
    .resize({
      width: IMAGE.thumbnailLongEdge,
      height: IMAGE.thumbnailLongEdge,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 75 })
    .toBuffer({ resolveWithObject: true });

  return {
    mimeType: IMAGE.outputMimeType,
    width: original.info.width,
    height: original.info.height,
    original: original.data,
    thumbnail: thumbnail.data,
    thumbnailWidth: thumbnail.info.width,
    thumbnailHeight: thumbnail.info.height,
  };
}
