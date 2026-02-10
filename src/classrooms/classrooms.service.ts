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
      orderBy: [{ ordinal: 'asc' }, { name: 'asc' }],
    });
  }

  async createDefinition(
    schoolId: string,
    adminUserId: string,
    data: { name: string; level?: string | null; ordinal: number },
  ) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    // Ensure ordinal is unique within the school (ignore archived definitions)
    const existingOrdinal = await (this.prisma as any).classroomDefinition.findFirst({
      where: { school_id: schoolId, ordinal: data.ordinal, is_archived: false },
    });
    if (existingOrdinal) {
      throw new BadRequestException('A classroom definition with this ordinal already exists for this school');
    }
    try {
      return await (this.prisma as any).classroomDefinition.create({
        data: {
          school_id: schoolId,
          name: data.name.trim(),
          level: data.level?.trim() || null,
          ordinal: data.ordinal,
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

  async updateDefinitionById(
    id: string,
    adminUserId: string,
    data: { name?: string; level?: string | null; isArchived?: boolean; ordinal?: number },
  ) {
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
    if (data.ordinal !== undefined) {
      // If ordinal is changing, ensure no other (non-archived) definition in the same school uses it
      if (data.ordinal !== definition.ordinal) {
        const conflict = await (this.prisma as any).classroomDefinition.findFirst({
          where: { school_id: definition.school_id, ordinal: data.ordinal, is_archived: false, NOT: { id } },
        });
        if (conflict) {
          throw new BadRequestException('A classroom definition with this ordinal already exists for this school');
        }
      }
      updateData.ordinal = data.ordinal;
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

  async deleteDefinitionById(id: string, adminUserId: string) {
    const definition = await (this.prisma as any).classroomDefinition.findUnique({ where: { id } });
    if (!definition) throw new NotFoundException('Classroom definition not found');

    await this.assertIsAdminOfSchool(definition.school_id, adminUserId);

    if (definition.is_archived) throw new BadRequestException('Classroom definition already deleted');

    return (this.prisma as any).classroomDefinition.update({ where: { id }, data: { is_archived: true } });
  }

  // Offerings have been removed; enrollments operate directly on classroom definitions.

  // Enrollments
  async enrollStudent(yearId: string, definitionId: string, studentId: string, adminUserId: string, schoolId: string, startDate?: Date) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student || student.school_id !== schoolId) {
      throw new ForbiddenException('Student not accessible for this school');
    }

    const year = await (this.prisma as any).academicYear.findUnique({ where: { id: yearId } });
    if (!year) throw new NotFoundException('Academic year not found');
    if (year.school_id !== schoolId) throw new ForbiddenException('Academic year not accessible');

    const definition = await (this.prisma as any).classroomDefinition.findUnique({ where: { id: definitionId } });
    if (!definition || definition.school_id !== year.school_id) throw new ForbiddenException('Classroom definition not accessible');
    if (definition.is_archived) throw new BadRequestException('Classroom definition is archived');

    const effectiveStartDate = startDate ?? new Date();

    if (year.start_date && effectiveStartDate < year.start_date) {
      throw new BadRequestException('startDate must be within the academic year');
    }
    if (year.end_date && effectiveStartDate > year.end_date) {
      throw new BadRequestException('startDate must be within the academic year');
    }

    // Ensure no active enrollment for this student in this academic year
    const existing = await (this.prisma as any).studentEnrollment.findFirst({
      where: {
        student_id: studentId,
        academic_year_id: yearId,
        deleted_at: null,
        OR: [{ end_date: null }, { status: 'active' }],
      },
    });
    if (existing) throw new BadRequestException('Student already has an active enrollment in this academic year');

    // Disallow returning to same classroom definition in later years
    const priorSameClass = await (this.prisma as any).studentEnrollment.findFirst({
      where: {
        student_id: studentId,
        status: { in: ['completed'] },
        classroom_definition_id: definitionId,
        academic_year: { start_date: { lt: year.start_date } },
      },
      include: { academic_year: true },
    });
    if (priorSameClass) throw new BadRequestException('Student cannot return to the same classroom in a later academic year');

    return (this.prisma as any).studentEnrollment.create({
      data: {
        student_id: studentId,
        classroom_definition_id: definitionId,
        academic_year_id: yearId,
        start_date: effectiveStartDate,
        status: 'active',
      },
    });
  }

  async completeEnrollment(enrollmentId: string, adminUserId: string, schoolId: string, endDate?: Date, status: 'completed' | 'withdrawn' = 'completed') {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    const enr = await (this.prisma as any).studentEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { academic_year: true },
    });
    if (!enr || enr.academic_year.school_id !== schoolId) throw new ForbiddenException('Enrollment not accessible');
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

  async updateEnrollmentStatus(enrollmentId: string, status: 'pending' | 'active' | 'completed' | 'withdrawn', adminUserId: string, schoolId: string) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    const enr = await (this.prisma as any).studentEnrollment.findUnique({ where: { id: enrollmentId }, include: { academic_year: true } });
    if (!enr || enr.academic_year.school_id !== schoolId) throw new ForbiddenException('Enrollment not accessible');
    return (this.prisma as any).studentEnrollment.update({ where: { id: enrollmentId }, data: { status } });
  }

  async deleteEnrollment(enrollmentId: string, adminUserId: string, schoolId: string, reason?: string) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    const enr = await (this.prisma as any).studentEnrollment.findUnique({ where: { id: enrollmentId }, include: { academic_year: true } });
    if (!enr || enr.academic_year.school_id !== schoolId) throw new ForbiddenException('Enrollment not accessible');
    if (enr.deleted_at) throw new BadRequestException('Enrollment already deleted');
    const now = new Date();
    return (this.prisma as any).studentEnrollment.update({ where: { id: enrollmentId }, data: { deleted_at: now, reason: reason ?? null, status: 'withdrawn', end_date: enr.end_date ?? now } });
  }

  async bulkEnrollStudents(yearId: string, definitionId: string, enrollments: { studentId: string; startDate?: Date }[], adminUserId: string, schoolId: string) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);

    if (!enrollments || enrollments.length === 0) {
      throw new BadRequestException('No enrollments provided');
    }

    // Validate year and definition
    const year = await (this.prisma as any).academicYear.findUnique({ where: { id: yearId } });
    if (!year) throw new NotFoundException('Academic year not found');
    if (year.school_id !== schoolId) throw new ForbiddenException('Academic year not accessible');

    const definition = await (this.prisma as any).classroomDefinition.findUnique({ where: { id: definitionId } });
    if (!definition || definition.school_id !== year.school_id) throw new ForbiddenException('Classroom definition not accessible');
    if (definition.is_archived) throw new BadRequestException('Classroom definition is archived');

    const academicYearId = yearId;

    // Validate all students exist and belong to the school
    const studentIds = enrollments.map(e => e.studentId);
    const students = await this.prisma.student.findMany({
      where: { id: { in: studentIds }, school_id: schoolId },
    });
    const foundStudentIds = students.map(s => s.id);
    const missingStudents = studentIds.filter(id => !foundStudentIds.includes(id));
    if (missingStudents.length > 0) {
      throw new BadRequestException(`Students not found or not accessible: ${missingStudents.join(', ')}`);
    }

    // Check for existing active enrollments
    const existingEnrollments = await (this.prisma as any).studentEnrollment.findMany({
      where: {
        student_id: { in: studentIds },
        academic_year_id: academicYearId,
        deleted_at: null,
        OR: [{ end_date: null }, { status: 'active' }],
      },
      include: { student: { select: { student_no: true } } },
    });
    if (existingEnrollments.length > 0) {
      const conflictingStudents = existingEnrollments.map(e => e.student.student_no);
      throw new BadRequestException(`Students already have active enrollments in this academic year: ${conflictingStudents.join(', ')}`);
    }

    // Check for returning to same classroom definition in later years
    const priorSameClassEnrollments = await (this.prisma as any).studentEnrollment.findMany({
      where: {
        student_id: { in: studentIds },
        status: { in: ['completed'] },
        classroom_definition_id: definitionId,
        academic_year: { start_date: { lt: year.start_date } },
      },
      include: { student: { select: { student_no: true } } },
    });
    if (priorSameClassEnrollments.length > 0) {
      const conflictingStudents = priorSameClassEnrollments.map(e => e.student.student_no);
      throw new BadRequestException(`Students cannot return to the same classroom in a later academic year: ${conflictingStudents.join(', ')}`);
    }

    // Create enrollments in a transaction
    return await this.prisma.$transaction(async (tx: any) => {
      const createdEnrollments: any[] = [];
      const errors: { studentId: string; error: string }[] = [];

      for (const enrollment of enrollments) {
        try {
          const effectiveStartDate = enrollment.startDate ?? new Date();

          if (year.start_date && effectiveStartDate < year.start_date) {
            throw new BadRequestException('startDate must be within the academic year');
          }
          if (year.end_date && effectiveStartDate > year.end_date) {
            throw new BadRequestException('startDate must be within the academic year');
          }

          const created = await tx.studentEnrollment.create({
            data: {
              student_id: enrollment.studentId,
              classroom_definition_id: definitionId,
              academic_year_id: academicYearId,
              start_date: effectiveStartDate,
              status: 'active',
            },
          });
          createdEnrollments.push(created);
        } catch (error) {
          errors.push({
            studentId: enrollment.studentId,
            error: `Failed to enroll student ${enrollment.studentId}: ${error.message || 'Unknown error'}`,
          });
        }
      }

      return {
        created: createdEnrollments.length,
        failed: errors.length,
        enrollments: createdEnrollments,
        errors,
      };
    });
  }
}
