/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/commercetools/env', () => import('@/test/mocks/commercetools-env'));

const { mockSuggest, suggestExecute, mockProjectionsGet, projectionsExecute, searchExecute } =
  vi.hoisted(() => {
    const suggestExecute = vi.fn();
    const projectionsExecute = vi.fn();
    return {
      suggestExecute,
      projectionsExecute,
      searchExecute: vi.fn(),
      mockSuggest: vi.fn(() => ({ get: () => ({ execute: suggestExecute }) })),
      mockProjectionsGet: vi.fn<
        (args: { queryArgs: Record<string, unknown> }) => {
          execute: typeof projectionsExecute;
        }
      >(() => ({
        execute: projectionsExecute,
      })),
    };
  });

vi.mock('./api-root', () => ({
  apiRoot: {
    productProjections: () => ({
      suggest: mockSuggest,
      get: mockProjectionsGet,
    }),
    products: () => ({
      search: () => ({ post: () => ({ execute: searchExecute }) }),
    }),
  },
}));

import { getSearchSuggestions } from './search-suggestions';
import {
  buildProductNameSuggestionFallbackQuery,
  buildProductNameSuggestionQuery,
  escapeWildcardValue,
  mapProductSearchNameSuggestions,
  MAX_SEARCH_SUGGESTIONS,
  MIN_SEARCH_SUGGESTION_LENGTH,
} from './search-suggestion-utils';

describe('search suggestions', () => {
  it('defines suggestion length guardrails', () => {
    expect(MIN_SEARCH_SUGGESTION_LENGTH).toBe(2);
    expect(MAX_SEARCH_SUGGESTIONS).toBe(8);
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

describe('getSearchSuggestions', () => {
  it('loads suggestion names by id with an ids variable', async () => {
    suggestExecute.mockResolvedValueOnce({ body: {} }); // no keyword suggestions
    searchExecute.mockResolvedValueOnce({
      body: { results: [{ id: 'p1' }, { id: 'p2' }] },
    });
    projectionsExecute.mockResolvedValueOnce({ body: { results: [] } });

    await getSearchSuggestions('bed', 'en-GB');

    expect(mockProjectionsGet).toHaveBeenCalledWith({
      queryArgs: expect.objectContaining({
        where: 'id in :ids',
        'var.ids': ['p1', 'p2'],
      }),
    });
  });

  it('never calls the deprecated suggest endpoint', async () => {
    searchExecute.mockResolvedValue({ body: { results: [{ id: 'p1' }] } });
    projectionsExecute.mockResolvedValue({ body: { results: [{ id: 'p1', name: { 'en-GB': 'Double bed' } }] } });
    await expect(getSearchSuggestions('bed', 'en-GB')).resolves.toEqual(['Double bed']);
    expect(mockSuggest).not.toHaveBeenCalled();
  });
});
