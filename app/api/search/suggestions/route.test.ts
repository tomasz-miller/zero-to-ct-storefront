/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockGetSearchSuggestions } = vi.hoisted(() => ({
  mockGetSearchSuggestions: vi.fn(),
}));

vi.mock('@/lib/commercetools/search-suggestions', () => ({
  getSearchSuggestions: mockGetSearchSuggestions,
  MIN_SEARCH_SUGGESTION_LENGTH: 2,
}));

import { GET } from './route';

describe('GET /api/search/suggestions', () => {
  beforeEach(() => {
    mockGetSearchSuggestions.mockReset();
  });

  it('returns an empty list for short queries', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/search/suggestions?q=a'),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ suggestions: [] });
    expect(mockGetSearchSuggestions).not.toHaveBeenCalled();
  });

  it('returns mapped suggestions for valid queries', async () => {
    mockGetSearchSuggestions.mockResolvedValueOnce(['Double bed']);

    const response = await GET(
      new NextRequest('http://localhost/api/search/suggestions?q=bed'),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      suggestions: ['Double bed'],
    });
    expect(mockGetSearchSuggestions).toHaveBeenCalledWith('bed', 'en-GB');
  });
});
