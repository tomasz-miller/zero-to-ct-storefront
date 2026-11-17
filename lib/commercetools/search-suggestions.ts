import 'server-only';

import { apiRoot } from './api-root';
import { CATALOG_LOCALE } from './storefront-context';
import {
  buildProductNameSuggestionFallbackQuery,
  buildProductNameSuggestionQuery,
  mapProductSearchNameSuggestions,
  MAX_SEARCH_SUGGESTIONS,
  MIN_SEARCH_SUGGESTION_LENGTH,
} from './search-suggestion-utils';

export {
  MAX_SEARCH_SUGGESTIONS,
  MIN_SEARCH_SUGGESTION_LENGTH,
} from './search-suggestion-utils';

async function searchProductIdsForSuggestions(
  searchQuery: Record<string, unknown>,
): Promise<string[]> {
  const response = await apiRoot
    .products()
    .search()
    .post({
      body: {
        query: searchQuery,
        limit: MAX_SEARCH_SUGGESTIONS,
      },
    })
    .execute();

  return response.body.results.map((result) => result.id);
}

async function getProductNameSuggestions(
  query: string,
  locale: string,
): Promise<string[]> {
  let ids = await searchProductIdsForSuggestions(
    buildProductNameSuggestionQuery(query, locale),
  );

  if (ids.length === 0) {
    ids = await searchProductIdsForSuggestions(
      buildProductNameSuggestionFallbackQuery(query, locale),
    );
  }

  if (ids.length === 0) {
    return [];
  }

  const projectionsResponse = await apiRoot
    .productProjections()
    .get({
      queryArgs: {
        where: 'id in :ids',
        'var.ids': ids,
        limit: MAX_SEARCH_SUGGESTIONS,
        staged: false,
        localeProjection: locale,
      },
    })
    .execute();

  return mapProductSearchNameSuggestions(
    ids,
    projectionsResponse.body.results,
    locale,
  );
}

export async function getSearchSuggestions(
  query: string,
  locale: string = CATALOG_LOCALE,
): Promise<string[]> {
  const trimmedQuery = query.trim();

  if (trimmedQuery.length < MIN_SEARCH_SUGGESTION_LENGTH) {
    return [];
  }

  try {
    return await getProductNameSuggestions(trimmedQuery, locale);
  } catch (error) {
    console.error('[search-suggestions]', error);
    return [];
  }
}
