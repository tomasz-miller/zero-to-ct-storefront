import Link from 'next/link';

import {
  getStoreBrandConfig,
  splitStoreName,
} from '@/lib/store-brand';
import { cn } from '@/lib/utils';

type StoreBrandProps = {
  compact?: boolean;
  minimal?: boolean;
  className?: string;
};

export function StoreBrand({
  compact = false,
  minimal = false,
  className,
}: StoreBrandProps) {
  const { name, emphasis } = getStoreBrandConfig();
  const parts = splitStoreName(name, emphasis);
  const monogram = emphasis.slice(0, 2).toUpperCase();
  const isCompact = compact || minimal;

  return (
    <Link
      href="/"
      aria-label={`${name} home`}
      className={cn(
        'group flex min-w-0 items-center rounded-xl outline-none transition-[transform,opacity] duration-300 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        minimal ? 'gap-2' : 'gap-3',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary via-primary to-primary/85 text-primary-foreground shadow-sm ring-1 ring-primary/20 transition-[width,height,transform] duration-300 ease-out group-hover:scale-[1.03] group-active:scale-[0.98]',
          minimal ? 'size-7' : isCompact ? 'size-8' : 'size-10',
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

      <span className="flex min-w-0 flex-col justify-center leading-none">
        <span
          className={cn(
            'flex flex-wrap items-baseline gap-x-0.5 font-semibold tracking-tight text-foreground transition-[font-size] duration-300 ease-out',
            minimal ? 'text-xs' : isCompact ? 'text-sm' : 'text-base sm:text-[1.05rem]',
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
            'overflow-hidden text-muted-foreground transition-[max-height,opacity,margin] duration-300 ease-out',
            compact || minimal
              ? 'mt-0 max-h-0 opacity-0'
              : 'mt-1 max-h-4 text-[11px] font-medium tracking-wide uppercase opacity-100',
          )}
        >
          Composable Commerce demo
        </span>
      </span>
    </Link>
  );
}
