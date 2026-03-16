import { describe, expect, it } from 'vitest';

import type { BeerCatalogEntry } from '../data/beerCatalog.ts';
import { searchBeerCatalog } from './beerCatalogSearch.ts';

const sampleCatalog: BeerCatalogEntry[] = [
  {
    brewery: 'Basqueland Brewing',
    name: 'Zugarramurdi',
    year: 'N/A',
    style: 'Stout - Other',
  },
  {
    brewery: 'Track Brewing Company',
    name: 'Sonoma',
    year: 'N/A',
    style: 'Pale Ale - New England / Hazy',
  },
  {
    brewery: 'Verdant Brewing Co',
    name: 'PuTTTy',
    year: '2026',
    style: 'IPA - Triple New England / Hazy',
  },
];

describe('searchBeerCatalog', () => {
  it('returns prefix matches before broader contains matches', () => {
    const results = searchBeerCatalog(sampleCatalog, 'so');

    expect(results.map((beer) => beer.name)).toEqual(['Sonoma']);
  });

  it('matches brewery, style, and year fields', () => {
    expect(searchBeerCatalog(sampleCatalog, 'verdant')[0]?.name).toBe('PuTTTy');
    expect(searchBeerCatalog(sampleCatalog, 'triple')[0]?.name).toBe('PuTTTy');
    expect(searchBeerCatalog(sampleCatalog, '2026')[0]?.name).toBe('PuTTTy');
  });

  it('returns an empty list for blank or too-short queries', () => {
    expect(searchBeerCatalog(sampleCatalog, '')).toEqual([]);
    expect(searchBeerCatalog(sampleCatalog, 'a')).toEqual([]);
  });
});
