import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BillingErrorCode } from './billing.constants';
import {
  CopyFeeStructuresDto,
  CreateFeeStructureDto,
  ListFeeStructuresQueryDto,
  UpdateFeeStructureDto,
} from './dto/fee-structure.dto';
import { lockedFieldChanges, mapTermsByOrdinal, structureKey } from './fee-structure.rules';

const STRUCTURE_INCLUDE = {
  fee_category: { select: { id: true, name: true, code: true } },
  academic_year: { select: { id: true, name: true } },
  term_template_item: { select: { id: true, name: true, ordinal: true } },
  classroom_definition: { select: { id: true, name: true } },
} satisfies Prisma.FeeStructureInclude;

@Injectable()
export class FeeStructuresService {
  constructor(private readonly prisma: PrismaService) {}

  async list(schoolId: string, q: ListFeeStructuresQueryDto) {
    const rows = await this.prisma.feeStructure.findMany({
      where: {
        school_id: schoolId,
        ...(q.academicYearId && { academic_year_id: q.academicYearId }),
        ...(q.termId && { term_template_item_id: q.termId }),
        ...(q.classroomId && { classroom_definition_id: q.classroomId }),
        ...(q.categoryId && { fee_category_id: q.categoryId }),
        ...(q.active !== undefined && { is_active: q.active }),
      },
      include: STRUCTURE_INCLUDE,
      orderBy: [{ academic_year_id: 'asc' }, { name: 'asc' }],
    });
    const locked = await this.lockedIds(rows.map((r) => r.id));
    return rows.map((r) => ({ ...r, is_locked: locked.has(r.id) }));
  }

  async get(schoolId: string, id: string) {
    const row = await this.prisma.feeStructure.findFirst({
      where: { id, school_id: schoolId },
      include: STRUCTURE_INCLUDE,
    });
    if (!row) throw new NotFoundException('Fee structure not found');
    const locked = await this.lockedIds([id]);
    return { ...row, is_locked: locked.has(id) };
  }

  async create(schoolId: string, userId: string, dto: CreateFeeStructureDto) {
    await this.validateRefs(schoolId, dto);
    const row = await this.prisma.feeStructure.create({
      data: {
        school_id: schoolId,
        academic_year_id: dto.academic_year_id,
        term_template_item_id: dto.term_template_item_id || null,
        classroom_definition_id: dto.classroom_definition_id || null,
        fee_category_id: dto.fee_category_id,
        name: dto.name.trim(),
        amount: new Prisma.Decimal(dto.amount),
        due_date: dto.due_date ? new Date(dto.due_date) : null,
        frequency: dto.frequency ?? 'PER_TERM',
        is_mandatory: dto.is_mandatory ?? true,
        metadata: (dto.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        created_by_user_id: userId,
      },
      include: STRUCTURE_INCLUDE,
    });
    return { ...row, is_locked: false };
  }

  async update(schoolId: string, id: string, dto: UpdateFeeStructureDto) {
    const current = await this.get(schoolId, id);

    if (current.is_locked) {
      const changed = lockedFieldChanges(current, dto as Record<string, unknown>);
      if (changed.length) {
        throw new UnprocessableEntityException({
          code: BillingErrorCode.STRUCTURE_LOCKED,
          message: `This fee has already been invoiced, so ${changed.join(', ')} cannot be changed. Create a new fee structure instead.`,
        });
      }
    }

    const merged = {
      academic_year_id: dto.academic_year_id ?? current.academic_year_id,
      term_template_item_id:
        dto.term_template_item_id !== undefined ? dto.term_template_item_id || null : current.term_template_item_id,
      classroom_definition_id:
        dto.classroom_definition_id !== undefined ? dto.classroom_definition_id || null : current.classroom_definition_id,
      fee_category_id: dto.fee_category_id ?? current.fee_category_id,
    };
    const categoryChanged = merged.fee_category_id !== current.fee_category_id;
    await this.validateRefs(schoolId, merged, { requireActiveCategory: categoryChanged });

    const row = await this.prisma.feeStructure.update({
      where: { id },
      data: {
        ...merged,
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.amount !== undefined && { amount: new Prisma.Decimal(dto.amount) }),
        ...(dto.due_date !== undefined && { due_date: dto.due_date ? new Date(dto.due_date) : null }),
        ...(dto.frequency !== undefined && { frequency: dto.frequency }),
        ...(dto.is_mandatory !== undefined && { is_mandatory: dto.is_mandatory }),
        ...(dto.is_active !== undefined && { is_active: dto.is_active }),
        ...(dto.metadata !== undefined && { metadata: dto.metadata as Prisma.InputJsonValue }),
      },
      include: STRUCTURE_INCLUDE,
    });
    return { ...row, is_locked: current.is_locked };
  }

  async setActive(schoolId: string, id: string, isActive: boolean) {
    await this.get(schoolId, id);
    return this.prisma.feeStructure.update({ where: { id }, data: { is_active: isActive }, include: STRUCTURE_INCLUDE });
  }

