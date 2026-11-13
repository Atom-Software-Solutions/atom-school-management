import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Invoice, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CancelInvoiceDto,
  CreateAdhocInvoiceDto,
  GenerateInvoicesDto,
  InvoiceLineInputDto,
  ListInvoicesQueryDto,
  UpdateDraftInvoiceDto,
} from './dto/invoice.dto';
import { computeTotals, GenLine, GenTotals, isOverdue, resolveDueDate, selectLines } from './invoice-generation.logic';
import { NumberingService } from './numbering.service';

const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);
const STUDENT_SELECT = { id: true, first_name: true, last_name: true, student_no: true } as const;

export const InvoiceErrorCode = {
  NOT_EDITABLE: 'INVOICE_NOT_EDITABLE',
  NOT_ISSUABLE: 'INVOICE_NOT_ISSUABLE',
  NOT_CANCELLABLE: 'INVOICE_NOT_CANCELLABLE',
  DUPLICATE_TERM_INVOICE: 'DUPLICATE_TERM_INVOICE',
} as const;

export interface PlannedInvoice {
  student: { id: string; first_name: string; last_name: string; student_no: string };
  classroom: { id: string; name: string } | null;
  lines: GenLine[];
  totals: GenTotals;
  due_date: Date;
}
export interface SkippedStudent {
  student_id: string;
  name: string;
  student_no?: string;
  reason: string;
}

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly numbering: NumberingService,
  ) {}

  // ---------------------------------------------------------------------------
  // Generation
  // ---------------------------------------------------------------------------

  async preview(schoolId: string, dto: GenerateInvoicesDto) {
    const { planned, skipped, currency } = await this.buildPlan(schoolId, dto);
    const total = planned.reduce((sum, p) => sum.plus(p.totals.total_amount), D(0));
    return {
      currency,
      will_create: planned.map((p) => ({
        student: p.student,
        classroom: p.classroom,
        due_date: p.due_date,
        line_count: p.lines.length,
        lines: p.lines.map((l) => ({
          description: l.description,
          unit_amount: l.unit_amount.toFixed(2),
          waived_amount: l.waived_amount.toFixed(2),
          line_total: l.line_total.toFixed(2),
        })),
        total_amount: p.totals.total_amount.toFixed(2),
      })),
      will_skip: skipped,
      summary: { create_count: planned.length, skip_count: skipped.length, total_amount: total.toFixed(2) },
    };
  }

  /** Creates DRAFT invoices. Safe to repeat: existing term invoices are skipped. */
  async generate(schoolId: string, userId: string, dto: GenerateInvoicesDto) {
    const { planned, skipped, currency } = await this.buildPlan(schoolId, dto);

    const batch = await this.prisma.invoiceGenerationBatch.create({
      data: {
        school_id: schoolId,
        academic_year_id: dto.academic_year_id,
        term_template_item_id: dto.term_template_item_id,
        classroom_definition_id: dto.classroom_definition_id ?? null,
        requested_by_user_id: userId,
        status: 'RUNNING',
      },
    });

    let created = 0;
    for (const p of planned) {
      try {
        // A single nested create is atomic: invoice and lines are written together.
        await this.prisma.invoice.create({
          data: {
            school_id: schoolId,
            student_id: p.student.id,
            academic_year_id: dto.academic_year_id,
            term_template_item_id: dto.term_template_item_id,
            kind: 'TERM',
            currency,
            due_date: p.due_date,
            ...p.totals,
            generation_batch_id: batch.id,
            created_by_user_id: userId,
            line_items: {
              create: p.lines.map(({ due_date: _dueDate, ...l }) => l),
            },
          },
        });
        created++;
      } catch (e) {
        // A concurrent run created the invoice first: the partial unique index wins.
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          skipped.push({ ...this.skipOf(p.student), reason: 'An invoice already exists for this term' });
          continue;
        }
        this.logger.error(`Invoice generation failed for student ${p.student.id}`, e as Error);
        skipped.push({ ...this.skipOf(p.student), reason: 'Unexpected error, try again' });
      }
    }

    const finalBatch = await this.prisma.invoiceGenerationBatch.update({
      where: { id: batch.id },
      data: {
        status: 'COMPLETED',
        created_count: created,
        skipped_count: skipped.length,
        skipped_details: skipped as unknown as Prisma.InputJsonValue,
      },
    });
    return { batch: finalBatch, created_count: created, skipped };
  }

  async issueBatch(schoolId: string, userId: string, batchId: string) {
    const batch = await this.prisma.invoiceGenerationBatch.findFirst({ where: { id: batchId, school_id: schoolId } });
    if (!batch) throw new NotFoundException('Generation batch not found');
    const drafts = await this.prisma.invoice.findMany({
      where: { generation_batch_id: batchId, status: 'DRAFT' },
      select: { id: true },
    });
    const issued = await this.issueMany(schoolId, userId, drafts.map((d) => d.id));
    return { issued_count: issued };
  }

  /** Deletes the batch's remaining drafts; issued invoices are untouched. */
  async discardBatchDrafts(schoolId: string, batchId: string) {
    const batch = await this.prisma.invoiceGenerationBatch.findFirst({ where: { id: batchId, school_id: schoolId } });
    if (!batch) throw new NotFoundException('Generation batch not found');
    const res = await this.prisma.invoice.deleteMany({ where: { generation_batch_id: batchId, status: 'DRAFT' } });
    return { deleted_count: res.count };
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async issue(schoolId: string, userId: string, id: string) {
    const inv = await this.getRaw(schoolId, id);
    if (inv.status !== 'DRAFT') {
      throw new UnprocessableEntityException({ code: InvoiceErrorCode.NOT_ISSUABLE, message: 'Only draft invoices can be issued' });
    }
    if (!inv.total_amount.gt(0)) {
      throw new UnprocessableEntityException({ code: InvoiceErrorCode.NOT_ISSUABLE, message: 'An invoice with a zero total cannot be issued' });
    }
    await this.issueMany(schoolId, userId, [id]);
    return this.get(schoolId, id);
  }

  /**
   * Issues drafts in one transaction: locks the rows, reserves gap-free numbers and stamps them.
   * Zero-total drafts are skipped. Returns the number issued.
   */
  private async issueMany(schoolId: string, userId: string, ids: string[]): Promise<number> {
    if (!ids.length) return 0;
    const school = await this.prisma.school.findUnique({ where: { id: schoolId }, select: { code: true } });
    if (!school) throw new NotFoundException('School not found');
    const now = new Date();

    return this.prisma.$transaction(
      async (tx) => {
        const locked = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "payment_mgt"."Invoice"
          WHERE "id" = ANY(${ids}::text[]) AND "school_id" = ${schoolId}
            AND "status" = 'DRAFT' AND "total_amount" > 0
          ORDER BY "created_at", "id"
          FOR UPDATE`;
        if (!locked.length) return 0;

        const numbers = await this.numbering.reserve(tx, {
          schoolId,
          schoolCode: school.code,
          kind: 'INVOICE',
          year: now.getFullYear(),
          count: locked.length,
        });
        for (let i = 0; i < locked.length; i++) {
          await tx.invoice.update({
            where: { id: locked[i].id },
            data: { status: 'ISSUED', invoice_number: numbers[i], issue_date: now, issued_by_user_id: userId },
          });
        }
        return locked.length;
      },
      { timeout: 120_000, maxWait: 10_000 },
    );
  }

  async cancel(schoolId: string, userId: string, id: string, dto: CancelInvoiceDto) {
    const inv = await this.getRaw(schoolId, id);
    if (inv.status === 'DRAFT') {
      throw new UnprocessableEntityException({
        code: InvoiceErrorCode.NOT_CANCELLABLE,
        message: 'Draft invoices are deleted, not cancelled',
      });
    }
    if (inv.status !== 'ISSUED') {
      throw new UnprocessableEntityException({
        code: InvoiceErrorCode.NOT_CANCELLABLE,
        message: 'Only issued invoices without payments can be cancelled. Reverse the payments first.',
      });
    }
    const payments = await this.prisma.payment.count({ where: { invoice_id: id, status: 'COMPLETED' } });
    if (payments > 0) {
      throw new UnprocessableEntityException({
        code: InvoiceErrorCode.NOT_CANCELLABLE,
        message: 'This invoice has payments. Reverse them before cancelling.',
      });
    }
    await this.prisma.invoice.update({
      where: { id },
      data: { status: 'CANCELLED', cancelled_at: new Date(), cancelled_by_user_id: userId, cancellation_reason: dto.reason.trim() },
    });
    return this.get(schoolId, id);
  }

  async deleteDraft(schoolId: string, id: string) {
    const inv = await this.getRaw(schoolId, id);
    this.assertDraft(inv);
    await this.prisma.invoice.delete({ where: { id } });
    return { deleted: true };
  }

  async createAdhoc(schoolId: string, userId: string, dto: CreateAdhocInvoiceDto) {
    const student = await this.prisma.student.findFirst({
      where: { id: dto.student_id, school_id: schoolId, deleted_at: null },
      select: { id: true },
    });
    if (!student) throw new BadRequestException('Student not found for this school');
    await this.loadYearAndTerm(schoolId, dto.academic_year_id, dto.term_template_item_id);
    const lines = await this.buildManualLines(schoolId, dto.lines);
    const school = await this.prisma.school.findUnique({ where: { id: schoolId }, select: { currency: true } });

    const inv = await this.prisma.invoice.create({
      data: {
        school_id: schoolId,
        student_id: student.id,
        academic_year_id: dto.academic_year_id,
        term_template_item_id: dto.term_template_item_id ?? null,
        kind: 'ADHOC',
        currency: school?.currency ?? 'UGX',
        due_date: new Date(dto.due_date),
        notes: dto.notes?.trim() || null,
        ...computeTotals(lines),
        created_by_user_id: userId,
        line_items: { create: lines },
      },
    });
    return this.get(schoolId, inv.id);
  }

  async updateDraft(schoolId: string, id: string, dto: UpdateDraftInvoiceDto) {
    const inv = await this.getRaw(schoolId, id);
    this.assertDraft(inv);
    const lines = dto.lines ? await this.buildManualLines(schoolId, dto.lines) : null;

    await this.prisma.$transaction(async (tx) => {
      if (lines) {
        await tx.invoiceLineItem.deleteMany({ where: { invoice_id: id } });
        await tx.invoiceLineItem.createMany({ data: lines.map((l) => ({ ...l, invoice_id: id })) });
      }
      await tx.invoice.update({
        where: { id },
        data: {
          ...(dto.due_date && { due_date: new Date(dto.due_date) }),
          ...(dto.notes !== undefined && { notes: dto.notes?.trim() || null }),
          ...(lines && computeTotals(lines)),
        },
      });
    });
    return this.get(schoolId, id);
  }

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  async list(schoolId: string, q: ListInvoicesQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 25;
    const search = q.search?.trim();
    const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));

    const where: Prisma.InvoiceWhereInput = {
      school_id: schoolId,
      ...(q.status && { status: q.status }),
      ...(q.overdue === true && { status: { in: ['ISSUED', 'PARTIALLY_PAID'] }, due_date: { lt: startOfToday } }),
      ...(q.studentId && { student_id: q.studentId }),
      ...(q.academicYearId && { academic_year_id: q.academicYearId }),
      ...(q.termId && { term_template_item_id: q.termId }),
      ...(q.batchId && { generation_batch_id: q.batchId }),
      ...(q.classroomId && {
        student: {
          enrollments: {
            some: {
              classroom_definition_id: q.classroomId,
              deleted_at: null,
              ...(q.academicYearId && { academic_year_id: q.academicYearId }),
            },
          },
        },
      }),
      ...(search && {
        OR: [
          { invoice_number: { contains: search, mode: 'insensitive' } },
          { student: { first_name: { contains: search, mode: 'insensitive' } } },
          { student: { last_name: { contains: search, mode: 'insensitive' } } },
          { student: { student_no: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };
    // status + overdue together: only ISSUED / PARTIALLY_PAID can be overdue.
    if (q.status && q.overdue) {
      if (q.status === 'ISSUED' || q.status === 'PARTIALLY_PAID') where.status = q.status;
      else where.id = { in: [] };
    }

    const [total, rows, totals] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        include: {
          student: { select: STUDENT_SELECT },
          term_template_item: { select: { id: true, name: true } },
          academic_year: { select: { id: true, name: true } },
        },
        orderBy: [{ created_at: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.invoice.aggregate({ where, _sum: { total_amount: true, amount_paid: true } }),
    ]);

    const classes = await this.classesFor(rows);
    const now = new Date();
    return {
      items: rows.map((r) => ({ ...this.withDerived(r, now), classroom: classes.get(`${r.student_id}|${r.academic_year_id}`) ?? null })),
      page,
      page_size: pageSize,
      total,
      sums: {
        total_amount: (totals._sum.total_amount ?? D(0)).toFixed(2),
        amount_paid: (totals._sum.amount_paid ?? D(0)).toFixed(2),
        balance: (totals._sum.total_amount ?? D(0)).minus(totals._sum.amount_paid ?? D(0)).toFixed(2),
      },
    };
  }

  async get(schoolId: string, id: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: { id, school_id: schoolId },
      include: {
        student: { select: STUDENT_SELECT },
        academic_year: { select: { id: true, name: true } },
        term_template_item: { select: { id: true, name: true } },
        line_items: {
          orderBy: { sort_order: 'asc' },
          include: { fee_category: { select: { id: true, name: true } } },
        },
        payments: {
          orderBy: { received_at: 'desc' },
          select: {
            id: true, amount: true, status: true, payment_method: true, reference: true, receipt_number: true,
            received_at: true, payer_name: true, reversed_at: true, reversal_reason: true,
          },
        },
      },
    });
    if (!inv) throw new NotFoundException('Invoice not found');
    const classes = await this.classesFor([inv]);
    return { ...this.withDerived(inv, new Date()), classroom: classes.get(`${inv.student_id}|${inv.academic_year_id}`) ?? null };
  }

  listBatches(schoolId: string) {
    return this.prisma.invoiceGenerationBatch.findMany({
      where: { school_id: schoolId },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async buildPlan(schoolId: string, dto: GenerateInvoicesDto) {
    const { term } = await this.loadYearAndTerm(schoolId, dto.academic_year_id, dto.term_template_item_id);
    const school = await this.prisma.school.findUnique({ where: { id: schoolId }, select: { currency: true } });

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        academic_year_id: dto.academic_year_id,
        status: 'active',
        deleted_at: null,
        ...(dto.classroom_definition_id && { classroom_definition_id: dto.classroom_definition_id }),
        ...(dto.student_ids?.length && { student_id: { in: dto.student_ids } }),
        student: { school_id: schoolId, deleted_at: null },
      },
      orderBy: { start_date: 'desc' },
      select: { student: { select: STUDENT_SELECT }, classroom_definition: { select: { id: true, name: true } } },
    });
    // One enrollment per student (most recent wins).
    const students = new Map<string, (typeof enrollments)[number]>();
    for (const e of enrollments) if (!students.has(e.student.id)) students.set(e.student.id, e);

    const skipped: SkippedStudent[] = [];
    if (dto.student_ids?.length) {
      const missing = dto.student_ids.filter((id) => !students.has(id));
      if (missing.length) {
        const rows = await this.prisma.student.findMany({ where: { id: { in: missing }, school_id: schoolId }, select: STUDENT_SELECT });
        for (const s of rows) skipped.push({ ...this.skipOf(s), reason: 'No active enrollment for this academic year' });
      }
    }

    const studentIds = [...students.keys()];
    const [structures, assignments, existing] = await Promise.all([
      this.prisma.feeStructure.findMany({
        where: {
          school_id: schoolId,
          academic_year_id: dto.academic_year_id,
          is_active: true,
          OR: [{ term_template_item_id: dto.term_template_item_id }, { term_template_item_id: null }],
        },
        orderBy: [{ fee_category: { sort_order: 'asc' } }, { name: 'asc' }],
      }),
      this.prisma.studentFeeAssignment.findMany({
        where: { student_id: { in: studentIds }, status: 'ACTIVE', fee_structure: { academic_year_id: dto.academic_year_id } },
      }),
      this.prisma.invoice.findMany({
        where: {
          student_id: { in: studentIds },
          academic_year_id: dto.academic_year_id,
          term_template_item_id: dto.term_template_item_id,
          kind: 'TERM',
          status: { not: 'CANCELLED' },
        },
        select: { student_id: true, invoice_number: true, status: true },
      }),
    ]);

    const yearLevelIds = structures.filter((s) => !s.term_template_item_id).map((s) => s.id);
    const billedYearLevel = yearLevelIds.length
      ? await this.prisma.invoiceLineItem.findMany({
          where: {
            fee_structure_id: { in: yearLevelIds },
            invoice: { student_id: { in: studentIds }, status: { not: 'CANCELLED' } },
          },
          select: { fee_structure_id: true, invoice: { select: { student_id: true } } },
        })
      : [];

    const existingByStudent = new Map(existing.map((i) => [i.student_id, i]));
    const assignmentsByStudent = groupBy(assignments, (a) => a.student_id);
    const billedByStudent = new Map<string, Set<string>>();
    for (const l of billedYearLevel) {
      const set = billedByStudent.get(l.invoice.student_id) ?? new Set<string>();
      set.add(l.fee_structure_id as string);
      billedByStudent.set(l.invoice.student_id, set);
    }

    const planned: PlannedInvoice[] = [];
    const today = new Date();
    for (const { student, classroom_definition } of students.values()) {
      const prior = existingByStudent.get(student.id);
      if (prior) {
        skipped.push({
          ...this.skipOf(student),
          reason: `Already invoiced for this term (${prior.invoice_number ?? 'draft'})`,
        });
        continue;
      }
      const lines = selectLines(dto.term_template_item_id, structures, {
        studentId: student.id,
        classroomId: classroom_definition?.id ?? null,
        assignments: assignmentsByStudent.get(student.id) ?? [],
        alreadyBilledStructureIds: billedByStudent.get(student.id) ?? new Set(),
      });
      const totals = computeTotals(lines);
      if (!lines.length || !totals.total_amount.gt(0)) {
        skipped.push({ ...this.skipOf(student), reason: lines.length ? 'All fees waived (total is zero)' : 'No fees apply to this student' });
        continue;
      }
      planned.push({
        student,
        classroom: classroom_definition,
        lines,
        totals,
        due_date: resolveDueDate(lines, term.start_date, today),
      });
    }

    planned.sort((a, b) => a.student.last_name.localeCompare(b.student.last_name) || a.student.first_name.localeCompare(b.student.first_name));
    return { planned, skipped, currency: school?.currency ?? 'UGX' };
  }

  private async loadYearAndTerm(schoolId: string, academicYearId: string, termId?: string) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id: academicYearId, school_id: schoolId },
      include: { term_template: { include: { term_template_items: true } } },
    });
    if (!year) throw new BadRequestException('Academic year not found for this school');
    const term = termId ? year.term_template.term_template_items.find((t) => t.id === termId) : undefined;
    if (termId && !term) throw new BadRequestException('The selected term does not belong to this academic year');
    return { year, term: term ?? { start_date: null } };
  }

  private async buildManualLines(schoolId: string, input: InvoiceLineInputDto[]) {
    if (!input.length) throw new BadRequestException('An invoice needs at least one line');
    const categoryIds = [...new Set(input.map((l) => l.fee_category_id))];
    const structureIds = [...new Set(input.map((l) => l.fee_structure_id).filter((v): v is string => !!v))];
    const [cats, structs] = await Promise.all([
      this.prisma.feeCategory.count({ where: { id: { in: categoryIds }, school_id: schoolId } }),
      structureIds.length ? this.prisma.feeStructure.count({ where: { id: { in: structureIds }, school_id: schoolId } }) : 0,
    ]);
    if (cats !== categoryIds.length) throw new BadRequestException('Unknown fee category on an invoice line');
    if (structs !== structureIds.length) throw new BadRequestException('Unknown fee structure on an invoice line');

    return input.map((l, i) => {
      const quantity = l.quantity ?? 1;
      const unit = D(l.unit_amount);
      const gross = unit.times(quantity);
      const waived = D(l.waived_amount ?? '0');
      if (!unit.gt(0)) throw new BadRequestException(`Line ${i + 1}: amount must be greater than zero`);
      if (waived.gt(gross)) throw new BadRequestException(`Line ${i + 1}: waiver cannot exceed the line amount`);
      return {
        fee_structure_id: l.fee_structure_id ?? null,
        fee_category_id: l.fee_category_id,
        description: l.description.trim(),
        quantity,
        unit_amount: unit,
        waived_amount: waived,
        line_total: gross.minus(waived),
        sort_order: i,
      };
    });
  }

  private async classesFor(rows: Array<{ student_id: string; academic_year_id: string }>) {
    const map = new Map<string, { id: string; name: string }>();
    if (!rows.length) return map;
    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        student_id: { in: [...new Set(rows.map((r) => r.student_id))] },
        academic_year_id: { in: [...new Set(rows.map((r) => r.academic_year_id))] },
        deleted_at: null,
      },
      orderBy: { start_date: 'asc' }, // later enrollments overwrite earlier ones
      select: { student_id: true, academic_year_id: true, classroom_definition: { select: { id: true, name: true } } },
    });
    for (const e of enrollments) map.set(`${e.student_id}|${e.academic_year_id}`, e.classroom_definition);
    return map;
  }

  private withDerived<T extends Invoice>(inv: T, now: Date) {
    return {
      ...inv,
      balance: inv.total_amount.minus(inv.amount_paid).toFixed(2),
      is_overdue: isOverdue(inv, now),
    };
  }

  private async getRaw(schoolId: string, id: string) {
    const inv = await this.prisma.invoice.findFirst({ where: { id, school_id: schoolId } });
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  private assertDraft(inv: Invoice) {
    if (inv.status !== 'DRAFT') {
      throw new UnprocessableEntityException({
        code: InvoiceErrorCode.NOT_EDITABLE,
        message: 'Issued invoices cannot be edited or deleted. Cancel it and issue a new one instead.',
      });
    }
  }

  private skipOf(s: { id: string; first_name: string; last_name: string; student_no?: string }) {
    return { student_id: s.id, name: `${s.first_name} ${s.last_name}`.trim(), student_no: s.student_no };
  }
}

function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const list = out.get(k);
    if (list) list.push(r);
    else out.set(k, [r]);
  }
  return out;
}
