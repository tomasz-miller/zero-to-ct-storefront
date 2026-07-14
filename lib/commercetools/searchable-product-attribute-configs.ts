import type { AttributeDefinition, ProductType } from '@commercetools/platform-sdk';

import { pickLocalized } from './product-mappers';
import { CATALOG_LOCALE } from './storefront-context';

export type SearchableAttributeFacetConfig = {
  name: string;
  label: string;
  field: string;
  filterField: string;
  fieldType: string;
  language?: string;
};

function resolveAttributeElementType(
  attribute: AttributeDefinition,
): string | null {
  if (attribute.type.name === 'set') {
    const elementType = attribute.type.elementType;

    if (!elementType || elementType.name === 'set') {
      return null;
    }

    return `set_${elementType.name}`;
  }

  return attribute.type.name;
}

function buildConfigForAttribute(
  attribute: AttributeDefinition,
  locale: string,
): SearchableAttributeFacetConfig | null {
  if (!attribute.isSearchable) {
    return null;
  }

  const label = pickLocalized(attribute.label, locale) ?? attribute.name;
  const baseField = `variants.attributes.${attribute.name}`;
  const elementType = resolveAttributeElementType(attribute);

  switch (elementType) {
    case 'text':
      return {
        name: attribute.name,
        label,
        field: baseField,
        filterField: baseField,
        fieldType: 'text',
      };
    case 'ltext':
      return {
        name: attribute.name,
        label,
        field: baseField,
        filterField: baseField,
        fieldType: 'ltext',
        language: locale,
      };
    case 'boolean':
      return {
        name: attribute.name,
        label,
        field: baseField,
        filterField: baseField,
        fieldType: 'boolean',
      };
    case 'number':
      return {
        name: attribute.name,
        label,
        field: baseField,
        filterField: baseField,
        fieldType: 'number',
      };
    case 'lenum':
      return {
        name: attribute.name,
        label,
        field: baseField,
        filterField: `${baseField}.label`,
        fieldType: 'lenum',
        language: locale,
      };
    case 'enum':
      return {
        name: attribute.name,
        label,
        field: `${baseField}.label`,
        filterField: `${baseField}.label`,
        fieldType: 'enum',
      };
    case 'set_text':
      return {
        name: attribute.name,
        label,
        field: baseField,
        filterField: baseField,
        fieldType: 'set_text',
      };
    case 'set_ltext':
      return {
        name: attribute.name,
        label,
        field: baseField,
        filterField: baseField,
        fieldType: 'set_ltext',
        language: locale,
      };
    case 'set_number':
      return {
        name: attribute.name,
        label,
        field: baseField,
        filterField: baseField,
        fieldType: 'set_number',
      };
    case 'set_lenum':
      return {
        name: attribute.name,
        label,
        field: baseField,
        filterField: `${baseField}.label`,
        fieldType: 'set_lenum',
        language: locale,
      };
    default:
      return null;
  }
}

function shouldIncludeSearchableAttribute(
  name: string,
  searchableNames: Set<string>,
): boolean {
  if (name.endsWith('-code')) {
    return false;
  }

  if (name.startsWith('search-')) {
    const stem = name.slice('search-'.length);

    if (searchableNames.has(`${stem}-label`)) {
      return false;
    }
  }

  return true;
}

export function collectSearchableAttributeFacetConfigs(
  productTypes: Array<Pick<ProductType, 'id' | 'attributes'>>,
  locale: string = CATALOG_LOCALE,
): SearchableAttributeFacetConfig[] {
  const searchableNames = new Set<string>();

  for (const productType of productTypes) {
    for (const attribute of productType.attributes ?? []) {
      if (attribute.isSearchable) {
        searchableNames.add(attribute.name);
      }
    }
  }

  const configsByName = new Map<string, SearchableAttributeFacetConfig>();

  for (const productType of productTypes) {
    for (const attribute of productType.attributes ?? []) {
      if (!shouldIncludeSearchableAttribute(attribute.name, searchableNames)) {
        continue;
      }

      const config = buildConfigForAttribute(attribute, locale);

      if (!config || configsByName.has(config.name)) {
        continue;
      }

      configsByName.set(config.name, config);
    }
  }

  return [...configsByName.values()].sort((left, right) =>
    left.label.localeCompare(right.label, locale),
  );
}
