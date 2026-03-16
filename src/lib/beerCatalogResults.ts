type BeerCatalogResultsPanel = {
  hidden: boolean;
  innerHTML: string;
};

export function clearBeerCatalogResults(
  resultsPanel: BeerCatalogResultsPanel | null,
) {
  if (!resultsPanel) {
    return;
  }

  resultsPanel.innerHTML = '';
  resultsPanel.hidden = true;
}
