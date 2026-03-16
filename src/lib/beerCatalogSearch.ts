import type { BeerCatalogEntry } from '../data/beerCatalog';

export function searchBeerCatalog(
  catalog: BeerCatalogEntry[],
  rawQuery: string,
  limit = 8,
) {
  const query = normalize(rawQuery);

  if (query.length < 2) {
    return [];
  }

  return catalog
    .map((entry) => ({
      entry,
      score: scoreEntry(entry, query),
    }))
    .filter(
      (result): result is { entry: BeerCatalogEntry; score: number } =>
        result.score !== null,
    )
    .sort((left, right) => {
      if (left.score !== right.score) {
        return left.score - right.score;
      }

      const nameComparison = left.entry.name.localeCompare(right.entry.name);
      if (nameComparison !== 0) {
        return nameComparison;
      }

      return left.entry.brewery.localeCompare(right.entry.brewery);
    })
    .slice(0, limit)
    .map((result) => result.entry);
}

function scoreEntry(entry: BeerCatalogEntry, query: string) {
  const name = normalize(entry.name);
  const brewery = normalize(entry.brewery);
  const style = normalize(entry.style);
  const year = normalize(entry.year);
  const combined = `${name} ${brewery} ${style} ${year}`.trim();

  if (name === query) return 0;
  if (name.startsWith(query)) return 1;
  if (brewery.startsWith(query)) return 2;
  if (style.startsWith(query)) return 3;
  if (year !== 'n/a' && year.startsWith(query)) return 4;
  if (name.includes(query)) return 5;
  if (brewery.includes(query)) return 6;
  if (style.includes(query)) return 7;
  if (year !== 'n/a' && year.includes(query)) return 8;
  if (combined.includes(query)) return 9;

  return null;
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}
