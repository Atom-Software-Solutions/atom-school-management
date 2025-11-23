import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AcademicsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertIsAdminOfSchool(schoolId: string, userId: string) {
    const rel = await this.prisma.schoolAdmin.findUnique({
      where: { school_id_user_id: { school_id: schoolId, user_id: userId } },
    });
    if (!rel) throw new ForbiddenException('Insufficient permissions for this school');
  }

  /**
   * Validates term structure: ordinals must be sequential starting from 1, no duplicates, names must be non-empty
   */
  private validateTermStructure(structure: Array<{ ordinal: number; name: string }>): void {
    if (!Array.isArray(structure) || structure.length === 0) {
      throw new BadRequestException('structure must be a non-empty array');
    }

    // Check for duplicate ordinals
    const ordinals = structure.map(t => t.ordinal);
    const uniqueOrdinals = new Set(ordinals);
    if (ordinals.length !== uniqueOrdinals.size) {
      throw new BadRequestException('structure contains duplicate ordinals');
    }

    // Validate that ordinals start from 1 and are sequential
    const sortedOrdinals = [...ordinals].sort((a, b) => a - b);
    for (let i = 0; i < sortedOrdinals.length; i++) {
      if (sortedOrdinals[i] !== i + 1) {
        throw new BadRequestException('structure ordinals must start from 1 and be sequential');
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
    const existingOrdinals = new Set(existingStructure.map(t => t.ordinal));
    const newOrdinals = new Set(newStructure.map(t => t.ordinal));

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
        throw new BadRequestException(`A term template with this ${fieldName} already exists for this school`);
      }
    }
    throw error;
  }

  // Term templates
  async listTermTemplates(schoolId: string, adminUserId: string) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    return (this.prisma as any).termTemplate.findMany({ where: { school_id: schoolId }, orderBy: { name: 'asc' } });
  }

  async createTermTemplate(schoolId: string, adminUserId: string, data: { name: string; structure: Array<{ ordinal: number; name: string }> }) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    this.validateTermStructure(data.structure);

    try {
      return await (this.prisma as any).termTemplate.create({
        data: {
          school_id: schoolId,
          name: data.name.trim(),
          structure: data.structure,
        },
      });
    } catch (e: any) {
      this.handlePrismaUniqueError(e, 'name');
    }
  }

  async updateTermTemplate(id: string, adminUserId: string, data: { name?: string; structure?: Array<{ ordinal: number; name: string }> }) {
    const tpl = await (this.prisma as any).termTemplate.findUnique({ where: { id } });
    if (!tpl) throw new NotFoundException('Term template not found');

    await this.assertIsAdminOfSchool(tpl.school_id, adminUserId);

    const updateData: any = {};

    // Handle name update - only check for duplicates if name actually changed
    if (data.name !== undefined) {
      const trimmedName = data.name.trim();
      if (trimmedName !== tpl.name) {
        const existing = await (this.prisma as any).termTemplate.findUnique({
          where: { school_id_name: { school_id: tpl.school_id, name: trimmedName } },
        });
        if (existing) {
          throw new BadRequestException('A term template with this name already exists for this school');
        }
        updateData.name = trimmedName;
      }
    }

    // Handle structure update
    if (data.structure !== undefined) {
      this.validateTermStructure(data.structure);

      // If template is locked, validate that existing terms are preserved
      if (tpl.is_locked) {
        const existingStructure: Array<{ ordinal: number; name: string }> = tpl.structure as any;
        this.validateLockedTemplateStructure(existingStructure, data.structure);
      }

      updateData.structure = data.structure;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    try {
      return await (this.prisma as any).termTemplate.update({
        where: { id },
        data: updateData,
      });
    } catch (e: any) {
      this.handlePrismaUniqueError(e, 'name');
    }
  }

  async lockTemplate(id: string, adminUserId: string) {
    const tpl = await (this.prisma as any).termTemplate.findUnique({ where: { id } });
    if (!tpl) throw new NotFoundException('Term template not found');
    
    await this.assertIsAdminOfSchool(tpl.school_id, adminUserId);
    
    if (tpl.is_locked) {
      throw new BadRequestException('Template is already locked');
    }
    
    return (this.prisma as any).termTemplate.update({ where: { id }, data: { is_locked: true } });
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

  async createYear(schoolId: string, adminUserId: string, data: { name: string; startDate: Date; endDate: Date; termTemplateId: string }) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    
    // Validate dates
    if (data.startDate >= data.endDate) {
      throw new BadRequestException('startDate must be before endDate');
    }

    const tpl = await (this.prisma as any).termTemplate.findUnique({ where: { id: data.termTemplateId } });
    if (!tpl) throw new NotFoundException('Term template not found');
    if (tpl.school_id !== schoolId) throw new ForbiddenException('Template not accessible for this school');
    
    // Check if template is locked (shouldn't prevent creation, but good to know)
    if (tpl.is_locked) {
      // Template is already locked, which is fine
    }

    // Check for duplicate year name in school
    const existingYear = await (this.prisma as any).academicYear.findUnique({
      where: { school_id_name: { school_id: schoolId, name: data.name.trim() } },
    });
    if (existingYear) {
      throw new BadRequestException('An academic year with this name already exists for this school');
    }

    // Note: Overlapping academic years are allowed in rare cases (e.g., transition periods, 
    // special programs, or administrative needs). No validation is enforced to prevent overlaps.

    // Create year and instantiate terms from template.structure
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
      const structure: Array<{ ordinal: number; name: string }> = tpl.structure as any;
      await (tx as any).term.createMany({
        data: structure.map((t) => ({
          academic_year_id: year.id,
          ordinal: t.ordinal,
          name: t.name,
          // Start/end dates must be updated later via PATCH; default to year bounds
          start_date: data.startDate,
          end_date: data.endDate,
        })),
      });
      // Lock template if not already locked (auto-lock on first use)
      if (!tpl.is_locked) {
        await (tx as any).termTemplate.update({ where: { id: tpl.id }, data: { is_locked: true } });
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
          select: {
            id: true,
            name: true,
            is_locked: true,
          },
        },
        terms: {
          orderBy: { ordinal: 'asc' },
        },
      },
    });
    if (!year) throw new NotFoundException('Academic year not found');
    
    await this.assertIsAdminOfSchool(year.school_id, adminUserId);
    return year;
  }

  async listTerms(yearId: string, adminUserId: string) {
    const year = await (this.prisma as any).academicYear.findUnique({ where: { id: yearId } });
    if (!year) throw new NotFoundException('Academic year not found');
    
    await this.assertIsAdminOfSchool(year.school_id, adminUserId);
    return (this.prisma as any).term.findMany({ 
      where: { academic_year_id: yearId }, 
      orderBy: { ordinal: 'asc' } 
    });
  }

  async updateYearStatus(yearId: string, adminUserId: string, status: 'planned' | 'active' | 'closed') {
    const year = await (this.prisma as any).academicYear.findUnique({ where: { id: yearId } });
    if (!year) throw new NotFoundException('Academic year not found');
    
    await this.assertIsAdminOfSchool(year.school_id, adminUserId);
    
    // Validate status transitions
    if (year.status === 'closed' && status !== 'closed') {
      throw new BadRequestException('Cannot change status of a closed academic year');
    }
    
    return (this.prisma as any).academicYear.update({ where: { id: yearId }, data: { status } });
  }
}
