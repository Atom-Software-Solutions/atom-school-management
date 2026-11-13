import { Prisma } from '@prisma/client';
import {
  computeTotals,
  formatDocumentNumber,
  GenStructure,
  GenStudentContext,
  isOverdue,
  resolveDueDate,
  selectLines,
} from './invoice-generation.logic';

const D = (v: string | number) => new Prisma.Decimal(v);

const s = (over: Partial<GenStructure>): GenStructure => ({
  id: 's',
  name: 'Fee',
  fee_category_id: 'cat',
  term_template_item_id: 'T1',
  classroom_definition_id: null,
  amount: D('100000'),
  due_date: null,
  frequency: 'PER_TERM',
  is_mandatory: true,
  ...over,
});

const ctx = (over: Partial<GenStudentContext> = {}): GenStudentContext => ({
  studentId: 'stu',
  classroomId: 'P5',
  assignments: [],
  alreadyBilledStructureIds: new Set(),
  ...over,
});

describe('selectLines', () => {
  it('includes mandatory school-wide and matching-class fees for the term', () => {
    const lines = selectLines('T1', [
      s({ id: 'a' }),
      s({ id: 'b', classroom_definition_id: 'P5' }),
      s({ id: 'c', classroom_definition_id: 'P6' }),
      s({ id: 'd', term_template_item_id: 'T2' }),
    ], ctx());
    expect(lines.map((l) => l.fee_structure_id)).toEqual(['a', 'b']);
  });

  it('includes optional fees only with an assignment, applying override and waiver', () => {
    const lines = selectLines('T1', [
      s({ id: 'bus', is_mandatory: false, amount: D('80000') }),
      s({ id: 'lunch', is_mandatory: false }),
    ], ctx({ assignments: [{ fee_structure_id: 'bus', amount_override: D('60000'), waived_amount: D('10000') }] }));
    expect(lines).toHaveLength(1);
    expect(lines[0].unit_amount.toFixed(2)).toBe('60000.00');
    expect(lines[0].line_total.toFixed(2)).toBe('50000.00');
  });

  it('caps a waiver at the line amount', () => {
    const [line] = selectLines('T1', [s({ id: 'x', amount: D('5000') })],
      ctx({ assignments: [{ fee_structure_id: 'x', amount_override: null, waived_amount: D('9000') }] }));
    expect(line.waived_amount.toFixed(2)).toBe('5000.00');
    expect(line.line_total.toFixed(2)).toBe('0.00');
  });

  it('bills year-level fees once per student', () => {
    const yearly = s({ id: 'y', term_template_item_id: null, frequency: 'PER_YEAR' });
    expect(selectLines('T1', [yearly], ctx())).toHaveLength(1);
    expect(selectLines('T2', [yearly], ctx({ alreadyBilledStructureIds: new Set(['y']) }))).toHaveLength(0);
  });
});

describe('totals and dates', () => {
  it('computes exact decimal totals', () => {
    const t = computeTotals([
      { quantity: 1, unit_amount: D('0.10'), waived_amount: D('0') },
      { quantity: 2, unit_amount: D('0.20'), waived_amount: D('0.05') },
    ]);
    expect(t.subtotal.toFixed(2)).toBe('0.50');
    expect(t.waived_total.toFixed(2)).toBe('0.05');
    expect(t.total_amount.toFixed(2)).toBe('0.45');
  });

  it('picks the earliest line due date, else term start + grace', () => {
    const today = new Date('2026-01-01');
    expect(resolveDueDate([{ due_date: new Date('2026-03-01') }, { due_date: new Date('2026-02-01') }], null, today))
      .toEqual(new Date('2026-02-01'));
    expect(resolveDueDate([{ due_date: null }], new Date('2026-02-01'), today)).toEqual(new Date('2026-02-15'));
  });

  it('derives overdue only for unpaid issued invoices past due', () => {
    const now = new Date('2026-03-10T10:00:00');
    const base = { due_date: new Date('2026-03-01'), total_amount: D(100), amount_paid: D(0) };
    expect(isOverdue({ ...base, status: 'ISSUED' }, now)).toBe(true);
    expect(isOverdue({ ...base, status: 'DRAFT' }, now)).toBe(false);
    expect(isOverdue({ ...base, status: 'PARTIALLY_PAID', amount_paid: D(100) }, now)).toBe(false);
    expect(isOverdue({ ...base, status: 'ISSUED', due_date: new Date('2026-03-10T00:00:00') }, now)).toBe(false);
  });

  it('formats document numbers', () => {
    expect(formatDocumentNumber('abc', 'INV', 2026, 42)).toBe('ABC-INV-2026-000042');
  });
});
