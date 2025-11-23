import { Injectable, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClassroomsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertIsAdminOfSchool(schoolId: string, userId: string) {
    const rel = await this.prisma.schoolAdmin.findUnique({
      where: { school_id_user_id: { school_id: schoolId, user_id: userId } },
    });
    if (!rel) throw new ForbiddenException('Insufficient permissions for this school');
  }

  /**
   * Handles Prisma unique constraint errors and converts them to user-friendly messages
   */
  private handlePrismaUniqueError(error: any, fieldName: string): never {
    if (error?.code === 'P2002' && Array.isArray(error?.meta?.target)) {
      const target = error.meta.target as string[];
      if (target.includes(fieldName)) {
        throw new BadRequestException(`A classroom definition with this ${fieldName} already exists for this school`);
      }
    }
    throw error;
  }

  // Definitions
  async listDefinitions(schoolId: string, adminUserId: string) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    return (this.prisma as any).classroomDefinition.findMany({
      where: { school_id: schoolId, is_archived: false },
      orderBy: { name: 'asc' },
    });
  }

  async createDefinition(schoolId: string, adminUserId: string, data: { name: string; level?: string | null }) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    try {
      return await (this.prisma as any).classroomDefinition.create({
        data: {
          school_id: schoolId,
          name: data.name.trim(),
          level: data.level?.trim() || null,
        },
      });
    } catch (e: any) {
      this.handlePrismaUniqueError(e, 'name');
    }
  }

  async getDefinitionById(id: string, adminUserId: string) {
    const definition = await (this.prisma as any).classroomDefinition.findUnique({ where: { id } });
    if (!definition) throw new NotFoundException('Classroom definition not found');
    
    await this.assertIsAdminOfSchool(definition.school_id, adminUserId);
    
    return definition;
  }

  async updateDefinitionById(id: string, adminUserId: string, data: { name?: string; level?: string | null; isArchived?: boolean }) {
    const definition = await (this.prisma as any).classroomDefinition.findUnique({ where: { id } });
    if (!definition) throw new NotFoundException('Classroom definition not found');
    
    await this.assertIsAdminOfSchool(definition.school_id, adminUserId);

    const updateData: any = {};
    if (data.name !== undefined) {
      // Check for duplicate name if name is changing
      if (data.name.trim() !== definition.name) {
        const existing = await (this.prisma as any).classroomDefinition.findUnique({
          where: { school_id_name: { school_id: definition.school_id, name: data.name.trim() } },
        });
        if (existing) {
          throw new BadRequestException('A classroom definition with this name already exists for this school');
        }
      }
      updateData.name = data.name.trim();
    }
    if (data.level !== undefined) {
      updateData.level = data.level?.trim() || null;
    }
    if (data.isArchived !== undefined) {
      updateData.is_archived = data.isArchived;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    try {
      return await (this.prisma as any).classroomDefinition.update({
        where: { id },
        data: updateData,
      });
    } catch (e: any) {
      this.handlePrismaUniqueError(e, 'name');
    }
  }

  // Offerings
  async listOfferings(yearId: string, adminUserId: string) {
    const year = await (this.prisma as any).academicYear.findUnique({ where: { id: yearId } });
    if (!year) throw new NotFoundException('Academic year not found');
    
    await this.assertIsAdminOfSchool(year.school_id, adminUserId);
    
    return (this.prisma as any).classroomOffering.findMany({
      where: { academic_year_id: yearId },
      include: {
        classroom_definition: {
          select: {
            id: true,
            name: true,
            level: true,
            is_archived: true,
          },
        },
      },
      orderBy: { classroom_definition: { name: 'asc' } },
    });
  }

  async createOffering(yearId: string, adminUserId: string, data: { classroomDefinitionId: string; displayName?: string | null }) {
    const year = await (this.prisma as any).academicYear.findUnique({ where: { id: yearId } });
    if (!year) throw new NotFoundException('Academic year not found');
    
    await this.assertIsAdminOfSchool(year.school_id, adminUserId);

    // Verify classroom definition belongs to the same school
    const definition = await (this.prisma as any).classroomDefinition.findUnique({
      where: { id: data.classroomDefinitionId },
    });
    if (!definition) throw new NotFoundException('Classroom definition not found');
    if (definition.school_id !== year.school_id) {
      throw new ForbiddenException('Classroom definition not accessible for this school');
    }

    // Check for duplicate offering (same definition in same year)
    const existing = await (this.prisma as any).classroomOffering.findUnique({
      where: {
        academic_year_id_classroom_definition_id: {
          academic_year_id: yearId,
          classroom_definition_id: data.classroomDefinitionId,
        },
      },
    });
    if (existing) {
      throw new BadRequestException('A classroom offering for this definition already exists in this academic year');
    }

    try {
      return await (this.prisma as any).classroomOffering.create({
        data: {
          academic_year_id: yearId,
          classroom_definition_id: data.classroomDefinitionId,
          display_name: data.displayName?.trim() || null,
        },
        include: {
          classroom_definition: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new BadRequestException('A classroom offering for this definition already exists in this academic year');
      }
      throw e;
    }
  }

  async getOfferingById(id: string, adminUserId: string) {
    const offering = await (this.prisma as any).classroomOffering.findUnique({
      where: { id },
      include: {
        academic_year: {
          select: {
            id: true,
            name: true,
            school_id: true,
          },
        },
        classroom_definition: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
      },
    });
    if (!offering) throw new NotFoundException('Classroom offering not found');
    
    await this.assertIsAdminOfSchool(offering.academic_year.school_id, adminUserId);
    
    return offering;
  }

  async updateOffering(id: string, adminUserId: string, data: { displayName?: string | null; isActive?: boolean }) {
    const offering = await (this.prisma as any).classroomOffering.findUnique({
      where: { id },
      include: { academic_year: true },
    });
    if (!offering) throw new NotFoundException('Classroom offering not found');
    
    await this.assertIsAdminOfSchool(offering.academic_year.school_id, adminUserId);

    const updateData: any = {};
    if (data.displayName !== undefined) {
      updateData.display_name = data.displayName?.trim() || null;
    }
    if (data.isActive !== undefined) {
      updateData.is_active = data.isActive;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    return (this.prisma as any).classroomOffering.update({
      where: { id },
      data: updateData,
      include: {
        classroom_definition: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
      },
    });
  }

  // Enrollments
  async enrollStudent(offeringId: string, studentId: string, adminUserId: string, schoolId: string, startDate?: Date) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    const offering = await (this.prisma as any).classroomOffering.findUnique({
      where: { id: offeringId },
      include: { academic_year: true, classroom_definition: true },
    });
    if (!offering || offering.academic_year.school_id !== schoolId) throw new ForbiddenException('Offering not accessible');

    const academicYearId = offering.academic_year_id;

    // Ensure no active enrollment for this student in this academic year
    const existing = await (this.prisma as any).studentEnrollment.findFirst({
      where: { student_id: studentId, academic_year_id: academicYearId, end_date: null },
    });
    if (existing) throw new BadRequestException('Student already has an active enrollment in this academic year');

    // Disallow returning to same classroom definition in later years
    const priorSameClass = await (this.prisma as any).studentEnrollment.findFirst({
      where: {
        student_id: studentId,
        status: { in: ['completed'] },
        classroom_offering: {
          classroom_definition_id: offering.classroom_definition_id,
          academic_year: { start_date: { lt: offering.academic_year.start_date } },
        },
      },
      include: { classroom_offering: { include: { academic_year: true } } },
    });
    if (priorSameClass) throw new BadRequestException('Student cannot return to the same classroom in a later academic year');

    return (this.prisma as any).studentEnrollment.create({
      data: {
        student_id: studentId,
        classroom_offering_id: offeringId,
        academic_year_id: academicYearId,
        start_date: startDate ?? new Date(),
        status: 'active',
      },
    });
  }

  async completeEnrollment(enrollmentId: string, adminUserId: string, schoolId: string, endDate?: Date, status: 'completed' | 'withdrawn' = 'completed') {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    const enr = await (this.prisma as any).studentEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { classroom_offering: { include: { academic_year: true } } },
    });
    if (!enr || enr.classroom_offering.academic_year.school_id !== schoolId) throw new ForbiddenException('Enrollment not accessible');
    if (enr.end_date) throw new BadRequestException('Enrollment already closed');
    return (this.prisma as any).studentEnrollment.update({
      where: { id: enrollmentId },
      data: { end_date: endDate ?? new Date(), status },
    });
  }
}
