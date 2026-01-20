import { Injectable, ForbiddenException, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClassroomsService {
  private readonly logger = new Logger(ClassroomsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async assertIsAdminOfSchool(schoolId: string, userId: string) {
    let normalizedSchoolId = (schoolId ?? '').trim();
    const normalizedUserId = (userId ?? '').trim();

    // Guard against malformed URLs where the Swagger-style placeholder "{schoolId}" wasn't replaced properly.
    // We've seen values like: "<uuid>schoolId}" (i.e. only "{" got replaced), which will always fail the lookup.
    if (normalizedSchoolId.toLowerCase().endsWith('schoolid}')) {
      const match = normalizedSchoolId.match(
        /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\{?schoolId\}$/i,
      );

      if (match?.[1]) {
        this.logger.warn(
          `Malformed schoolId param detected (trailing "schoolId}"). Normalizing from ${normalizedSchoolId} -> ${match[1]}`,
        );
        normalizedSchoolId = match[1];
      } else {
        throw new BadRequestException(
          `Malformed schoolId parameter: ${normalizedSchoolId}. Your request URL likely still contains a "{schoolId}" placeholder that wasn't substituted correctly.`,
        );
      }
    }

    const rel = await this.prisma.schoolAdmin.findUnique({
      where: { school_id_user_id: { school_id: normalizedSchoolId, user_id: normalizedUserId } },
    });

    if (!rel) {
      // Helpful debug info (prints to console) to diagnose why a valid SCHOOL_ADMIN is getting 403.
      // We log:
      // - schoolId passed in the route
      // - userId from JWT
      // - all school_ids this user is an admin of (per SchoolAdmin)
      const userSchoolAdmins = await this.prisma.schoolAdmin.findMany({
        where: { user_id: normalizedUserId },
        select: { school_id: true },
      });
      const userSchoolIds = userSchoolAdmins.map((r) => r.school_id);

      this.logger.warn(
        `Insufficient permissions for this school. schoolId(route)=${normalizedSchoolId} userId(jwt)=${normalizedUserId} userSchoolIds(SchoolAdmin)=${JSON.stringify(userSchoolIds)}`,
      );
      console.warn('Insufficient permissions for this school (debug)', {
        schoolIdRoute: normalizedSchoolId,
        userIdJwt: normalizedUserId,
        userSchoolIds,
      });

      throw new ForbiddenException('Insufficient permissions for this school');
    }
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
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student || student.school_id !== schoolId) {
      throw new ForbiddenException('Student not accessible for this school');
    }
    const offering = await (this.prisma as any).classroomOffering.findUnique({
      where: { id: offeringId },
      include: { academic_year: true, classroom_definition: true },
    });
    if (!offering || offering.academic_year.school_id !== schoolId) throw new ForbiddenException('Offering not accessible');
    if (offering.is_active === false) {
      throw new BadRequestException('Classroom offering is not active');
    }

    const academicYearId = offering.academic_year_id;
    const effectiveStartDate = startDate ?? new Date();

    if (offering.academic_year.start_date && effectiveStartDate < offering.academic_year.start_date) {
      throw new BadRequestException('startDate must be within the academic year');
    }
    if (offering.academic_year.end_date && effectiveStartDate > offering.academic_year.end_date) {
      throw new BadRequestException('startDate must be within the academic year');
    }

    // Ensure no active enrollment for this student in this academic year
    const existing = await (this.prisma as any).studentEnrollment.findFirst({
      where: {
        student_id: studentId,
        academic_year_id: academicYearId,
        OR: [{ end_date: null }, { status: 'active' }],
      },
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
        start_date: effectiveStartDate,
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
    const effectiveEndDate = endDate ?? new Date();
    if (enr.start_date && effectiveEndDate < enr.start_date) {
      throw new BadRequestException('endDate cannot be before startDate');
    }
    return (this.prisma as any).studentEnrollment.update({
      where: { id: enrollmentId },
      data: { end_date: effectiveEndDate, status },
    });
  }
}
