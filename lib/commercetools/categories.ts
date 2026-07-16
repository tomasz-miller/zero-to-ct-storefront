import 'server-only';

import type { Category } from '@commercetools/platform-sdk';
import { cache } from 'react';

import { apiRoot } from './api-root';
import { pickLocalized } from './product-mappers';
import { getCatalogContext } from './storefront-context';

const CATEGORY_PAGE_SIZE = 500;
const CATEGORY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;
const CATEGORY_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

export type StorefrontCategory = {
  id: string;
  key?: string;
  name: string;
  slug: string;
  parentId?: string;
  orderHint: string;
  children: StorefrontCategory[];
};

function escapePredicateString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function isValidCategorySlug(slug: string): boolean {
  return CATEGORY_SLUG_PATTERN.test(slug);
}

function isValidCategoryKey(key: string): boolean {
  return CATEGORY_KEY_PATTERN.test(key);
}

function mapCategory(
  category: Category,
  locale: string,
): Omit<StorefrontCategory, 'children'> | null {
  const name = pickLocalized(category.name, locale);
  const slug = pickLocalized(category.slug, locale);

  if (!name || !slug) {
    return null;
  }

  return {
    id: category.id,
    key: category.key,
    name,
    slug,
    parentId: category.parent?.id,
    orderHint: category.orderHint ?? '0',
  };
}

function compareByOrderHint(
  left: Pick<StorefrontCategory, 'orderHint' | 'name'>,
  right: Pick<StorefrontCategory, 'orderHint' | 'name'>,
): number {
  const orderComparison = left.orderHint.localeCompare(right.orderHint, undefined, {
    numeric: true,
  });

  if (orderComparison !== 0) {
    return orderComparison;
  }

  return left.name.localeCompare(right.name);
}

function buildCategoryTree(
  categories: Array<Omit<StorefrontCategory, 'children'>>,
): StorefrontCategory[] {
  const nodes = new Map<string, StorefrontCategory>(
    categories.map((category) => [
      category.id,
      {
        ...category,
        children: [],
      },
    ]),
  );

  const roots: StorefrontCategory[] = [];

  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)?.children.push(node);
      continue;
    }

    roots.push(node);
  }

  const sortTree = (items: StorefrontCategory[]): StorefrontCategory[] =>
    items
      .map((item) => ({
        ...item,
        children: sortTree(item.children),
      }))
      .sort(compareByOrderHint);

  return sortTree(roots);
}

async function fetchAllCategories(): Promise<Category[]> {
  const allCategories: Category[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const response = await apiRoot
      .categories()
      .get({
        queryArgs: {
          limit: CATEGORY_PAGE_SIZE,
          offset,
          sort: 'orderHint asc',
        },
      })
      .execute();

    const { results } = response.body;
    allCategories.push(...results);
    total = response.body.total ?? results.length;
    offset += results.length;

    if (results.length === 0) {
      break;
    }
  }

  return allCategories;
}

export const listCategoryTree = cache(
  async (options?: { locale?: string }): Promise<StorefrontCategory[]> => {
    const { locale } = await getCatalogContext();
    const resolvedLocale = options?.locale ?? locale;
    const rawCategories = await fetchAllCategories();

    const mappedCategories = rawCategories
      .map((category) => mapCategory(category, resolvedLocale))
      .filter(
        (category): category is Omit<StorefrontCategory, 'children'> =>
          category !== null,
      );

    return buildCategoryTree(mappedCategories);
  },
);

export const getNavigationCategories = cache(
  async (options?: { locale?: string }): Promise<StorefrontCategory[]> => {
    const tree = await listCategoryTree(options);
    return tree.filter((category) => category.key !== 'new-arrivals');
  },
);

export async function getCategoryBySlug(
  slug: string,
  options?: { locale?: string },
): Promise<StorefrontCategory | null> {
  if (!isValidCategorySlug(slug)) {
    return null;
  }

  const { locale } = await getCatalogContext();
  const resolvedLocale = options?.locale ?? locale;
  const escapedSlug = escapePredicateString(slug);

  const response = await apiRoot
    .categories()
    .get({
      queryArgs: {
        where: `slug(${resolvedLocale}="${escapedSlug}")`,
        limit: 1,
      },
    })
    .execute();

  const category = response.body.results[0];
  if (!category) {
    return null;
  }

  const mapped = mapCategory(category, resolvedLocale);
  if (!mapped) {
    return null;
  }

  return {
    ...mapped,
    children: [],
  };
}

export async function getCategoryByKey(
  key: string,
  options?: { locale?: string },
): Promise<StorefrontCategory | null> {
  if (!isValidCategoryKey(key)) {
    return null;
  }

  const { locale } = await getCatalogContext();
  const resolvedLocale = options?.locale ?? locale;
  const escapedKey = escapePredicateString(key);

  const response = await apiRoot
    .categories()
    .get({
      queryArgs: {
        where: `key="${escapedKey}"`,
        limit: 1,
      },
    })
    .execute();

  const category = response.body.results[0];
  if (!category) {
    return null;
  }

  const mapped = mapCategory(category, resolvedLocale);
  if (!mapped) {
    return null;
  }

  return {
    ...mapped,
    children: [],
  };
}
