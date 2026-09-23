import { describe, expect, it } from 'vitest';
import { hasRole, highestRole, isAdmin, isOfficer } from './index';

describe('auth helpers', () => {
  it('does not treat a citizen as an officer', () => {
    expect(isOfficer(['CITIZEN'])).toBe(false);
    expect(isOfficer(['FOREST_OFFICER'])).toBe(true);
  });

  it('requires an explicit role match', () => {
    expect(hasRole(['CITIZEN'], 'ADMIN')).toBe(false);
    expect(isAdmin(['ADMIN'])).toBe(true);
  });

  it('picks the highest assigned role', () => {
    expect(highestRole(['CITIZEN', 'FOREST_OFFICER'])).toBe('FOREST_OFFICER');
  });
});
