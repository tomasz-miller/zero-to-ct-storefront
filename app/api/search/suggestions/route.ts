import { NextRequest, NextResponse } from 'next/server';

import {
  getSearchSuggestions,
  MIN_SEARCH_SUGGESTION_LENGTH,
} from '@/lib/commercetools/search-suggestions';
import { CATALOG_LOCALE } from '@/lib/commercetools/storefront-context';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get('q')?.trim() ?? '';
  const locale = searchParams.get('locale') ?? CATALOG_LOCALE;

  if (query.length < MIN_SEARCH_SUGGESTION_LENGTH) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const suggestions = await getSearchSuggestions(query, locale);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('[api/search/suggestions]', error);
    return NextResponse.json(
      { error: 'Failed to fetch search suggestions' },
      { status: 500 },
    );
  }
}
