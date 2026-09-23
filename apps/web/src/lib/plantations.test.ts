import { describe, expect, it } from 'vitest';
import { canSubmitPlantations, formatCoordinates, formatRecordedTrees } from './plantations';

describe('plantation helpers', () => {
  it('lets any signed-in user submit a plantation', () => {
    expect(canSubmitPlantations(null)).toBe(false);
    expect(canSubmitPlantations({ roles: ['CITIZEN'] } as never)).toBe(true);
  });

  it('labels tree counts as recorded, not surviving estimates', () => {
    expect(formatRecordedTrees(1250)).toBe('1,250 recorded trees');
  });

  it('does not print withheld coordinates', () => {
    expect(formatCoordinates(null, null, 'hidden')).toBe('Coordinates withheld');
  });
});
