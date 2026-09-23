import { PAGINATION } from '@forestwatch/config';
import type { PaginationMeta } from '@forestwatch/types';

export function buildPaginationMeta(input: {
  page?: number;
  limit?: number;
  total: number;
}): PaginationMeta {
  const page = Math.max(1, input.page ?? PAGINATION.defaultPage);
  const limit = Math.min(
    PAGINATION.maxLimit,
    Math.max(1, input.limit ?? PAGINATION.defaultLimit),
  );
  const totalPages = input.total === 0 ? 0 : Math.ceil(input.total / limit);

  return { page, limit, total: input.total, totalPages };
}
