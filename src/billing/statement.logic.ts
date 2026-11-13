/** Pure student-statement builder (no Prisma I/O). */
import { Prisma } from '@prisma/client';

type Decimal = Prisma.Decimal;
const ZERO = new Prisma.Decimal(0);

export interface StatementInvoice {
  id: string;
  invoice_number: string | null;
  issue_date: Date | null;
  total_amount: Decimal;
  status: string;
  cancelled_at: Date | null;
  description: string;
}
export interface StatementPayment {
  id: string;
  invoice_id: string | null;
  receipt_number: string | null;
  amount: Decimal;
  status: string;
  received_at: Date | null;
  created_at: Date;
  reversed_at: Date | null;
  payment_method: string;
}

export type StatementEntryType = 'INVOICE' | 'PAYMENT' | 'PAYMENT_REVERSAL' | 'INVOICE_CANCELLATION';

export interface StatementEntry {
  date: Date;
  type: StatementEntryType;
  reference: string;
  description: string;
  debit: Decimal;
  credit: Decimal;
  balance: Decimal;
  invoice_id: string | null;
  payment_id: string | null;
}

/** Ordering within the same timestamp: charges first, then credits. */
const ORDER: Record<StatementEntryType, number> = { INVOICE: 0, PAYMENT_REVERSAL: 1, PAYMENT: 2, INVOICE_CANCELLATION: 3 };

/**
 * Chronological ledger with a running balance (positive = student owes).
 * Drafts are excluded. A cancelled invoice appears as a charge plus a cancellation credit;
 * a reversed payment appears as a credit plus a reversal charge. The closing balance therefore
 * always equals Σ(open invoice totals) − Σ(completed payments on them).
 */
export function buildStatement(invoices: StatementInvoice[], payments: StatementPayment[]) {
  const raw: Omit<StatementEntry, 'balance'>[] = [];

  for (const inv of invoices) {
    if (inv.status === 'DRAFT' || !inv.issue_date) continue;
    const ref = inv.invoice_number ?? inv.id.slice(0, 8);
    raw.push({ date: inv.issue_date, type: 'INVOICE', reference: ref, description: inv.description, debit: inv.total_amount, credit: ZERO, invoice_id: inv.id, payment_id: null });
    if (inv.status === 'CANCELLED') {
      raw.push({ date: inv.cancelled_at ?? inv.issue_date, type: 'INVOICE_CANCELLATION', reference: ref, description: `Cancelled: ${inv.description}`, debit: ZERO, credit: inv.total_amount, invoice_id: inv.id, payment_id: null });
    }
  }

  for (const p of payments) {
    if (p.status !== 'COMPLETED' && p.status !== 'REVERSED') continue;
    const ref = p.receipt_number ?? p.id.slice(0, 8);
    const date = p.received_at ?? p.created_at;
    raw.push({ date, type: 'PAYMENT', reference: ref, description: `Payment (${p.payment_method.replace('_', ' ').toLowerCase()})`, debit: ZERO, credit: p.amount, invoice_id: p.invoice_id, payment_id: p.id });
    if (p.status === 'REVERSED') {
      raw.push({ date: p.reversed_at ?? date, type: 'PAYMENT_REVERSAL', reference: ref, description: 'Payment reversed', debit: p.amount, credit: ZERO, invoice_id: p.invoice_id, payment_id: p.id });
    }
  }

  raw.sort((a, b) => a.date.getTime() - b.date.getTime() || ORDER[a.type] - ORDER[b.type]);

  let balance = ZERO;
  let totalDebit = ZERO;
  let totalCredit = ZERO;
  const entries: StatementEntry[] = raw.map((e) => {
    balance = balance.plus(e.debit).minus(e.credit);
    totalDebit = totalDebit.plus(e.debit);
    totalCredit = totalCredit.plus(e.credit);
    return { ...e, balance };
  });
  return { entries, totals: { debit: totalDebit, credit: totalCredit, balance } };
}

/** RFC 4180 CSV with a BOM so Excel opens UTF-8 correctly. Formula-like cells are neutralised. */
export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  const cell = (v: string | number | null | undefined) => {
    let s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`; // CSV injection guard
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
