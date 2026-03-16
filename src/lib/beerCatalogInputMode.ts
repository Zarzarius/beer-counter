export type BeerCatalogInputMode = 'hide' | 'immediate' | 'debounced';

export function getBeerCatalogInputMode(
  rawQuery: string,
  inputType?: string | null,
): BeerCatalogInputMode {
  const query = rawQuery.trim();

  if (query.length < 2) {
    return 'hide';
  }

  if (inputType?.startsWith('delete')) {
    return 'immediate';
  }

  return 'debounced';
}
