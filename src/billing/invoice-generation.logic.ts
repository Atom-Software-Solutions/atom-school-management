/**
 * Pure invoice-generation logic (no Prisma I/O). Given a student's context and the fee
 * structures of an academic year, decides which lines go on the student's TERM invoice.
 */
import { Prisma } from '@prisma/client';

type Decimal = Prisma.Decimal;
const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);
const ZERO = D(0);

export interface GenStructure {
  id: string;
  name: string;
  fee_category_id: string;
  term_template_item_id: string | null;
  classroom_definition_id: string | null;
  amount: Decimal;
  due_date: Date | null;
  frequency: 'ONCE' | 'PER_TERM' | 'PER_YEAR';
  is_mandatory: boolean;
}

export interface GenAssignment {
  fee_structure_id: string;
  amount_override: Decimal | null;
  waived_amount: Decimal;
}

export interface GenStudentContext {
  studentId: string;
  classroomId: string | null;
  /** Active assignments of this student (any structure). */
  assignments: GenAssignment[];
  /** Year-level / one-off structures already billed to this student on a non-cancelled invoice. */
  alreadyBilledStructureIds: Set<string>;
}

export interface GenLine {
  fee_structure_id: string;
  fee_category_id: string;
  description: string;
  quantity: number;
  unit_amount: Decimal;
  waived_amount: Decimal;
  line_total: Decimal;
  sort_order: number;
  due_date: Date | null;
}

export interface GenTotals {
  subtotal: Decimal;
  waived_total: Decimal;
  total_amount: Decimal;
}

/**
 * Line selection rules:
 *  - Term-specific structures apply when their term equals the invoice term.
 *  - Year-level structures (no term) apply on the first invoice of the year that includes them,
 *    i.e. when not already billed to the student.
 *  - Mandatory structures apply when the class is null (school-wide) or matches the student's class.
 *  - Optional structures apply only when the student has an active assignment (class not re-checked:
 *    the assignment is an explicit decision).
 *  - Assignment overrides and waivers are applied; waivers are capped at the line amount.
 */
export function selectLines(termId: string | null, structures: GenStructure[], ctx: GenStudentContext): GenLine[] {
  const assignmentByStructure = new Map(ctx.assignments.map((a) => [a.fee_structure_id, a]));
  const lines: GenLine[] = [];

  for (const s of structures) {
    const termMatches = s.term_template_item_id
      ? s.term_template_item_id === termId
      : !ctx.alreadyBilledStructureIds.has(s.id);
    if (!termMatches) continue;

    const assignment = assignmentByStructure.get(s.id);
    if (s.is_mandatory) {
      if (s.classroom_definition_id && s.classroom_definition_id !== ctx.classroomId) continue;
    } else if (!assignment) {
      continue;
    }

    const unit = assignment?.amount_override ?? s.amount;
    if (unit.lte(ZERO)) continue;
    const waived = Prisma.Decimal.min(assignment?.waived_amount ?? ZERO, unit);

    lines.push({
      fee_structure_id: s.id,
      fee_category_id: s.fee_category_id,
      description: s.name,
      quantity: 1,
      unit_amount: unit,
      waived_amount: waived,
      line_total: unit.minus(waived),
      sort_order: lines.length,
      due_date: s.due_date,
    });
  }
  return lines;
}

export function computeTotals(lines: Array<Pick<GenLine, 'quantity' | 'unit_amount' | 'waived_amount'>>): GenTotals {
  let subtotal = ZERO;
  let waived = ZERO;
  for (const l of lines) {
    subtotal = subtotal.plus(l.unit_amount.times(l.quantity));
    waived = waived.plus(l.waived_amount);
  }
  return { subtotal, waived_total: waived, total_amount: subtotal.minus(waived) };
}

/** Earliest line due date, else term start + grace days, else today + grace days. */
export function resolveDueDate(
  lines: Array<{ due_date: Date | null }>,
  termStart: Date | null,
  today: Date,
  graceDays = 14,
): Date {
  const dated = lines.map((l) => l.due_date).filter((d): d is Date => !!d);
  if (dated.length) return new Date(Math.min(...dated.map((d) => d.getTime())));
  const base = termStart ?? today;
  return new Date(base.getTime() + graceDays * 86_400_000);
}

/** Overdue is derived, never stored. */
export function isOverdue(
  inv: { status: string; due_date: Date; total_amount: Decimal; amount_paid: Decimal },
  now: Date,
): boolean {
  if (inv.status !== 'ISSUED' && inv.status !== 'PARTIALLY_PAID') return false;
  if (!inv.total_amount.minus(inv.amount_paid).gt(ZERO)) return false;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return inv.due_date.getTime() < startOfToday.getTime();
}

export function formatDocumentNumber(schoolCode: string, prefix: 'INV' | 'RCT', year: number, value: number): string {
  return `${schoolCode.toUpperCase()}-${prefix}-${year}-${String(value).padStart(6, '0')}`;
}
