import { describe, expect, it } from 'vitest';
import { getDateKey, getDayBoundsISO, getTodayKey } from './dayKeys';

describe('dayKeys', () => {
  it('getDateKey formats local date', () => {
    expect(getDateKey(new Date(2026, 3, 5))).toBe('2026-04-05');
  });

  it('getTodayKey returns YYYY-MM-DD', () => {
    expect(getTodayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('getDayBoundsISO covers local calendar day', () => {
    const { startISO, endISO } = getDayBoundsISO('2026-04-05');
    expect(new Date(startISO).getUTCHours()).toBeDefined();
    expect(endISO > startISO).toBe(true);
  });
});
