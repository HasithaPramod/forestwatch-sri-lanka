import { describe, expect, it } from 'vitest';
import { canManageSpecies, formatPlantationRecords, speciesPath } from './species';

describe('species helpers', () => {
  it('reserves catalogue edits for admins', () => {
    expect(canManageSpecies({ roles: ['ORGANIZATION_MANAGER'] } as never)).toBe(false);
    expect(canManageSpecies({ roles: ['ADMIN'] } as never)).toBe(true);
  });

  it('builds a scientific-name path and labels live plantation-record counts', () => {
    expect(speciesPath('Terminalia arjuna')).toBe('/species/terminalia-arjuna');
    expect(formatPlantationRecords(1)).toBe('Listed on 1 plantation record');
  });
});
