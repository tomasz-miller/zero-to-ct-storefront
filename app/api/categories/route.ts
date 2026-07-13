import { NextResponse } from 'next/server';

import { listCategoryTree } from '@/lib/commercetools/categories';
import { getCatalogContext } from '@/lib/commercetools/storefront-context';

export async function GET() {
  const { locale } = getCatalogContext();

  try {
    const categories = await listCategoryTree({ locale });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('[api/categories]', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 },
    );
  }
}
