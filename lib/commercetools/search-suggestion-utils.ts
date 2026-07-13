import { pickLocalized } from './product-mappers';

export const MIN_SEARCH_SUGGESTION_LENGTH = 2;
export const MAX_SEARCH_SUGGESTIONS = 8;

export function mapSearchSuggestionResponse(
  body: Record<string, unknown>,
  locale: string,
): string[] {
  const localeKey = `searchKeywords.${locale}`;
  const suggestions = body[localeKey];

  if (!Array.isArray(suggestions)) {
    return [];
  }

  return suggestions
    .map((entry) => {
      if (
        typeof entry === 'object' &&
        entry !== null &&
        'text' in entry &&
        typeof entry.text === 'string'
      ) {
        return entry.text;
      }

      return null;
    })
    .filter((text): text is string => text !== null)
    .slice(0, MAX_SEARCH_SUGGESTIONS);
}

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
