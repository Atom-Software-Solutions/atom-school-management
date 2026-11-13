import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListPaymentsQueryDto, RecordPaymentDto, ReversePaymentDto } from './dto/payment.dto';
import { NumberingService } from './numbering.service';
import { checkPayment, statusForPaid } from './payment.logic';

type Tx = Prisma.TransactionClient;
const D = (v: Prisma.Decimal.Value) => new Prisma.Decimal(v);

const PAYMENT_INCLUDE = {
  student: { select: { id: true, first_name: true, last_name: true, student_no: true } },
  invoice: { select: { id: true, invoice_number: true, total_amount: true, amount_paid: true, status: true, currency: true } },
} satisfies Prisma.PaymentInclude;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly numbering: NumberingService,
  ) {}

  /**
   * Records a completed manual payment. In one transaction it locks the invoice row,
   * re-checks the balance, reserves a receipt number, inserts the payment and recalculates
   * the invoice. Repeating a request with the same Idempotency-Key returns the original payment.
   */
  async record(schoolId: string, userId: string, invoiceId: string, dto: RecordPaymentDto, idempotencyKey?: string) {
    const key = idempotencyKey?.trim().slice(0, 100) || null;
    if (key) {
      const existing = await this.prisma.payment.findFirst({ where: { school_id: schoolId, idempotency_key: key }, include: PAYMENT_INCLUDE });
      if (existing) return this.replay(existing, invoiceId);
    }
    const reference = dto.reference?.trim() || null;
    if (reference) {
      const dup = await this.prisma.payment.findUnique({ where: { reference }, select: { id: true } });
      if (dup) throw new ConflictException('A payment with this reference has already been recorded');
    }

    const school = await this.prisma.school.findUnique({ where: { id: schoolId }, select: { code: true } });
    if (!school) throw new NotFoundException('School not found');
    const amount = D(dto.amount);
    const receivedAt = new Date(dto.received_at);
    const now = new Date();

    try {
      const paymentId = await this.prisma.$transaction(async (tx) => {
        const invoice = await this.lockInvoice(tx, schoolId, invoiceId);
        const check = checkPayment(invoice, amount, receivedAt, now);
        if (!check.ok) throw new UnprocessableEntityException({ code: check.code, message: check.message });

        const [receiptNumber] = await this.numbering.reserve(tx, {
          schoolId,
          schoolCode: school.code,
          kind: 'RECEIPT',
          year: now.getFullYear(),
        });
        const payment = await tx.payment.create({
          data: {
            school_id: schoolId,
            student_id: invoice.student_id,
            invoice_id: invoice.id,
            amount,
            currency: invoice.currency,
            status: 'COMPLETED',
            payment_method: dto.payment_method,
            reference: reference ?? receiptNumber,
            receipt_number: receiptNumber,
            received_at: receivedAt,
            completed_at: now,
            payer_name: dto.payer_name?.trim() || null,
            payer_phone: dto.payer_phone?.trim() || null,
            description: dto.description?.trim() || null,
            recorded_by_user_id: userId,
            idempotency_key: key,
          },
        });
        await this.recalculate(tx, invoice.id);
        return payment.id;
      });
      return this.get(schoolId, paymentId);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        // Lost a race with an identical request: return the winner.
        if (key) {
          const existing = await this.prisma.payment.findFirst({ where: { school_id: schoolId, idempotency_key: key }, include: PAYMENT_INCLUDE });
          if (existing) return this.replay(existing, invoiceId);
        }
        throw new ConflictException('A payment with this reference has already been recorded');
      }
      throw e;
    }
  }

  /** Reversal never deletes: it flags the payment and recalculates the invoice. */
  async reverse(schoolId: string, userId: string, paymentId: string, dto: ReversePaymentDto) {
    const payment = await this.prisma.payment.findFirst({ where: { id: paymentId, school_id: schoolId } });
    if (!payment) throw new NotFoundException('Payment not found');
    if (!payment.invoice_id) throw new BadRequestException('This payment is not linked to an invoice');

    await this.prisma.$transaction(async (tx) => {
      await this.lockInvoice(tx, schoolId, payment.invoice_id!);
      // Re-read under the lock so two reversals can't both succeed.
      const current = await tx.payment.findUnique({ where: { id: paymentId }, select: { status: true } });
      if (current?.status !== 'COMPLETED') {
        throw new UnprocessableEntityException({ code: 'PAYMENT_NOT_REVERSIBLE', message: 'Only completed payments can be reversed' });
      }
      await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'REVERSED', reversed_at: new Date(), reversed_by_user_id: userId, reversal_reason: dto.reason.trim() },
      });
      await this.recalculate(tx, payment.invoice_id!);
    });
    return this.get(schoolId, paymentId);
  }

  async get(schoolId: string, id: string) {
    const p = await this.prisma.payment.findFirst({ where: { id, school_id: schoolId }, include: PAYMENT_INCLUDE });
    if (!p) throw new NotFoundException('Payment not found');
    return p;
  }

  listForInvoice(schoolId: string, invoiceId: string) {
    return this.prisma.payment.findMany({
      where: { school_id: schoolId, invoice_id: invoiceId },
      orderBy: [{ received_at: 'desc' }, { created_at: 'desc' }],
      include: PAYMENT_INCLUDE,
    });
  }

  async list(schoolId: string, q: ListPaymentsQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 25;
    const search = q.search?.trim();
    const to = q.to ? new Date(new Date(q.to).setHours(23, 59, 59, 999)) : undefined;

    const where: Prisma.PaymentWhereInput = {
      school_id: schoolId,
      invoice_id: { not: null },
      ...(q.method && { payment_method: q.method }),
      ...(q.status && { status: q.status }),
      ...(q.studentId && { student_id: q.studentId }),
      ...((q.from || to) && { received_at: { ...(q.from && { gte: new Date(q.from) }), ...(to && { lte: to }) } }),
      ...(search && {
        OR: [
          { receipt_number: { contains: search, mode: 'insensitive' } },
          { reference: { contains: search, mode: 'insensitive' } },
          { payer_name: { contains: search, mode: 'insensitive' } },
          { invoice: { invoice_number: { contains: search, mode: 'insensitive' } } },
          { student: { first_name: { contains: search, mode: 'insensitive' } } },
          { student: { last_name: { contains: search, mode: 'insensitive' } } },
          { student: { student_no: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const [total, items, collected] = await Promise.all([
      this.prisma.payment.count({ where }),
      this.prisma.payment.findMany({
        where,
        include: PAYMENT_INCLUDE,
        orderBy: [{ received_at: 'desc' }, { created_at: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.payment.aggregate({ where: { ...where, status: 'COMPLETED' }, _sum: { amount: true }, _count: true }),
    ]);
    return {
      items,
      page,
      page_size: pageSize,
      total,
      sums: { collected: (collected._sum.amount ?? D(0)).toFixed(2), completed_count: collected._count },
    };
  }

  /** Everything a printable receipt needs. */
  async receipt(schoolId: string, paymentId: string) {
    const p = await this.prisma.payment.findFirst({
      where: { id: paymentId, school_id: schoolId },
      include: {
        ...PAYMENT_INCLUDE,
        invoice: {
          select: {
            id: true, invoice_number: true, total_amount: true, amount_paid: true, status: true, currency: true,
            academic_year: { select: { name: true } },
            term_template_item: { select: { name: true } },
          },
        },
      },
    });
    if (!p) throw new NotFoundException('Payment not found');
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, address: true, phone: true, email: true, logo_url: true, motto: true },
    });
    const recordedBy = p.recorded_by_user_id
      ? await this.prisma.user.findUnique({ where: { id: p.recorded_by_user_id }, select: { first_name: true, last_name: true } })
      : null;
    return {
      school,
      payment: p,
      recorded_by: recordedBy ? `${recordedBy.first_name} ${recordedBy.last_name}`.trim() : null,
      invoice_balance: p.invoice ? p.invoice.total_amount.minus(p.invoice.amount_paid).toFixed(2) : null,
    };
  }

  // ---------------------------------------------------------------------------

  private async lockInvoice(tx: Tx, schoolId: string, invoiceId: string) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "payment_mgt"."Invoice" WHERE "id" = ${invoiceId} AND "school_id" = ${schoolId} FOR UPDATE`;
    if (!rows.length) throw new NotFoundException('Invoice not found');
    return tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  }

  /** Recomputes the cached amount_paid and status from completed payments. Must run under the invoice lock. */
  private async recalculate(tx: Tx, invoiceId: string) {
    const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId }, select: { status: true, total_amount: true } });
    const sum = await tx.payment.aggregate({ where: { invoice_id: invoiceId, status: 'COMPLETED' }, _sum: { amount: true } });
    const paid = sum._sum.amount ?? D(0);
    const status = invoice.status === 'DRAFT' || invoice.status === 'CANCELLED' ? invoice.status : statusForPaid(invoice.total_amount, paid);
    await tx.invoice.update({ where: { id: invoiceId }, data: { amount_paid: paid, status } });
  }

  private replay(existing: Prisma.PaymentGetPayload<{ include: typeof PAYMENT_INCLUDE }>, invoiceId: string) {
    if (existing.invoice_id !== invoiceId) {
      throw new ConflictException('This idempotency key was already used for a different invoice');
    }
    return existing;
  }
}
