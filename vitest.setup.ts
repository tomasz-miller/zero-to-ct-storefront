import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

vi.mock('next/navigation', async (importOriginal) => ({
  // Real implementation: server modules call it to let Next.js control-flow errors through.
  unstable_rethrow: (await importOriginal<typeof import('next/navigation')>()).unstable_rethrow,
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

afterEach(() => {
  cleanup();
});
