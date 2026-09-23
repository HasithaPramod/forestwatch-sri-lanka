import { describe, expect, it } from 'vitest';
import Colors from './Colors';

describe('mobile palette', () => {
  it('uses forest green rather than the Expo default blue', () => {
    expect(Colors.light.tint).toBe('#1f4d3a');
  });
});
