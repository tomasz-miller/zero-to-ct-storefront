'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Autocomplete,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopup,
  AutocompleteStatus,
} from '@/components/ui/autocomplete';

type SearchFormProps = {
  defaultQuery?: string;
};

type SearchSuggestionItem = {
  label: string;
  value: string;
};

const SUGGESTION_DEBOUNCE_MS = 300;
const MIN_SUGGESTION_LENGTH = 2;

export function SearchForm({ defaultQuery = '' }: SearchFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery);
  const [items, setItems] = useState<SearchSuggestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const trimmedQuery = query.trim();
  const shouldFetchSuggestions = trimmedQuery.length >= MIN_SUGGESTION_LENGTH;
  const suggestionItems = shouldFetchSuggestions ? items : [];

  useEffect(() => {
    if (!shouldFetchSuggestions) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);

      try {
        const response = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(trimmedQuery)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          setItems([]);
          return;
        }

        const body = (await response.json()) as { suggestions?: string[] };
        setItems(
          (body.suggestions ?? []).map((suggestion) => ({
            label: suggestion,
            value: suggestion,
          })),
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setItems([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, SUGGESTION_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [shouldFetchSuggestions, trimmedQuery]);

  function navigateToSearch(value: string) {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return;
    }

    router.push(`/search?q=${encodeURIComponent(trimmedValue)}`);
  }

  return (
    <form
      className="flex w-full max-w-xl gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        navigateToSearch(query);
      }}
    >
      <div className="flex-1">
        <Autocomplete
          items={suggestionItems}
          mode="none"
          submitOnItemClick
          value={query}
          onValueChange={setQuery}
        >
        <AutocompleteInput
          aria-label="Search products"
          name="q"
          placeholder="Search products..."
          showClear
          startAddon={<Search aria-hidden="true" />}
          type="search"
        />
        <AutocompletePopup>
          <AutocompleteStatus>
            {loading && shouldFetchSuggestions ? 'Searching suggestions…' : null}
          </AutocompleteStatus>
          <AutocompleteEmpty>No suggestions found.</AutocompleteEmpty>
          <AutocompleteList>
            {(item) => (
              <AutocompleteItem key={item.value} value={item}>
                {item.label}
              </AutocompleteItem>
            )}
          </AutocompleteList>
        </AutocompletePopup>
        </Autocomplete>
      </div>
      <Button type="submit">Search</Button>
    </form>
  );
}
