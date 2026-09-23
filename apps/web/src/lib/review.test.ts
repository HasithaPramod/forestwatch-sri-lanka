import { describe, expect, it } from 'vitest';
import { canVerifyRecords, formatVerificationDecision } from './review';

describe('review helpers', () => {
  it('does not let citizens verify records', () => {
    expect(
      canVerifyRecords({
        id: 'c',
        email: 'c@localhost',
        displayName: 'C',
        locale: 'en',
        emailVerifiedAt: null,
        roles: ['CITIZEN'],
      }),
    ).toBe(false);
  });

  it('labels a recorded decision without inventing a count', () => {
    expect(formatVerificationDecision('VERIFIED')).toBe('Verified');
  });
});
