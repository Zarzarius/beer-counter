import { describe, expect, it } from 'vitest';

import { getBeerCatalogInputMode } from './beerCatalogInputMode';

describe('getBeerCatalogInputMode', () => {
  it('hides suggestions for very short queries', () => {
    expect(getBeerCatalogInputMode('', undefined)).toBe('hide');
    expect(getBeerCatalogInputMode('a', 'insertText')).toBe('hide');
  });

  it('updates immediately when the user is deleting text', () => {
    expect(getBeerCatalogInputMode('son', 'deleteContentBackward')).toBe(
      'immediate',
    );
    expect(getBeerCatalogInputMode('son', 'deleteWordBackward')).toBe(
      'immediate',
    );
  });

  it('debounces forward typing', () => {
    expect(getBeerCatalogInputMode('son', 'insertText')).toBe('debounced');
    expect(getBeerCatalogInputMode('son', undefined)).toBe('debounced');
  });
});
