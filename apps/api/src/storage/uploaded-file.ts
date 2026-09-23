import { ApiException } from '../common/http/api-exception';

export function requireUploadedImage(file?: Express.Multer.File): Express.Multer.File {
  if (!file?.buffer?.byteLength) {
    throw new ApiException(400, 'INVALID_IMAGE', 'An image file is required');
  }
  return file;
}