  /**
   * Copies active structures from one year/term to another. Existing equivalents in the target
   * (same category, class, term and name) are skipped, so the operation is safe to repeat.
   * Due dates are not copied because they belong to the source term.
   */
  async copy(schoolId: string, userId: string, dto: CopyFeeStructuresDto) {
    if (dto.from_term_template_item_id && !dto.to_term_template_item_id) {
      throw new BadRequestException('to_term_template_item_id is required when copying a single term');
    }
    const [fromYear, toYear] = await Promise.all([
      this.loadYear(schoolId, dto.from_academic_year_id),
      this.loadYear(schoolId, dto.to_academic_year_id),
    ]);
    if (dto.from_term_template_item_id) this.assertTermInYear(fromYear, dto.from_term_template_item_id);
    if (dto.to_term_template_item_id) this.assertTermInYear(toYear, dto.to_term_template_item_id);

    const source = await this.prisma.feeStructure.findMany({
      where: {
        school_id: schoolId,
        academic_year_id: fromYear.id,
        is_active: true,
        ...(dto.from_term_template_item_id && { term_template_item_id: dto.from_term_template_item_id }),
        ...(dto.classroom_definition_id && { classroom_definition_id: dto.classroom_definition_id }),
      },
    });

    const termMap = mapTermsByOrdinal(fromYear.term_template.term_template_items, toYear.term_template.term_template_items);
    const resolveTerm = (sourceTermId: string | null): string | null | undefined => {
      if (dto.to_term_template_item_id) return dto.to_term_template_item_id;
      if (!sourceTermId) return null;
      return termMap.get(sourceTermId); // undefined = no matching term in target
    };

    const existing = await this.prisma.feeStructure.findMany({
      where: { school_id: schoolId, academic_year_id: toYear.id },
      select: { fee_category_id: true, classroom_definition_id: true, term_template_item_id: true, name: true },
    });
    const existingKeys = new Set(existing.map(structureKey));

    const skipped: Array<{ id: string; name: string; reason: string }> = [];
    const toCreate: Prisma.FeeStructureCreateManyInput[] = [];
    for (const s of source) {
      const term = resolveTerm(s.term_template_item_id);
      if (term === undefined) {
        skipped.push({ id: s.id, name: s.name, reason: 'No matching term in the target academic year' });
        continue;
      }
      const key = structureKey({ ...s, term_template_item_id: term });
      if (existingKeys.has(key)) {
        skipped.push({ id: s.id, name: s.name, reason: 'Already exists in the target' });
        continue;
      }
      existingKeys.add(key);
      toCreate.push({
        school_id: schoolId,
        academic_year_id: toYear.id,
        term_template_item_id: term,
        classroom_definition_id: s.classroom_definition_id,
        fee_category_id: s.fee_category_id,
        name: s.name,
        amount: s.amount,
        due_date: null,
        frequency: s.frequency,
        is_mandatory: s.is_mandatory,
        metadata: (s.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        created_by_user_id: userId,
      });
    }

    if (toCreate.length) await this.prisma.feeStructure.createMany({ data: toCreate });
    return { created: toCreate.length, skipped };
  }

  // ---------------------------------------------------------------------------

  /** Structure ids referenced by at least one non-draft invoice. */
  private async lockedIds(ids: string[]): Promise<Set<string>> {
    if (!ids.length) return new Set();
    const lines = await this.prisma.invoiceLineItem.findMany({
      where: { fee_structure_id: { in: ids }, invoice: { status: { not: 'DRAFT' } } },
      select: { fee_structure_id: true },
      distinct: ['fee_structure_id'],
    });
    return new Set(lines.map((l) => l.fee_structure_id as string));
  }

  private async loadYear(schoolId: string, academicYearId: string) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id: academicYearId, school_id: schoolId },
      include: { term_template: { include: { term_template_items: { select: { id: true, ordinal: true } } } } },
    });
    if (!year) throw new BadRequestException('Academic year not found for this school');
    return year;
  }

  private assertTermInYear(year: Awaited<ReturnType<FeeStructuresService['loadYear']>>, termId: string) {
    if (!year.term_template.term_template_items.some((t) => t.id === termId)) {
      throw new UnprocessableEntityException({
        code: BillingErrorCode.TERM_NOT_IN_YEAR,
        message: `The selected term does not belong to academic year ${year.name}`,
      });
    }
  }

  private async validateRefs(
    schoolId: string,
    refs: {
      academic_year_id: string;
      term_template_item_id?: string | null;
      classroom_definition_id?: string | null;
      fee_category_id: string;
    },
    opts: { requireActiveCategory?: boolean } = { requireActiveCategory: true },
  ) {
    const year = await this.loadYear(schoolId, refs.academic_year_id);
    if (refs.term_template_item_id) this.assertTermInYear(year, refs.term_template_item_id);

    if (refs.classroom_definition_id) {
      const classroom = await this.prisma.classroomDefinition.findFirst({
        where: { id: refs.classroom_definition_id, school_id: schoolId },
        select: { id: true },
      });
      if (!classroom) throw new BadRequestException('Class not found for this school');
    }

    const category = await this.prisma.feeCategory.findFirst({
      where: { id: refs.fee_category_id, school_id: schoolId },
      select: { is_active: true },
    });
    if (!category) throw new BadRequestException('Fee category not found for this school');
    if (opts.requireActiveCategory && !category.is_active) {
      throw new UnprocessableEntityException({
        code: BillingErrorCode.CATEGORY_INACTIVE,
        message: 'This fee category is inactive. Reactivate it or choose another category.',
      });
    }
  }
}
