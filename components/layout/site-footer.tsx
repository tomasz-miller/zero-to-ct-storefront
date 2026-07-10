import Link from 'next/link';

import { StoreBrand } from '@/components/layout/store-brand';
import { getStoreBrandConfig } from '@/lib/store-brand';
import { cn } from '@/lib/utils';

type FooterLinkGroupProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

function FooterLinkGroup({ title, children, className }: FooterLinkGroupProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <h2 className="text-xs font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <ul className="flex flex-col gap-1">{children}</ul>
    </div>
  );
}

type FooterLinkProps = {
  href: string;
  children: React.ReactNode;
  external?: boolean;
};

function FooterText({ children }: { children: React.ReactNode }) {
  return (
    <li>
      <span className="text-xs leading-snug text-muted-foreground">
        {children}
      </span>
    </li>
  );
}

function FooterLink({ href, children, external }: FooterLinkProps) {
  return (
    <li>
      <Link
        href={href}
        className="text-xs leading-snug text-muted-foreground transition-colors hover:text-foreground"
        {...(external
          ? { target: '_blank', rel: 'noopener noreferrer' }
          : undefined)}
      >
        {children}
      </Link>
    </li>
  );
}

const shopLinks = [
  { href: '/', label: 'Home' },
  { href: '/search', label: 'Search products' },
  { href: '/cart', label: 'Shopping cart' },
] as const;

export function SiteFooter() {
  const { name } = getStoreBrandConfig();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border/70 bg-muted/35">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-7">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-12 lg:gap-5">
          <div className="flex flex-col gap-2 lg:col-span-5">
            <StoreBrand minimal />
            <p className="max-w-sm text-xs leading-snug text-muted-foreground">
              Demo B2C storefront on commercetools. Catalog, cart, and EUR
              checkout with Stripe.
            </p>
          </div>

          <div className="grid gap-5 sm:col-span-1 sm:grid-cols-2 lg:col-span-7 lg:grid-cols-3 lg:gap-4">
            <FooterLinkGroup title="Shop">
              {shopLinks.map((link) => (
                <FooterLink key={link.href} href={link.href}>
                  {link.label}
                </FooterLink>
              ))}
            </FooterLinkGroup>

            <FooterLinkGroup title="Customer care">
              <FooterLink href="mailto:support@zero-to-ct-storefront.demo" external>
                Contact support
              </FooterLink>
              <FooterText>Shipping to Germany (EUR)</FooterText>
              <FooterText>30-day returns on eligible items</FooterText>
            </FooterLinkGroup>

            <FooterLinkGroup title="Legal">
              <FooterText>Privacy Policy</FooterText>
              <FooterText>Terms of Service</FooterText>
              <FooterText>Cookie Settings</FooterText>
              <FooterText>Legal notice (Imprint)</FooterText>
            </FooterLinkGroup>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 border-t border-border/60 pt-4 text-[11px] leading-snug text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {name}. All rights reserved. Demo storefront for evaluation
            only.
          </p>
          <p>
            Built with{' '}
            <Link
              href="https://commercetools.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground/75 transition-colors hover:text-foreground"
            >
              commercetools
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
