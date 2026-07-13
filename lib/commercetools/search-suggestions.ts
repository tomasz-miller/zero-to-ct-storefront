import 'server-only';

import { apiRoot } from './api-root';
import { CATALOG_LOCALE } from './storefront-context';
import {
  buildProductNameSuggestionFallbackQuery,
  buildProductNameSuggestionQuery,
  mapProductSearchNameSuggestions,
  mapSearchSuggestionResponse,
  MAX_SEARCH_SUGGESTIONS,
  MIN_SEARCH_SUGGESTION_LENGTH,
} from './search-suggestion-utils';

export {
  mapSearchSuggestionResponse,
  MAX_SEARCH_SUGGESTIONS,
  MIN_SEARCH_SUGGESTION_LENGTH,
} from './search-suggestion-utils';

async function getSearchKeywordSuggestions(
  query: string,
  locale: string,
): Promise<string[]> {
  const response = await apiRoot
    .productProjections()
    .suggest()
    .get({
      queryArgs: {
        [`searchKeywords.${locale}`]: query,
      },
    })
    .execute();

  return mapSearchSuggestionResponse(
    response.body as Record<string, unknown>,
    locale,
  );
}

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
        where: `id in (${ids.map((id) => `"${id}"`).join(',')})`,
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
    const keywordSuggestions = await getSearchKeywordSuggestions(
      trimmedQuery,
      locale,
    );

    if (keywordSuggestions.length > 0) {
      return keywordSuggestions;
    }

    return await getProductNameSuggestions(trimmedQuery, locale);
  } catch (error) {
    console.error('[search-suggestions]', error);
    return [];
  }
}
