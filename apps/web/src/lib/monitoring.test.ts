import { describe, expect, it } from 'vitest';
import { formatHealth, formatProximity, formatSurvivalEstimate } from './monitoring';

describe('monitoring helpers', () => {
  it('does not treat estimates as recorded tree counts', () => {
    expect(formatSurvivalEstimate(1180, 70)).toContain('observation estimate');
    expect(formatSurvivalEstimate(1180, 70)).not.toContain('recorded trees');
  });

  it('labels health and proximity without inventing a missing GPS band', () => {
    expect(formatHealth('HEALTHY')).toBe('Healthy');
    expect(formatProximity('LOCATION_UNAVAILABLE')).toBe('Location unavailable');
  });
});
