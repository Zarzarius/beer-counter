import { describe, expect, it } from 'vitest';

import { beerCatalog } from './beerCatalog';

describe('beerCatalog', () => {
  it('includes the provided beer store catalog', () => {
    expect(beerCatalog.length).toBeGreaterThan(150);

    for (const entry of beerCatalog) {
      expect(entry.brewery.trim().length).toBeGreaterThan(0);
      expect(entry.name.trim().length).toBeGreaterThan(0);
      expect(entry.style.trim().length).toBeGreaterThan(0);
      expect(entry.year.trim().length).toBeGreaterThan(0);
    }

    const uniqueKeys = new Set(
      beerCatalog.map((entry) => `${entry.brewery}|${entry.name}|${entry.style}|${entry.year}`),
    );
    expect(uniqueKeys.size).toBe(beerCatalog.length);
  });
});
