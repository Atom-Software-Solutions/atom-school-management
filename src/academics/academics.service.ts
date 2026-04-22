import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AcademicsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertIsAdminOfSchool(schoolId: string, userId: string) {
    const rel = await this.prisma.schoolAdmin.findUnique({
      where: { school_id_user_id: { school_id: schoolId, user_id: userId } },
    });
    if (!rel)
      throw new ForbiddenException('Insufficient permissions for this school');
  }

  /**
   * Validates term structure: ordinals must be sequential starting from 1, no duplicates, names must be non-empty
   */
  private validateTermStructure(
    structure: Array<{ ordinal: number; name: string }>,
  ): void {
    if (!Array.isArray(structure) || structure.length === 0) {
      throw new BadRequestException('structure must be a non-empty array');
    }

    // Check for duplicate ordinals
    const ordinals = structure.map((t) => t.ordinal);
    const uniqueOrdinals = new Set(ordinals);
    if (ordinals.length !== uniqueOrdinals.size) {
      throw new BadRequestException('structure contains duplicate ordinals');
    }

    // Validate that ordinals start from 1 and are sequential
    const sortedOrdinals = [...ordinals].sort((a, b) => a - b);
    for (let i = 0; i < sortedOrdinals.length; i++) {
      if (sortedOrdinals[i] !== i + 1) {
        throw new BadRequestException(
          'structure ordinals must start from 1 and be sequential',
        );
      }
    }

    // Validate term names are not empty
    for (const term of structure) {
      if (!term.name || term.name.trim() === '') {
        throw new BadRequestException('All terms must have a non-empty name');
      }
    }
  }

  /**
   * Validates that locked template preserves all existing terms (by ordinal)
   */
  private validateLockedTemplateStructure(
    existingStructure: Array<{ ordinal: number; name: string }>,
    newStructure: Array<{ ordinal: number; name: string }>,
  ): void {
    const existingOrdinals = new Set(existingStructure.map((t) => t.ordinal));
    const newOrdinals = new Set(newStructure.map((t) => t.ordinal));

    // Check if any existing terms were removed
    for (const existingTerm of existingStructure) {
      if (!newOrdinals.has(existingTerm.ordinal)) {
        throw new BadRequestException(
          `Cannot remove term with ordinal ${existingTerm.ordinal} from a locked template. Locked templates must preserve all existing terms.`,
        );
      }
    }
  }

  /**
   * Handles Prisma unique constraint errors and converts them to user-friendly messages
   */
  private handlePrismaUniqueError(error: any, fieldName: string): never {
    if (error?.code === 'P2002' && Array.isArray(error?.meta?.target)) {
      const target = error.meta.target as string[];
      if (target.includes(fieldName)) {
        throw new BadRequestException(
          `A term template with this ${fieldName} already exists for this school`,
        );
      }
    }
    throw error;
  }

  // Term templates
  async listTermTemplates(schoolId: string, adminUserId: string) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    const templates = await (this.prisma as any).termTemplate.findMany({
      where: { school_id: schoolId },
      orderBy: { name: 'asc' },
      include: { term_template_items: { orderBy: { ordinal: 'asc' } } },
    });

    return templates.map((tpl: any) => {
      const mapped = (tpl.term_template_items || []).map((it: any) => ({
        id: it.id,
        ordinal: it.ordinal,
        name: it.name,
        startDate: it.start_date,
        endDate: it.end_date,
      }));
      return { ...tpl, structure: mapped };
    });
  }

  async createTermTemplate(
    schoolId: string,
    adminUserId: string,
    data: { name: string; structure: Array<{ ordinal: number; name: string }> },
  ) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    this.validateTermStructure(data.structure);

    try {
      // Create template and persist term template items relationally
      const created = await (this.prisma as any).$transaction(
        async (tx: any) => {
          const tpl = await tx.termTemplate.create({
            data: {
              school_id: schoolId,
              name: data.name.trim(),
            },
          });

          // Insert term items
          const items = data.structure.map((s) => ({
            term_template_id: tpl.id,
            ordinal: s.ordinal,
            name: s.name.trim(),
          }));
          if (items.length > 0) {
            await tx.termTemplateItem.createMany({ data: items });
          }

          // return template with items
          return tx.termTemplate.findUnique({
            where: { id: tpl.id },
            include: { term_template_items: { orderBy: { ordinal: 'asc' } } },
          });
        },
      );
      // Map items into a `structure` shape for compatibility
      const mapped =
        created.term_template_items?.map((it: any) => ({
          ordinal: it.ordinal,
          name: it.name,
        })) || [];
      return { ...created, structure: mapped };
    } catch (e: any) {
      this.handlePrismaUniqueError(e, 'name');
    }
  }

  async updateTermTemplate(
    id: string,
    adminUserId: string,
    data: {
      name?: string;
      structure?: Array<{ ordinal: number; name: string }>;
    },
  ) {
    const tpl = await (this.prisma as any).termTemplate.findUnique({
      where: { id },
    });
    if (!tpl) throw new NotFoundException('Term template not found');

    await this.assertIsAdminOfSchool(tpl.school_id, adminUserId);

    const updateData: any = {};

    // Handle name update - only check for duplicates if name actually changed
    if (data.name !== undefined) {
      const trimmedName = data.name.trim();
      if (trimmedName !== tpl.name) {
        const existing = await (this.prisma as any).termTemplate.findUnique({
          where: {
            school_id_name: { school_id: tpl.school_id, name: trimmedName },
          },
        });
        if (existing) {
          throw new BadRequestException(
            'A term template with this name already exists for this school',
          );
        }
        updateData.name = trimmedName;
      }
    }

    // Handle structure update
    if (data.structure !== undefined) {
      this.validateTermStructure(data.structure);

      // Load existing items to validate against (locked templates must preserve ordinals)
      const existingItems = await (
        this.prisma as any
      ).termTemplateItem.findMany({
        where: { term_template_id: tpl.id },
        orderBy: { ordinal: 'asc' },
      });
      const existingStructure: Array<{ ordinal: number; name: string }> =
        existingItems.map((it: any) => ({
          ordinal: it.ordinal,
          name: it.name,
        }));
      if (tpl.is_locked) {
        this.validateLockedTemplateStructure(existingStructure, data.structure);
      }

      // We'll replace items in a transaction: delete existing items and create new ones
      // do not write to `structure` JSON column; term items persisted relationally
      const newItems = data.structure.map((s) => ({
        term_template_id: tpl.id,
        ordinal: s.ordinal,
        name: s.name.trim(),
      }));
      await (this.prisma as any).$transaction(async (tx: any) => {
        await tx.termTemplateItem.deleteMany({
          where: { term_template_id: tpl.id },
        });
        if (newItems.length > 0)
          await tx.termTemplateItem.createMany({ data: newItems });
      });
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    try {
      await (this.prisma as any).termTemplate.update({
        where: { id },
        data: updateData,
      });

      const updated = await (this.prisma as any).termTemplate.findUnique({
        where: { id },
        include: { term_template_items: { orderBy: { ordinal: 'asc' } } },
      });
      const mapped =
        updated?.term_template_items?.map((it: any) => ({
          ordinal: it.ordinal,
          name: it.name,
        })) || [];
      return { ...updated, structure: mapped };
    } catch (e: any) {
      this.handlePrismaUniqueError(e, 'name');
    }
  }

  async lockTemplate(id: string, adminUserId: string) {
    const tpl = await (this.prisma as any).termTemplate.findUnique({
      where: { id },
    });
    if (!tpl) throw new NotFoundException('Term template not found');

    await this.assertIsAdminOfSchool(tpl.school_id, adminUserId);

    if (tpl.is_locked) {
      throw new BadRequestException('Template is already locked');
    }

    return (this.prisma as any).termTemplate.update({
      where: { id },
      data: { is_locked: true },
    });
  }

  async getTermTemplate(id: string, adminUserId: string) {
    const tpl = await (this.prisma as any).termTemplate.findUnique({
      where: { id },
      include: { term_template_items: { orderBy: { ordinal: 'asc' } } },
    });
    if (!tpl) throw new NotFoundException('Term template not found');

    await this.assertIsAdminOfSchool(tpl.school_id, adminUserId);
    const mapped =
      tpl.term_template_items?.map((it: any) => ({
        id: it.id,
        ordinal: it.ordinal,
        name: it.name,
      })) || [];
    return { ...tpl, structure: mapped };
  }

  async deleteTermTemplate(id: string, adminUserId: string) {
    const tpl = await (this.prisma as any).termTemplate.findUnique({
      where: { id },
    });
    if (!tpl) throw new NotFoundException('Term template not found');

    await this.assertIsAdminOfSchool(tpl.school_id, adminUserId);

    if (tpl.is_locked) {
      throw new BadRequestException('Cannot delete a locked template');
    }

    const inUse = await (this.prisma as any).academicYear.findFirst({
      where: { term_template_id: id },
      select: { id: true },
    });
    if (inUse) {
      throw new BadRequestException(
        'Cannot delete template in use by academic years',
      );
    }

    return (this.prisma as any).termTemplate.delete({ where: { id } });
  }

  // Years
  async listYears(schoolId: string, adminUserId: string) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    return (this.prisma as any).academicYear.findMany({
      where: { school_id: schoolId },
      orderBy: { start_date: 'desc' },
      include: {
        term_template: {
          select: {
            id: true,
            name: true,
            is_locked: true,
          },
        },
      },
    });
  }

  async createYear(
    schoolId: string,
    adminUserId: string,
    data: {
      name: string;
      startDate: Date;
      endDate: Date;
      termTemplateId: string;
    },
  ) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);

    // Validate dates
    if (data.startDate >= data.endDate) {
      throw new BadRequestException('Start Date must be before End Date');
    }

    const tpl = await (this.prisma as any).termTemplate.findUnique({
      where: { id: data.termTemplateId },
    });
    if (!tpl) throw new NotFoundException('Term template not found');
    if (tpl.school_id !== schoolId)
      throw new ForbiddenException('Template not accessible for this school');

    // Check if template is locked (shouldn't prevent creation, but good to know)
    if (tpl.is_locked) {
      // Template is already locked, which is fine
    }

    // Check for duplicate year name in school
    const existingYear = await (this.prisma as any).academicYear.findUnique({
      where: {
        school_id_name: { school_id: schoolId, name: data.name.trim() },
      },
    });
    if (existingYear) {
      throw new BadRequestException(
        'An academic year with this name already exists for this school',
      );
    }

    // Note: Overlapping academic years are allowed in rare cases (e.g., transition periods,
    // special programs, or administrative needs). No validation is enforced to prevent overlaps.

    // Create year. We no longer create per-year Term records; term names come from the template.
    const created = await this.prisma.$transaction(async (tx) => {
      const year = await (tx as any).academicYear.create({
        data: {
          school_id: schoolId,
          name: data.name.trim(),
          start_date: data.startDate,
          end_date: data.endDate,
          status: 'planned',
          term_template_id: data.termTemplateId,
        },
      });

      // Lock template if not already locked (auto-lock on first use)
      if (!tpl.is_locked) {
        await (tx as any).termTemplate.update({
          where: { id: tpl.id },
          data: { is_locked: true },
        });
      }

      return year;
    });
    return created;
  }

  async getYear(yearId: string, adminUserId: string) {
    const year = await (this.prisma as any).academicYear.findUnique({
      where: { id: yearId },
      include: {
        term_template: {
          include: {
            term_template_items: { orderBy: { ordinal: 'asc' } },
          },
        },
      },
    });
    if (!year) throw new NotFoundException('Academic year not found');

    await this.assertIsAdminOfSchool(year.school_id, adminUserId);
    // Attach terms derived from the template items for backward-compatible API shape
    const items = year.term_template?.term_template_items || [];
    const mapped = items.map((it: any) => ({
      id: it.id,
      ordinal: it.ordinal,
      name: it.name,
      startDate: it.start_date,
      endDate: it.end_date,
    }));
    return {
      ...year,
      terms: mapped,
    };
  }

  async listTerms(yearId: string, adminUserId: string) {
    const year = await (this.prisma as any).academicYear.findUnique({
      where: { id: yearId },
      include: {
        term_template: {
          include: { term_template_items: { orderBy: { ordinal: 'asc' } } },
        },
      },
    });
    if (!year) throw new NotFoundException('Academic year not found');

    await this.assertIsAdminOfSchool(year.school_id, adminUserId);
    const items = year.term_template?.term_template_items || [];
    return items.map((it: any) => ({
      ordinal: it.ordinal,
      name: it.name,
      startDate: it.start_date,
      endDate: it.end_date,
    }));
  }

  async getTerm(termId: string, adminUserId: string) {
    const term = await (this.prisma as any).termTemplateItem.findUnique({
      where: { id: termId },
      include: {
        term_template: {
          include: {
            academic_years: {
              where: { status: 'active' }, // or whatever logic to find the year
            },
          },
        },
      },
    });
    if (!term) throw new NotFoundException('Term not found');

    // Assert admin of school - need to get school_id from term_template
    await this.assertIsAdminOfSchool(term.term_template.school_id, adminUserId);

    return {
      id: term.id,
      ordinal: term.ordinal,
      name: term.name,
      startDate: term.start_date,
      endDate: term.end_date,
    };
  }

  async updateYearStatus(
    yearId: string,
    adminUserId: string,
    status: 'planned' | 'active' | 'closed',
  ) {
    const year = await (this.prisma as any).academicYear.findUnique({
      where: { id: yearId },
    });
    if (!year) throw new NotFoundException('Academic year not found');

    await this.assertIsAdminOfSchool(year.school_id, adminUserId);

    // Validate status transitions
    if (year.status === 'closed' && status !== 'closed') {
      throw new BadRequestException(
        'Cannot change status of a closed academic year',
      );
    }

    // Ensure only one ACTIVE academic year per school.
    // Note: This is an application-level guard. For full protection against race conditions,
    // consider adding a DB-level unique partial index on (school_id) where status = 'active'.
    if (status === 'active') {
      return this.prisma.$transaction(async (tx) => {
        const existingActive = await tx.academicYear.findFirst({
          where: {
            school_id: year.school_id,
            status: 'active',
            NOT: { id: yearId },
          },
          select: { id: true, name: true, start_date: true, end_date: true },
        });

        if (existingActive) {
          const now = new Date();
          const start: Date | null = existingActive.start_date as any;
          const end: Date | null = existingActive.end_date as any;

          // If the currently active year still covers today, prevent activation.
          if (start && end && now >= start && now <= end) {
            throw new BadRequestException(
              `Cannot activate this academic year because another year is currently active (${existingActive.name}) and its date range still includes today. Close the active year first.`,
            );
          }

          // Otherwise, the existing active year is out of its date range -> deactivate it
          await tx.academicYear.update({
            where: { id: existingActive.id },
            data: { status: 'closed' },
          });
        }

        return tx.academicYear.update({
          where: { id: yearId },
          data: { status },
        });
      });
    }

    return this.prisma.academicYear.update({
      where: { id: yearId },
      data: { status },
    });
  }
}
