import { describe, expect, it } from 'vitest';

import { clearBeerCatalogResults } from './beerCatalogResults.ts';

describe('clearBeerCatalogResults', () => {
  it('hides the panel and removes rendered suggestions', () => {
    const resultsPanel = {
      hidden: false,
      innerHTML: '<button>Sonoma</button>',
    };

    clearBeerCatalogResults(resultsPanel);

    expect(resultsPanel.hidden).toBe(true);
    expect(resultsPanel.innerHTML).toBe('');
  });

  it('ignores a missing panel', () => {
    expect(() => clearBeerCatalogResults(null)).not.toThrow();
  });
});
