import { describe, expect, it } from 'vitest';

import type { AttributeDefinition } from '@commercetools/platform-sdk';

import {
  collectSearchableAttributeFacetConfigs,
} from './searchable-product-attributes';

function createAttribute(
  overrides: Partial<AttributeDefinition> & Pick<AttributeDefinition, 'name' | 'type'>,
): AttributeDefinition {
  return {
    attributeConstraint: 'None',
    inputHint: 'SingleLine',
    isRequired: false,
    isSearchable: true,
    level: 'Variant',
    label: { 'en-GB': overrides.name },
    ...overrides,
  };
}

describe('searchable product attributes', () => {
  it('collects searchable attributes from product types and excludes redundant fields', () => {
    const configs = collectSearchableAttributeFacetConfigs(
      [
        {
          id: 'pt-1',
          attributes: [
            createAttribute({
              name: 'color-label',
              type: { name: 'ltext' },
              label: { 'en-GB': 'Colour Label' },
            }),
            createAttribute({
              name: 'search-color',
              type: { name: 'lenum', values: [] },
              label: { 'en-GB': 'Search Colour' },
            }),
            createAttribute({
              name: 'color-code',
              type: { name: 'text' },
              label: { 'en-GB': 'Colour Code' },
            }),
            createAttribute({
              name: 'size',
              type: { name: 'ltext' },
              label: { 'en-GB': 'Size' },
            }),
          ],
        },
      ],
      'en-GB',
    );

    expect(configs.map((config) => config.name)).toEqual(['color-label', 'size']);
    expect(configs[0]).toMatchObject({
      name: 'color-label',
      label: 'Colour Label',
      field: 'variants.attributes.color-label',
      filterField: 'variants.attributes.color-label',
      fieldType: 'ltext',
      language: 'en-GB',
    });
  });

  it('maps lenum attributes to label-based filter fields', () => {
    const configs = collectSearchableAttributeFacetConfigs(
      [
        {
          id: 'pt-1',
          attributes: [
            createAttribute({
              name: 'material',
              type: { name: 'lenum', values: [] },
              label: { 'en-GB': 'Material' },
            }),
          ],
        },
      ],
      'en-GB',
    );

    expect(configs[0]).toMatchObject({
      field: 'variants.attributes.material',
      filterField: 'variants.attributes.material.label',
      fieldType: 'lenum',
      language: 'en-GB',
    });
  });

  it('scopes searchable attributes to product types present in the listing', () => {
    const configs = collectSearchableAttributeFacetConfigs(
      [
        {
          id: 'pt-furniture',
          attributes: [
            createAttribute({
              name: 'color-label',
              type: { name: 'ltext' },
              label: { 'en-GB': 'Colour Label' },
            }),
          ],
        },
        {
          id: 'pt-bedding',
          attributes: [
            createAttribute({
              name: 'thread-count',
              type: { name: 'number' },
              label: { 'en-GB': 'Thread Count' },
            }),
          ],
        },
      ],
      'en-GB',
    );

    expect(configs.map((config) => config.name)).toEqual([
      'color-label',
      'thread-count',
    ]);

    const furnitureOnly = collectSearchableAttributeFacetConfigs(
      [
        {
          id: 'pt-furniture',
          attributes: [
            createAttribute({
              name: 'color-label',
              type: { name: 'ltext' },
              label: { 'en-GB': 'Colour Label' },
            }),
          ],
        },
        {
          id: 'pt-bedding',
          attributes: [
            createAttribute({
              name: 'thread-count',
              type: { name: 'number' },
              label: { 'en-GB': 'Thread Count' },
            }),
          ],
        },
      ].filter((productType) => productType.id === 'pt-furniture'),
      'en-GB',
    );

    expect(furnitureOnly.map((config) => config.name)).toEqual(['color-label']);
  });

  it('ignores non-searchable attributes', () => {
    const configs = collectSearchableAttributeFacetConfigs(
      [
        {
          id: 'pt-1',
          attributes: [
            createAttribute({
              name: 'product-description',
              type: { name: 'ltext' },
              isSearchable: false,
            }),
          ],
        },
      ],
      'en-GB',
    );

    expect(configs).toEqual([]);
  });
});
