import { expect, test } from '@playwright/test';

type CategoryNode = {
  name: string;
  slug: string;
  children: CategoryNode[];
};

function findLeafCategory(categories: CategoryNode[]): CategoryNode | undefined {
  for (const category of categories) {
    if (category.children.length === 0) {
      return category;
    }

    const nested = findLeafCategory(category.children);
    if (nested) {
      return nested;
    }
  }

  return undefined;
}

test.beforeEach(({}, testInfo) => {
  test.skip(
    !process.env.CTP_PROJECT_KEY,
    'Requires CTP_* credentials in environment (e.g. .env.local)',
  );
  testInfo.setTimeout(60_000);
});

test.describe('Discovery flow', () => {
  test('homepage shows best sellers and new arrivals with product links', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Best Sellers' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'New Arrivals' })).toBeVisible();
    const productLinks = page.locator('a[href^="/product/"]');
    await expect(productLinks.first()).toBeVisible();
    expect(await productLinks.count()).toBeGreaterThan(0);
  });

  test('category navigation opens a category listing page', async ({ page, request }) => {
    const categoriesResponse = await request.get('/api/categories');
    expect(categoriesResponse.ok()).toBeTruthy();

    const categoriesBody = (await categoriesResponse.json()) as {
      categories: CategoryNode[];
    };
    const parentCategory = categoriesBody.categories.find(
      (category) => category.children.length > 0,
    );
    const leafCategory = findLeafCategory(categoriesBody.categories);
    expect(parentCategory ?? leafCategory).toBeTruthy();

    await page.goto('/');

    await page.getByRole('button', { name: 'Browse categories' }).click();

    if (parentCategory) {
      await page.getByRole('menuitem', { name: parentCategory.name }).click();
      await page
        .getByRole('menuitem', { name: `All ${parentCategory.name}` })
        .click();
      await expect(page).toHaveURL(new RegExp(`/category/${parentCategory.slug}`));
      await expect(
        page.getByRole('heading', { name: parentCategory.name }),
      ).toBeVisible();
    } else {
      await page.getByRole('menuitem', { name: leafCategory!.name }).click();
      await expect(page).toHaveURL(new RegExp(`/category/${leafCategory!.slug}`));
      await expect(
        page.getByRole('heading', { name: leafCategory!.name }),
      ).toBeVisible();
    }

    await expect(page.locator('a[href^="/product/"]').first()).toBeVisible();
  });

  test('unknown category shows custom not found page', async ({ page }) => {
    await page.goto('/category/this-category-does-not-exist');

    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to home' })).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: 'Search products' })).toBeVisible();
  });

  test('search returns results for "bed"', async ({ page }) => {
    await page.goto('/search');

    await page.getByLabel('Search products').fill('bed');
    await page.getByRole('button', { name: 'Search' }).click();

    await expect(page).toHaveURL(/\/search\?q=bed/);
    await expect(page.getByText(/result/i)).toBeVisible();
    await expect(page.locator('a[href^="/product/"]').first()).toBeVisible();
  });

  test('search supports URL-driven sort and pagination', async ({ page }) => {
    await page.goto('/search?q=bed&sort=price-asc&page=1');

    await expect(page.getByRole('link', { name: 'Price: low to high' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    await expect(page.getByText(/Showing 1–/)).toBeVisible();
    await expect(page.locator('a[href^="/product/"]').first()).toBeVisible();

    const nextPageLink = page.getByRole('link', { name: '2' });
    if (await nextPageLink.isVisible()) {
      await nextPageLink.click();
      await expect(page).toHaveURL(/\/search\?q=bed&sort=price-asc&page=2/);
    }
  });

  test('search exposes facet filters when Product Search returns facets', async ({ page }) => {
    await page.goto('/search?q=table');

    const filtersHeading = page.getByRole('heading', { name: 'Filters' });
    if (!(await filtersHeading.isVisible())) {
      return;
    }

    const priceFacetLink = page.getByRole('link', { name: /Under €100/i });
    if (await priceFacetLink.isVisible()) {
      await priceFacetLink.click();
      await expect(page).toHaveURL(/price=under-100/);
    }
  });

  test('search autocomplete suggests terms from the BFF endpoint', async ({
    page,
    request,
  }) => {
    const suggestionsResponse = await request.get('/api/search/suggestions?q=be');
    expect(suggestionsResponse.ok()).toBeTruthy();

    const { suggestions } = (await suggestionsResponse.json()) as {
      suggestions: string[];
    };

    test.skip(
      suggestions.length === 0,
      'No search keywords configured in the CT project',
    );

    await page.goto('/search');
    await page.getByLabel('Search products').fill('be');
    await expect(page.getByRole('option', { name: suggestions[0]! })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole('option', { name: suggestions[0]! }).click();
    await expect(page).toHaveURL(
      new RegExp(`/search\\?q=${encodeURIComponent(suggestions[0]!)}`),
    );
  });

  test('product detail page shows title, stock badge, and add to cart', async ({ page }) => {
    await page.goto('/product/orion-double-bed');

    await expect(page.getByRole('img', { name: /orion double bed/i })).toBeVisible();
    await expect(page.getByText('In stock')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add to cart' })).toBeVisible();
  });
});
