import { Prisma } from '@prisma/client';
import { checkPayment, statusForPaid } from './payment.logic';

const D = (v: string | number) => new Prisma.Decimal(v);
const now = new Date('2026-03-10T10:00:00');
const inv = (status: string, total = '100000', paid = '0') => ({ status, total_amount: D(total), amount_paid: D(paid) });

describe('statusForPaid', () => {
  it('maps paid amounts to statuses', () => {
    expect(statusForPaid(D(100), D(0))).toBe('ISSUED');
    expect(statusForPaid(D(100), D('99.99'))).toBe('PARTIALLY_PAID');
    expect(statusForPaid(D(100), D(100))).toBe('PAID');
  });
});

describe('checkPayment', () => {
  it('accepts a partial and an exact full payment', () => {
    expect(checkPayment(inv('ISSUED'), D('40000'), now, now).ok).toBe(true);
    expect(checkPayment(inv('PARTIALLY_PAID', '100000', '40000'), D('60000'), now, now).ok).toBe(true);
  });

  it('rejects overpayment by even one cent', () => {
    const r = checkPayment(inv('PARTIALLY_PAID', '100000', '40000'), D('60000.01'), now, now);
    expect(r).toMatchObject({ ok: false, code: 'PAYMENT_EXCEEDS_BALANCE' });
  });

  it('rejects payments on drafts, cancelled and paid invoices', () => {
    for (const s of ['DRAFT', 'CANCELLED', 'PAID']) {
      expect(checkPayment(inv(s), D(1), now, now)).toMatchObject({ ok: false, code: 'INVOICE_NOT_PAYABLE' });
    }
  });

  it('allows back-dating and today, rejects tomorrow', () => {
    expect(checkPayment(inv('ISSUED'), D(1), new Date('2026-01-01'), now).ok).toBe(true);
    expect(checkPayment(inv('ISSUED'), D(1), new Date('2026-03-10T23:00:00'), now).ok).toBe(true);
    expect(checkPayment(inv('ISSUED'), D(1), new Date('2026-03-11T00:00:01'), now)).toMatchObject({ code: 'FUTURE_DATE' });
  });

  it('rejects zero', () => {
    expect(checkPayment(inv('ISSUED'), D(0), now, now)).toMatchObject({ code: 'INVALID_AMOUNT' });
  });
});
