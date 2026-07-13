import 'server-only';

import type { ProductType } from '@commercetools/platform-sdk';
import { cache } from 'react';

import { apiRoot } from './api-root';

const PRODUCT_TYPE_PAGE_SIZE = 500;

export const getProductTypes = cache(async (): Promise<ProductType[]> => {
  const response = await apiRoot
    .productTypes()
    .get({
      queryArgs: {
        limit: PRODUCT_TYPE_PAGE_SIZE,
      },
    })
    .execute();

  return response.body.results;
});
