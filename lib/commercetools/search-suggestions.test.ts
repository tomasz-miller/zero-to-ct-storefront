import { describe, expect, it } from 'vitest';

import {
  buildProductNameSuggestionFallbackQuery,
  buildProductNameSuggestionQuery,
  escapeWildcardValue,
  mapProductSearchNameSuggestions,
  mapSearchSuggestionResponse,
  MAX_SEARCH_SUGGESTIONS,
  MIN_SEARCH_SUGGESTION_LENGTH,
} from './search-suggestion-utils';

describe('search suggestions', () => {
  it('defines suggestion length guardrails', () => {
    expect(MIN_SEARCH_SUGGESTION_LENGTH).toBe(2);
    expect(MAX_SEARCH_SUGGESTIONS).toBe(8);
  });

  it('maps locale-specific search keyword suggestion results', () => {
    expect(
      mapSearchSuggestionResponse(
        {
          'searchKeywords.en-GB': [
            { text: 'Double bed' },
            { text: 'Dining table' },
          ],
        },
        'en-GB',
      ),
    ).toEqual(['Double bed', 'Dining table']);
  });

  it('returns an empty list for missing or invalid keyword payloads', () => {
    expect(mapSearchSuggestionResponse({}, 'en-GB')).toEqual([]);
    expect(
      mapSearchSuggestionResponse(
        { 'searchKeywords.en-GB': [{ text: 123 }] },
        'en-GB',
      ),
    ).toEqual([]);
  });

  it('caps mapped keyword suggestions to the storefront limit', () => {
    const suggestions = Array.from({ length: 12 }, (_, index) => ({
      text: `Suggestion ${index + 1}`,
    }));

    expect(
      mapSearchSuggestionResponse(
        { 'searchKeywords.en-GB': suggestions },
        'en-GB',
      ),
    ).toHaveLength(MAX_SEARCH_SUGGESTIONS);
  });

  it('builds Product Search queries aligned with storefront name search', () => {
    expect(buildProductNameSuggestionQuery('red', 'en-GB')).toEqual({
      fullText: {
        field: 'name',
        language: 'en-GB',
        value: 'red',
      },
    });
    expect(buildProductNameSuggestionFallbackQuery('be', 'en-GB')).toEqual({
      wildcard: {
        field: 'name',
        language: 'en-GB',
        value: '*be*',
      },
    });
    expect(escapeWildcardValue('a*b?')).toBe('a\\*b\\?');
  });

  it('maps product names from search ids in relevance order', () => {
    expect(
      mapProductSearchNameSuggestions(
        ['prod-2', 'prod-1', 'prod-2'],
        [
          { id: 'prod-1', name: { 'en-GB': 'Red Modern Painting' } },
          { id: 'prod-2', name: { 'en-GB': 'Double bed' } },
        ],
        'en-GB',
      ),
    ).toEqual(['Double bed', 'Red Modern Painting']);
  });
});
