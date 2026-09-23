import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';
import { ApiException } from './api-exception';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const result = this.schema.safeParse(value ?? {});
    if (!result.success) {
      throw new ApiException(400, 'VALIDATION_ERROR', 'Invalid request', result.error.issues);
    }
    return result.data;
  }
}
