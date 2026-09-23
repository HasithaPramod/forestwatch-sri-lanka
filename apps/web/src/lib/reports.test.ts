import { describe, expect, it } from 'vitest';
import { defaultReportsScope, formatReportCategory, nextReportStatuses } from './reports';

describe('report helpers', () => {
  it('labels illegal cutting without exposing it as a public statistic', () => {
    expect(formatReportCategory('ILLEGAL_CUTTING')).toBe('Illegal cutting');
  });

  it('defaults citizens to their own reports', () => {
    expect(
      defaultReportsScope({
        id: 'c',
        email: 'c@localhost',
        displayName: 'C',
        locale: 'en',
        emailVerifiedAt: null,
        roles: ['CITIZEN'],
      }),
    ).toBe('mine');
  });

  it('does not let officers skip OPEN to RESOLVED', () => {
    expect(nextReportStatuses('OPEN', false)).toEqual(['UNDER_REVIEW', 'REJECTED']);
  });
});
