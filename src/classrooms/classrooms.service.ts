import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
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

  // Legacy endpoints (kept for backward compat). Proxy to definitions list/create
  async list(schoolId: string, adminUserId: string) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    return (this.prisma as any).classroomDefinition.findMany({
      where: { school_id: schoolId, is_archived: false },
      orderBy: { name: 'asc' },
    });
  }

  async create(schoolId: string, adminUserId: string, data: { name: string }) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    return (this.prisma as any).classroomDefinition.create({
      data: { school_id: schoolId, name: data.name },
    });
  }

  // Definitions
  async listDefinitions(schoolId: string, adminUserId: string) {
    return this.list(schoolId, adminUserId);
  }

  async createDefinition(schoolId: string, adminUserId: string, data: { name: string; level?: string | null }) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    return (this.prisma as any).classroomDefinition.create({
      data: { school_id: schoolId, name: data.name, level: data.level ?? null },
    });
  }

  async updateDefinition(id: string, adminUserId: string, schoolId: string, data: { name?: string; level?: string | null; is_archived?: boolean }) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    return (this.prisma as any).classroomDefinition.update({ where: { id }, data });
  }

  // Offerings
  async listOfferings(yearId: string, adminUserId: string, schoolId: string) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    const year = await (this.prisma as any).academicYear.findUnique({ where: { id: yearId } });
    if (!year || year.school_id !== schoolId) throw new ForbiddenException('Year not accessible');
    return (this.prisma as any).classroomOffering.findMany({
      where: { academic_year_id: yearId },
      include: { classroom_definition: true },
      orderBy: { classroom_definition: { name: 'asc' } },
    });
  }

  async createOffering(yearId: string, adminUserId: string, schoolId: string, data: { classroomDefinitionId: string; displayName?: string | null }) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    const year = await (this.prisma as any).academicYear.findUnique({ where: { id: yearId } });
    if (!year || year.school_id !== schoolId) throw new ForbiddenException('Year not accessible');
    return (this.prisma as any).classroomOffering.create({
      data: {
        academic_year_id: yearId,
        classroom_definition_id: data.classroomDefinitionId,
        display_name: data.displayName ?? null,
      },
    });
  }

  async updateOffering(id: string, adminUserId: string, schoolId: string, data: { displayName?: string | null; isActive?: boolean }) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    // Basic update without cross-tenant leakage: ensure offering belongs to school's year
    const off = await (this.prisma as any).classroomOffering.findUnique({
      where: { id },
      include: { academic_year: true },
    });
    if (!off || off.academic_year.school_id !== schoolId) throw new ForbiddenException('Offering not accessible');
    return (this.prisma as any).classroomOffering.update({
      where: { id },
      data: { display_name: data.displayName ?? undefined, is_active: data.isActive ?? undefined },
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
