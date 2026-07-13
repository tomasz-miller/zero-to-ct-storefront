'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

import type { StorefrontCategory } from '@/lib/commercetools/categories';
import { Button } from '@/components/ui/button';
import {
  Menu,
  MenuLinkItem,
  MenuPopup,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger,
} from '@/components/ui/menu';
import { cn } from '@/lib/utils';

type CategoryNavProps = {
  categories: StorefrontCategory[];
  compact?: boolean;
};

function CategoryMenuItem({ category }: { category: StorefrontCategory }) {
  if (category.children.length === 0) {
    return (
      <MenuLinkItem render={<Link href={`/category/${category.slug}`} />}>
        {category.name}
      </MenuLinkItem>
    );
  }

  return (
    <MenuSub>
      <MenuSubTrigger>{category.name}</MenuSubTrigger>
      <MenuSubPopup>
        <MenuLinkItem render={<Link href={`/category/${category.slug}`} />}>
          All {category.name}
        </MenuLinkItem>
        {category.children.map((child) => (
          <CategoryMenuItem key={child.id} category={child} />
        ))}
      </MenuSubPopup>
    </MenuSub>
  );
}

export function CategoryNav({ categories, compact = false }: CategoryNavProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <Menu>
      <MenuTrigger
        render={
          <Button
            aria-label="Browse categories"
            className="gap-1.5"
            size="sm"
            variant="ghost"
          >
            <span className={cn(compact ? 'sr-only' : 'hidden sm:inline')}>
              Categories
            </span>
            <span className={cn(compact ? 'inline sm:sr-only' : 'inline sm:hidden')}>
              Shop
            </span>
            <ChevronDown className="size-4 opacity-60" aria-hidden />
          </Button>
        }
      />
      <MenuPopup align="start">
        {categories.map((category) => (
          <CategoryMenuItem key={category.id} category={category} />
        ))}
      </MenuPopup>
    </Menu>
  );
}
