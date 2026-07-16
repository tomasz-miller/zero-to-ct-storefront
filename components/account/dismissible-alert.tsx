'use client';

import { XIcon } from 'lucide-react';
import { useEffect } from 'react';

import {
  Alert,
  AlertAction,
  AlertDescription,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type DismissibleAlertProps = {
  variant: 'error' | 'success' | 'warning';
  message: string;
  onDismiss: () => void;
  autoDismissMs?: number;
  className?: string;
};

export function DismissibleAlert({
  variant,
  message,
  onDismiss,
  autoDismissMs,
  className,
}: DismissibleAlertProps) {
  useEffect(() => {
    if (!autoDismissMs) {
      return undefined;
    }

    const timer = window.setTimeout(onDismiss, autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [autoDismissMs, message, onDismiss]);

  return (
    <Alert variant={variant} className={cn(className)}>
      <AlertDescription>{message}</AlertDescription>
      <AlertAction>
        <Button
          aria-label="Dismiss alert"
          size="icon-xs"
          type="button"
          variant="ghost"
          onClick={onDismiss}
        >
          <XIcon />
        </Button>
      </AlertAction>
    </Alert>
  );
}
