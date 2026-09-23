import { ForestWatchApiError } from '@forestwatch/api-client';

export function isAuthError(error: unknown): error is ForestWatchApiError {
  return (
    error instanceof ForestWatchApiError ||
    (typeof error === 'object' && error !== null && 'name' in error && error.name === 'ForestWatchApiError')
  );
}

export function errorMessage(error: unknown, fallback: string): string {
  if (isAuthError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
