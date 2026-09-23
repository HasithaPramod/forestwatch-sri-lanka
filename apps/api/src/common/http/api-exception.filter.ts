import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiFailure } from '@forestwatch/types';
import type { Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const multerCode =
      exception && typeof exception === 'object' && 'code' in exception
        ? String((exception as { code: unknown }).code)
        : '';
    if (multerCode === 'LIMIT_FILE_SIZE') {
      response.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        error: { code: 'INVALID_IMAGE', message: 'Image exceeds the maximum upload size.' },
      });
      return;
    }

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttp ? exception.getResponse() : undefined;

    const message =
      typeof body === 'string'
        ? body
        : body && typeof body === 'object' && 'message' in body
          ? Array.isArray(body.message)
            ? body.message.join(', ')
            : String(body.message)
          : 'Internal server error';

    const code =
      body && typeof body === 'object' && 'code' in body && typeof body.code === 'string'
        ? body.code
        : status === HttpStatus.UNAUTHORIZED
          ? 'UNAUTHORIZED'
          : status === HttpStatus.FORBIDDEN
            ? 'FORBIDDEN'
            : status === HttpStatus.TOO_MANY_REQUESTS
              ? 'RATE_LIMITED'
              : status === HttpStatus.CONFLICT
                ? 'CONFLICT'
                : status === HttpStatus.BAD_REQUEST
                  ? 'REQUEST_ERROR'
                  : status === HttpStatus.INTERNAL_SERVER_ERROR
                    ? 'INTERNAL_ERROR'
                    : 'REQUEST_ERROR';

    const details =
      body && typeof body === 'object' && 'details' in body && Array.isArray(body.details)
        ? body.details
        : undefined;

    if (!isHttp) {
      this.logger.error(exception);
    }

    const payload: ApiFailure = {
      success: false,
      error: {
        code: process.env.NODE_ENV === 'production' && status === 500 ? 'INTERNAL_ERROR' : code,
        message: process.env.NODE_ENV === 'production' && status === 500 ? 'Internal server error' : message,
        ...(details ? { details } : {}),
      },
    };

    response.status(status).json(payload);
  }
}
