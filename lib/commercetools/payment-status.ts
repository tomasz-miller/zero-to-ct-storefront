export type PaymentTransactionSnapshot = {
  type: string;
  state: string;
  centAmount: number;
  timestamp?: string;
};

export type DerivedPaymentStatus =
  | 'Paid'
  | 'Authorized'
  | 'Processing'
  | 'Failed'
  | 'Refunded'
  | 'Partially refunded'
  | 'Cancelled'
  | 'Unknown';

const PAYMENT_STATUS_SEVERITY: Record<DerivedPaymentStatus, number> = {
  Failed: 0,
  Processing: 1,
  Authorized: 2,
  Unknown: 3,
  'Partially refunded': 4,
  Cancelled: 5,
  Paid: 6,
  Refunded: 7,
};

const PAYMENT_STATE_MAP: Record<string, DerivedPaymentStatus> = {
  Paid: 'Paid',
  Failed: 'Failed',
  Pending: 'Processing',
  BalanceDue: 'Unknown',
  CreditOwed: 'Refunded',
};

const PAYMENT_PROVIDER_LABELS: Record<string, string> = {
  'checkout-stripe': 'Card via Stripe',
};

function successfulAmount(
  transactions: PaymentTransactionSnapshot[],
  type: string,
): number {
  return transactions
    .filter(
      (transaction) =>
        transaction.type === type && transaction.state === 'Success',
    )
    .reduce((total, transaction) => total + transaction.centAmount, 0);
}

function latestTransactionOfType(
  transactions: PaymentTransactionSnapshot[],
  type: string,
): PaymentTransactionSnapshot | undefined {
  const matching = transactions.filter(
    (transaction) => transaction.type === type,
  );

  if (matching.length === 0) {
    return undefined;
  }

  const hasTimestamps = matching.every((transaction) => transaction.timestamp);

  if (hasTimestamps) {
    return [...matching].sort((left, right) =>
      (right.timestamp ?? '').localeCompare(left.timestamp ?? ''),
    )[0];
  }

  return matching[matching.length - 1];
}

export function mapPaymentStateFallback(
  paymentState?: string,
): DerivedPaymentStatus {
  if (!paymentState) {
    return 'Unknown';
  }

  return PAYMENT_STATE_MAP[paymentState] ?? 'Unknown';
}

export function formatPaymentProvider(paymentInterface?: string): string {
  if (!paymentInterface) {
    return '—';
  }

  return PAYMENT_PROVIDER_LABELS[paymentInterface] ?? paymentInterface;
}

export function pickWorstPaymentStatus(
  statuses: DerivedPaymentStatus[],
): DerivedPaymentStatus {
  if (statuses.length === 0) {
    return 'Unknown';
  }

  return statuses.reduce((worst, current) =>
    PAYMENT_STATUS_SEVERITY[current] < PAYMENT_STATUS_SEVERITY[worst]
      ? current
      : worst,
  );
}

export function derivePaymentStatusFromTransactions(
  transactions: PaymentTransactionSnapshot[],
): DerivedPaymentStatus {
  const chargedAmount = successfulAmount(transactions, 'Charge');
  const refundedAmount = successfulAmount(transactions, 'Refund');

  if (chargedAmount > 0 && refundedAmount >= chargedAmount) {
    return 'Refunded';
  }

  if (refundedAmount > 0) {
    return 'Partially refunded';
  }

  if (chargedAmount > 0) {
    return 'Paid';
  }

  const latestCancel = latestTransactionOfType(
    transactions,
    'CancelAuthorization',
  );

  if (latestCancel?.state === 'Success') {
    return 'Cancelled';
  }

  const latestCharge = latestTransactionOfType(transactions, 'Charge');
  const latestAuth = latestTransactionOfType(transactions, 'Authorization');

  if (latestCharge?.state === 'Failure' || latestAuth?.state === 'Failure') {
    return 'Failed';
  }

  if (
    latestAuth &&
    (latestAuth.state === 'Initial' || latestAuth.state === 'Pending')
  ) {
    return 'Processing';
  }

  if (latestAuth?.state === 'Success') {
    return 'Authorized';
  }

  return 'Unknown';
}

export function deriveOrderPaymentStatus(
  payments: Array<{ transactions: PaymentTransactionSnapshot[] }>,
  fallbackPaymentState?: string,
): DerivedPaymentStatus {
  const paymentsWithTransactions = payments.filter(
    (payment) => payment.transactions.length > 0,
  );

  if (paymentsWithTransactions.length === 0) {
    return mapPaymentStateFallback(fallbackPaymentState);
  }

  return pickWorstPaymentStatus(
    paymentsWithTransactions.map((payment) =>
      derivePaymentStatusFromTransactions(payment.transactions),
    ),
  );
}
