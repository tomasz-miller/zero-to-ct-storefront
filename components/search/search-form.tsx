'use client';

import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';

type SearchFormProps = {
  defaultQuery?: string;
};

export function SearchForm({ defaultQuery = '' }: SearchFormProps) {
  return (
    <form action="/search" method="get" className="flex w-full max-w-xl gap-2">
      <InputGroup className="flex-1">
        <InputGroupInput
          name="q"
          type="search"
          placeholder="Search products..."
          defaultValue={defaultQuery}
          aria-label="Search products"
        />
        <InputGroupAddon align="inline-end">
          <Search aria-hidden="true" />
        </InputGroupAddon>
      </InputGroup>
      <Button type="submit">Search</Button>
    </form>
  );
}
