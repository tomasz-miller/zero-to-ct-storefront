import Link from 'next/link';

import {
  getStoreBrandConfig,
  splitStoreName,
} from '@/lib/store-brand';
import { cn } from '@/lib/utils';

type StoreBrandProps = {
  compact?: boolean;
  minimal?: boolean;
  /** Hide the wordmark below the `sm` breakpoint (header on phones). */
  hideTextBelowSm?: boolean;
  className?: string;
};

export function StoreBrand({
  compact = false,
  minimal = false,
  hideTextBelowSm = false,
  className,
}: StoreBrandProps) {
  const { name, emphasis } = getStoreBrandConfig();
  const parts = splitStoreName(name, emphasis);
  const monogram = emphasis.slice(0, 2).toUpperCase();
  const isCompact = compact || minimal;
  const showTagline = !isCompact;

  return (
    <Link
      href="/"
      aria-label={`${name} home`}
      className={cn(
        'group flex min-w-0 max-w-full items-center rounded-xl outline-none transition-[transform,opacity] duration-300 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        minimal ? 'gap-2' : 'gap-2 sm:gap-3',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary via-primary to-primary/85 text-primary-foreground shadow-sm ring-1 ring-primary/20 transition-[width,height,transform] duration-300 ease-out group-hover:scale-[1.03] group-active:scale-[0.98]',
          minimal ? 'size-7' : isCompact ? 'size-8' : 'size-9 sm:size-10',
        )}
      >
        <span
          className={cn(
            'absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.22),transparent_55%)]',
          )}
        />
        <span
          className={cn(
            'relative font-bold tracking-tighter',
            minimal ? 'text-[9px]' : isCompact ? 'text-[10px]' : 'text-xs',
          )}
        >
          {monogram}
        </span>
      </span>

      <span
        className={cn(
          'min-w-0 flex-col justify-center leading-none',
          hideTextBelowSm && !minimal ? 'hidden sm:flex' : 'flex',
          showTagline && 'md:min-w-max',
        )}
      >
        <span
          className={cn(
            'block truncate font-semibold tracking-tight text-foreground transition-[font-size] duration-300 ease-out',
            minimal ? 'text-xs' : isCompact ? 'text-sm' : 'text-sm md:text-base',
          )}
        >
          {parts.map((part, index) =>
            part.emphasized ? (
              <span
                key={`${part.text}-${index}`}
                className="bg-gradient-to-r from-primary via-primary to-primary/75 bg-clip-text font-bold text-transparent"
              >
                {part.text}
              </span>
            ) : (
              <span
                key={`${part.text}-${index}`}
                className="text-foreground/88"
              >
                {part.text}
              </span>
            ),
          )}
        </span>
        <span
          className={cn(
            'whitespace-nowrap text-muted-foreground transition-[max-height,opacity,margin] duration-300 ease-out',
            showTagline
              ? 'mt-0.5 text-[10px] font-medium tracking-normal uppercase opacity-100 md:mt-1 md:text-[11px] max-md:sr-only'
              : 'mt-0 max-h-0 overflow-hidden opacity-0',
          )}
        >
          Composable Commerce demo
        </span>
      </span>
    </Link>
  );
}
