import { Prisma } from '@prisma/client';
import { buildStatement, StatementInvoice, StatementPayment, toCsv } from './statement.logic';

const D = (v: string | number) => new Prisma.Decimal(v);
const day = (n: number) => new Date(2026, 0, n);

const inv = (o: Partial<StatementInvoice>): StatementInvoice => ({
  id: 'i1', invoice_number: 'X-INV-2026-000001', issue_date: day(1), total_amount: D(500), status: 'ISSUED',
  cancelled_at: null, description: 'Term 1', ...o,
});
const pay = (o: Partial<StatementPayment>): StatementPayment => ({
  id: 'p1', invoice_id: 'i1', receipt_number: 'R1', amount: D(200), status: 'COMPLETED', received_at: day(5),
  created_at: day(5), reversed_at: null, payment_method: 'CASH', ...o,
});

describe('buildStatement', () => {
  it('runs a balance across invoices and payments', () => {
    const s = buildStatement([inv({}), inv({ id: 'i2', issue_date: day(10), total_amount: D(300) })], [pay({}), pay({ id: 'p2', amount: D(300), received_at: day(12) })]);
    expect(s.entries.map((e) => e.balance.toFixed(0))).toEqual(['500', '300', '600', '300']);
    expect(s.totals.balance.toFixed(2)).toBe('300.00');
  });

  it('excludes drafts', () => {
    expect(buildStatement([inv({ status: 'DRAFT', issue_date: null })], []).entries).toHaveLength(0);
  });

  it('nets out cancelled invoices and reversed payments', () => {
    const s = buildStatement(
      [inv({ status: 'CANCELLED', cancelled_at: day(3) }), inv({ id: 'i2', issue_date: day(4), total_amount: D(400) })],
      [pay({ id: 'p9', invoice_id: 'i2', amount: D(150), received_at: day(6), status: 'REVERSED', reversed_at: day(7) })],
    );
    expect(s.entries.map((e) => e.type)).toEqual(['INVOICE', 'INVOICE_CANCELLATION', 'INVOICE', 'PAYMENT', 'PAYMENT_REVERSAL']);
    // Reconciles with Σ open invoice totals − Σ completed payments = 400 − 0
    expect(s.totals.balance.toFixed(2)).toBe('400.00');
  });

  it('orders a same-day charge before its payment', () => {
    const s = buildStatement([inv({ issue_date: day(5) })], [pay({ received_at: day(5) })]);
    expect(s.entries[0].type).toBe('INVOICE');
  });
});

describe('toCsv', () => {
  it('escapes quotes, commas and newlines and adds a BOM', () => {
    const csv = toCsv(['a', 'b'], [['x,y', 'say "hi"'], ['line\nbreak', null]]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"x,y","say ""hi"""');
    expect(csv).toContain('"line\nbreak",');
  });

  it('neutralises formula injection but keeps negative numbers', () => {
    const csv = toCsv(['v'], [['=HYPERLINK("x")'], ['-150.00'], ['@cmd']]);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain('\r\n-150.00\r\n');
    expect(csv).toContain("'@cmd");
  });
});
