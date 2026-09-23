import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiException extends HttpException {
  constructor(
    status: HttpStatus | number,
    readonly errorCode: string,
    message: string,
    readonly details?: unknown[],
  ) {
    super({ statusCode: status, code: errorCode, message, details }, status);
  }
}
