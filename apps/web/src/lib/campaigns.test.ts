import { describe, expect, it } from 'vitest';
import { canManageCampaigns, formatTargetTrees } from './campaigns';

describe('campaign helpers', () => {
  it('does not treat a citizen as a campaign manager', () => {
    expect(canManageCampaigns({ roles: ['CITIZEN'] } as never)).toBe(false);
    expect(canManageCampaigns({ roles: ['ORGANIZATION_MANAGER'] } as never)).toBe(true);
  });

  it('labels tree counts as targets', () => {
    expect(formatTargetTrees(5000)).toContain('target');
    expect(formatTargetTrees(null)).toBeNull();
  });
});
