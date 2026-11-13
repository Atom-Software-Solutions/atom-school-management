import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paymentMethodLabelForCsv } from './billing.constants';
import { isOverdue } from './invoice-generation.logic';
import { buildStatement, toCsv } from './statement.logic';

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);
const ZERO = D(0);
const BILLED_STATUSES = ['ISSUED', 'PARTIALLY_PAID', 'PAID'] as const;
const EXPORT_LIMIT = 20_000;

export interface ReportScope {
  academicYearId?: string;
  termId?: string;
}

@Injectable()
export class BillingReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Billing totals for issued (non-draft, non-cancelled) invoices in scope.
   * Collected = Σ amount_paid, which equals Σ completed payments on those invoices.
   */
  async summary(schoolId: string, scope: ReportScope) {
    const where = this.billedWhere(schoolId, scope);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const inTwoWeeks = new Date(startOfToday.getTime() + 15 * 86_400_000);
    const openWhere: Prisma.InvoiceWhereInput = { ...where, status: { in: ['ISSUED', 'PARTIALLY_PAID'] } };

    const [billed, byStatus, overdue, upcoming, drafts, school] = await Promise.all([
      this.prisma.invoice.aggregate({ where, _sum: { total_amount: true, amount_paid: true, waived_total: true }, _count: true }),
      this.prisma.invoice.groupBy({ by: ['status'], where, _count: true }),
      this.prisma.invoice.aggregate({
        where: { ...openWhere, due_date: { lt: startOfToday } },
        _sum: { total_amount: true, amount_paid: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { ...openWhere, due_date: { gte: startOfToday, lt: inTwoWeeks } },
        _sum: { total_amount: true, amount_paid: true },
        _count: true,
      }),
      this.prisma.invoice.count({ where: { ...this.scopeWhere(schoolId, scope), status: 'DRAFT' } }),
      this.prisma.school.findUnique({ where: { id: schoolId }, select: { currency: true } }),
    ]);

    const total = billed._sum.total_amount ?? ZERO;
    const collected = billed._sum.amount_paid ?? ZERO;
    const outstanding = total.minus(collected);
    const sumBalance = (a: { _sum: { total_amount: Prisma.Decimal | null; amount_paid: Prisma.Decimal | null } }) =>
      (a._sum.total_amount ?? ZERO).minus(a._sum.amount_paid ?? ZERO).toFixed(2);

    return {
      currency: school?.currency ?? 'UGX',
      invoice_count: billed._count,
      draft_count: drafts,
      billed: total.toFixed(2),
      waived: (billed._sum.waived_total ?? ZERO).toFixed(2),
      collected: collected.toFixed(2),
      outstanding: outstanding.toFixed(2),
      collection_rate: total.gt(0) ? collected.div(total).times(100).toDecimalPlaces(1).toNumber() : null,
      overdue: { count: overdue._count, amount: sumBalance(overdue) },
      due_next_14_days: { count: upcoming._count, amount: sumBalance(upcoming) },
      by_status: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
    };
  }

  /** Totals per class (class = the student's enrollment in the invoice's academic year). */
  async byClass(schoolId: string, scope: ReportScope) {
    if (!scope.academicYearId) throw new BadRequestException('academicYearId is required for the per-class report');
    const invoices = await this.prisma.invoice.findMany({
      where: this.billedWhere(schoolId, scope),
      select: { student_id: true, total_amount: true, amount_paid: true, status: true, due_date: true },
    });
    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: { academic_year_id: scope.academicYearId, deleted_at: null, student_id: { in: [...new Set(invoices.map((i) => i.student_id))] } },
      orderBy: { start_date: 'asc' },
      select: { student_id: true, classroom_definition: { select: { id: true, name: true, ordinal: true } } },
    });
    const classOf = new Map(enrollments.map((e) => [e.student_id, e.classroom_definition]));

    type Row = { id: string | null; name: string; ordinal: number; students: Set<string>; invoices: number; billed: Prisma.Decimal; collected: Prisma.Decimal; overdue: number };
    const rows = new Map<string, Row>();
    const now = new Date();
    for (const inv of invoices) {
      const c = classOf.get(inv.student_id);
      const key = c?.id ?? 'none';
      const row = rows.get(key) ?? { id: c?.id ?? null, name: c?.name ?? 'No class', ordinal: c?.ordinal ?? 9999, students: new Set(), invoices: 0, billed: ZERO, collected: ZERO, overdue: 0 };
      row.students.add(inv.student_id);
      row.invoices++;
      row.billed = row.billed.plus(inv.total_amount);
      row.collected = row.collected.plus(inv.amount_paid);
      if (isOverdue(inv, now)) row.overdue++;
      rows.set(key, row);
    }

    return [...rows.values()]
      .sort((a, b) => a.ordinal - b.ordinal || a.name.localeCompare(b.name))
      .map((r) => ({
        classroom_id: r.id,
        classroom_name: r.name,
        student_count: r.students.size,
        invoice_count: r.invoices,
        billed: r.billed.toFixed(2),
        collected: r.collected.toFixed(2),
        outstanding: r.billed.minus(r.collected).toFixed(2),
        collection_rate: r.billed.gt(0) ? r.collected.div(r.billed).times(100).toDecimalPlaces(1).toNumber() : null,
        overdue_count: r.overdue,
      }));
  }

  /** Chronological ledger for one student, optionally limited to an academic year. */
  async statement(schoolId: string, studentId: string, academicYearId?: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, school_id: schoolId },
      select: { id: true, first_name: true, last_name: true, student_no: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    const invoiceWhere: Prisma.InvoiceWhereInput = {
      school_id: schoolId,
      student_id: studentId,
      status: { not: 'DRAFT' },
      ...(academicYearId && { academic_year_id: academicYearId }),
    };
    const [invoices, payments, school] = await Promise.all([
      this.prisma.invoice.findMany({
        where: invoiceWhere,
        include: { academic_year: { select: { name: true } }, term_template_item: { select: { name: true } } },
        orderBy: { issue_date: 'asc' },
      }),
      this.prisma.payment.findMany({
        where: { school_id: schoolId, student_id: studentId, invoice: invoiceWhere },
        orderBy: { received_at: 'asc' },
      }),
      this.prisma.school.findUnique({ where: { id: schoolId }, select: { currency: true } }),
    ]);

    const { entries, totals } = buildStatement(
      invoices.map((i) => ({
        ...i,
        description: `${i.kind === 'ADHOC' ? 'Charge' : 'Fees'} · ${i.academic_year.name}${i.term_template_item ? ` ${i.term_template_item.name}` : ''}`,
      })),
      payments,
    );
    const now = new Date();
    return {
      student,
      currency: school?.currency ?? 'UGX',
      entries: entries.map((e) => ({ ...e, debit: e.debit.toFixed(2), credit: e.credit.toFixed(2), balance: e.balance.toFixed(2) })),
      totals: { charged: totals.debit.toFixed(2), credited: totals.credit.toFixed(2), balance: totals.balance.toFixed(2) },
      open_invoices: invoices
        .filter((i) => i.status === 'ISSUED' || i.status === 'PARTIALLY_PAID')
        .map((i) => ({
          id: i.id,
          invoice_number: i.invoice_number,
          due_date: i.due_date,
          total_amount: i.total_amount.toFixed(2),
          balance: i.total_amount.minus(i.amount_paid).toFixed(2),
          is_overdue: isOverdue(i, now),
        })),
    };
  }

  async invoicesCsv(schoolId: string, scope: ReportScope & { status?: string }) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        ...this.scopeWhere(schoolId, scope),
        ...(scope.status ? { status: scope.status as never } : { status: { not: 'DRAFT' } }),
      },
      include: {
        student: { select: { first_name: true, last_name: true, student_no: true } },
        academic_year: { select: { name: true } },
        term_template_item: { select: { name: true } },
      },
      orderBy: [{ issue_date: 'asc' }, { invoice_number: 'asc' }],
      take: EXPORT_LIMIT,
    });
    const classOf = await this.classMap(invoices);
    const now = new Date();
    return toCsv(
      ['Invoice number', 'Status', 'Overdue', 'Student no', 'Student', 'Class', 'Academic year', 'Term', 'Issue date', 'Due date', 'Currency', 'Total', 'Paid', 'Balance'],
      invoices.map((i) => [
        i.invoice_number ?? 'DRAFT',
        i.status,
        isOverdue(i, now) ? 'Yes' : 'No',
        i.student.student_no,
        `${i.student.first_name} ${i.student.last_name}`,
        classOf.get(`${i.student_id}|${i.academic_year_id}`) ?? '',
        i.academic_year.name,
        i.term_template_item?.name ?? '',
        isoDate(i.issue_date),
        isoDate(i.due_date),
        i.currency,
        i.total_amount.toFixed(2),
        i.amount_paid.toFixed(2),
        i.total_amount.minus(i.amount_paid).toFixed(2),
      ]),
    );
  }

  async paymentsCsv(schoolId: string, range: { from?: string; to?: string }) {
    const to = range.to ? new Date(new Date(range.to).setHours(23, 59, 59, 999)) : undefined;
    const payments = await this.prisma.payment.findMany({
      where: {
        school_id: schoolId,
        invoice_id: { not: null },
        ...((range.from || to) && { received_at: { ...(range.from && { gte: new Date(range.from) }), ...(to && { lte: to }) } }),
      },
      include: {
        student: { select: { first_name: true, last_name: true, student_no: true } },
        invoice: { select: { invoice_number: true } },
      },
      orderBy: [{ received_at: 'asc' }, { created_at: 'asc' }],
      take: EXPORT_LIMIT,
    });
    return toCsv(
      ['Receipt number', 'Date received', 'Status', 'Method', 'Reference', 'Student no', 'Student', 'Paid by', 'Invoice number', 'Currency', 'Amount', 'Reversed at', 'Reversal reason'],
      payments.map((p) => [
        p.receipt_number,
        isoDate(p.received_at),
        p.status,
        paymentMethodLabelForCsv(p.payment_method),
        p.reference,
        p.student?.student_no,
        p.student ? `${p.student.first_name} ${p.student.last_name}` : '',
        p.payer_name,
        p.invoice?.invoice_number,
        p.currency,
        p.amount.toFixed(2),
        isoDate(p.reversed_at),
        p.reversal_reason,
      ]),
    );
  }

  // ---------------------------------------------------------------------------

  private scopeWhere(schoolId: string, scope: ReportScope): Prisma.InvoiceWhereInput {
    return {
      school_id: schoolId,
      ...(scope.academicYearId && { academic_year_id: scope.academicYearId }),
      ...(scope.termId && { term_template_item_id: scope.termId }),
    };
  }

  private billedWhere(schoolId: string, scope: ReportScope): Prisma.InvoiceWhereInput {
    return { ...this.scopeWhere(schoolId, scope), status: { in: [...BILLED_STATUSES] } };
  }

  private async classMap(rows: Array<{ student_id: string; academic_year_id: string }>) {
    const map = new Map<string, string>();
    if (!rows.length) return map;
    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        student_id: { in: [...new Set(rows.map((r) => r.student_id))] },
        academic_year_id: { in: [...new Set(rows.map((r) => r.academic_year_id))] },
        deleted_at: null,
      },
      orderBy: { start_date: 'asc' },
      select: { student_id: true, academic_year_id: true, classroom_definition: { select: { name: true } } },
    });
    for (const e of enrollments) map.set(`${e.student_id}|${e.academic_year_id}`, e.classroom_definition.name);
    return map;
  }
}

function isoDate(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : '';
}
