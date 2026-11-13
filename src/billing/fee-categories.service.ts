import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_FEE_CATEGORIES } from './billing.constants';
import { CreateFeeCategoryDto, UpdateFeeCategoryDto } from './dto/fee-category.dto';

@Injectable()
export class FeeCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list(schoolId: string, includeInactive = true) {
    return this.prisma.feeCategory.findMany({
      where: { school_id: schoolId, ...(includeInactive ? {} : { is_active: true }) },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { fee_structures: true } } },
    });
  }

  async get(schoolId: string, id: string) {
    const category = await this.prisma.feeCategory.findFirst({ where: { id, school_id: schoolId } });
    if (!category) throw new NotFoundException('Fee category not found');
    return category;
  }

  async create(schoolId: string, dto: CreateFeeCategoryDto) {
    try {
      return await this.prisma.feeCategory.create({
        data: {
          school_id: schoolId,
          name: dto.name.trim(),
          code: dto.code,
          description: dto.description?.trim() || null,
          sort_order: dto.sort_order ?? 0,
        },
      });
    } catch (e) {
      throw this.mapUnique(e);
    }
  }

  async update(schoolId: string, id: string, dto: UpdateFeeCategoryDto) {
    await this.get(schoolId, id);
    try {
      return await this.prisma.feeCategory.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.code !== undefined && { code: dto.code }),
          ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
          ...(dto.sort_order !== undefined && { sort_order: dto.sort_order }),
          ...(dto.is_active !== undefined && { is_active: dto.is_active }),
        },
      });
    } catch (e) {
      throw this.mapUnique(e);
    }
  }

  /** Categories are never deleted once referenced; deactivation hides them from new structures. */
  async setActive(schoolId: string, id: string, isActive: boolean) {
    await this.get(schoolId, id);
    return this.prisma.feeCategory.update({ where: { id }, data: { is_active: isActive } });
  }

  /** Idempotent: creates any missing default categories, leaves existing ones untouched. */
  async seedDefaults(schoolId: string) {
    const existing = await this.prisma.feeCategory.findMany({
      where: { school_id: schoolId },
      select: { code: true, name: true },
    });
    const codes = new Set(existing.map((c) => c.code));
    const names = new Set(existing.map((c) => c.name.toLowerCase()));
    const toCreate = DEFAULT_FEE_CATEGORIES.map((c, i) => ({ ...c, sort_order: i })).filter(
      (c) => !codes.has(c.code) && !names.has(c.name.toLowerCase()),
    );
    if (toCreate.length) {
      await this.prisma.feeCategory.createMany({
        data: toCreate.map((c) => ({ school_id: schoolId, ...c })),
        skipDuplicates: true,
      });
    }
    return { created: toCreate.length, categories: await this.list(schoolId) };
  }

  private mapUnique(e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return new ConflictException('A fee category with this name or code already exists');
    }
    return e;
  }
}
