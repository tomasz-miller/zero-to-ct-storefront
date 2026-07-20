'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

type ReorderNoticeProps = {
  added: number;
  skipped: number;
};

export function ReorderNotice({ added, skipped }: ReorderNoticeProps) {
  const router = useRouter();

  if (skipped <= 0) {
    return null;
  }

  function dismiss() {
    router.replace('/cart');
  }

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
      role="status"
    >
      <p>
        Added {added} item{added === 1 ? '' : 's'} from your order.
        {skipped === 1
          ? ' 1 item was unavailable and skipped.'
          : ` ${skipped} items were unavailable and skipped.`}
      </p>
      <Button size="sm" variant="ghost" onClick={dismiss}>
        Dismiss
      </Button>
    </div>
  );
}
