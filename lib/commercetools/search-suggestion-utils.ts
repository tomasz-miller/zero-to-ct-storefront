import { pickLocalized } from './product-mappers';

export const MIN_SEARCH_SUGGESTION_LENGTH = 2;
export const MAX_SEARCH_SUGGESTIONS = 8;

export function escapeWildcardValue(value: string): string {
  return value.replace(/[\\?*]/g, '\\$&');
}

export function buildProductNameSuggestionQuery(
  query: string,
  locale: string,
): Record<string, unknown> {
  return {
    fullText: {
      field: 'name',
      language: locale,
      value: query,
    },
  };
}

export function buildProductNameSuggestionFallbackQuery(
  query: string,
  locale: string,
): Record<string, unknown> {
  return {
    wildcard: {
      field: 'name',
      language: locale,
      value: `*${escapeWildcardValue(query)}*`,
    },
  };
}

export function mapProductSearchNameSuggestions(
  ids: readonly string[],
  projections: Array<{ id: string; name?: Record<string, string> }>,
  locale: string,
): string[] {
  const projectionsById = new Map(
    projections.map((projection) => [projection.id, projection]),
  );
  const suggestions: string[] = [];
  const seen = new Set<string>();

  for (const id of ids) {
    const name = pickLocalized(projectionsById.get(id)?.name, locale);

    if (!name || seen.has(name)) {
      continue;
    }

    seen.add(name);
    suggestions.push(name);

    if (suggestions.length >= MAX_SEARCH_SUGGESTIONS) {
      break;
    }
  }

  return suggestions;
}
