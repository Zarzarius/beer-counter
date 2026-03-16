import { describe, expect, it } from 'vitest';

import { beerCatalog } from './beerCatalog';

describe('beerCatalog', () => {
  it('includes the provided beer store catalog', () => {
    expect(beerCatalog.length).toBeGreaterThan(150);
    expect(beerCatalog).toContainEqual({
      brewery: 'Basqueland Brewing',
      name: 'Zugarramurdi',
      year: 'N/A',
      style: 'Stout - Other',
    });
  });
});
