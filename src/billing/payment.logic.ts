/** Pure payment rules (no Prisma I/O). */
import { Prisma } from '@prisma/client';

type Decimal = Prisma.Decimal;
type PayableStatus = 'ISSUED' | 'PARTIALLY_PAID' | 'PAID';

/** Status implied by the amount paid. Only called for issued (non-draft, non-cancelled) invoices. */
export function statusForPaid(total: Decimal, paid: Decimal): PayableStatus {
  if (paid.lte(0)) return 'ISSUED';
  if (paid.gte(total)) return 'PAID';
  return 'PARTIALLY_PAID';
}

export type PaymentCheck = { ok: true } | { ok: false; code: string; message: string };

export function checkPayment(
  invoice: { status: string; total_amount: Decimal; amount_paid: Decimal },
  amount: Decimal,
  receivedAt: Date,
  now: Date,
): PaymentCheck {
  if (invoice.status !== 'ISSUED' && invoice.status !== 'PARTIALLY_PAID') {
    return {
      ok: false,
      code: 'INVOICE_NOT_PAYABLE',
      message: invoice.status === 'PAID' ? 'This invoice is already fully paid' : 'Payments can only be recorded on issued invoices',
    };
  }
  if (!amount.gt(0)) return { ok: false, code: 'INVALID_AMOUNT', message: 'Amount must be greater than zero' };
  const balance = invoice.total_amount.minus(invoice.amount_paid);
  if (amount.gt(balance)) {
    return {
      ok: false,
      code: 'PAYMENT_EXCEEDS_BALANCE',
      message: `Amount exceeds the outstanding balance of ${balance.toFixed(2)}`,
    };
  }
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  if (receivedAt.getTime() > endOfToday.getTime()) {
    return { ok: false, code: 'FUTURE_DATE', message: 'The received date cannot be in the future' };
  }
  return { ok: true };
}
