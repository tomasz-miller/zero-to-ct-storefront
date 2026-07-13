import { Suspense } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';

import './globals.css';
import { AuthProvider } from '@/components/auth/auth-context';
import { LoginDialog } from '@/components/auth/login-dialog';
import { CartProvider } from '@/components/cart/cart-context';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { ThemeProvider } from '@/components/theme-provider';
import { getNavigationCategories } from '@/lib/commercetools/categories';
import { getStoreBrandConfig } from '@/lib/store-brand';
import { cn } from '@/lib/utils';

const { name: storeName } = getStoreBrandConfig();

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata = {
  title: storeName,
  description:
    'Minimal B2C storefront on commercetools — built with Next.js, coss ui, and the TypeScript SDK.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let categories: Awaited<ReturnType<typeof getNavigationCategories>> = [];

  try {
    categories = await getNavigationCategories();
  } catch (error) {
    console.error('[layout] Failed to load navigation categories', error);
  }

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn('antialiased', fontMono.variable, 'font-sans', geist.variable)}
    >
      <body>
        <ThemeProvider>
          <Suspense fallback={null}>
            <AuthProvider>
              <CartProvider>
                <div className="flex min-h-svh flex-col bg-background">
                  <SiteHeader categories={categories} />
                  {children}
                  <SiteFooter />
                </div>
                <LoginDialog />
              </CartProvider>
            </AuthProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
