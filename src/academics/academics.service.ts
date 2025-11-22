import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
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

  // Term templates
  async listTermTemplates(schoolId: string, adminUserId: string) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    return (this.prisma as any).termTemplate.findMany({ where: { school_id: schoolId }, orderBy: { name: 'asc' } });
  }

  async createTermTemplate(schoolId: string, adminUserId: string, data: { name: string; structure: any }) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    if (!Array.isArray(data.structure) || data.structure.length === 0) throw new BadRequestException('structure must be a non-empty array');
    return (this.prisma as any).termTemplate.create({ data: { school_id: schoolId, name: data.name, structure: data.structure } });
  }

  async lockTemplate(id: string, adminUserId: string, schoolId: string) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    const tpl = await (this.prisma as any).termTemplate.findUnique({ where: { id } });
    if (!tpl || tpl.school_id !== schoolId) throw new ForbiddenException('Template not accessible');
    return (this.prisma as any).termTemplate.update({ where: { id }, data: { is_locked: true } });
  }

  // Years
  async listYears(schoolId: string, adminUserId: string) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    return (this.prisma as any).academicYear.findMany({ where: { school_id: schoolId }, orderBy: { start_date: 'desc' } });
  }

  async createYear(schoolId: string, adminUserId: string, data: { name: string; startDate: Date; endDate: Date; termTemplateId: string }) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    const tpl = await (this.prisma as any).termTemplate.findUnique({ where: { id: data.termTemplateId } });
    if (!tpl || tpl.school_id !== schoolId) throw new ForbiddenException('Template not accessible');
    // Create year and instantiate terms from template.structure
    const created = await this.prisma.$transaction(async (tx) => {
      const year = await (tx as any).academicYear.create({
        data: {
          school_id: schoolId,
          name: data.name,
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
      // Lock template if not already
      if (!tpl.is_locked) {
        await (tx as any).termTemplate.update({ where: { id: tpl.id }, data: { is_locked: true } });
      }
      return year;
    });
    return created;
  }

  async getYear(yearId: string, adminUserId: string, schoolId: string) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    const year = await (this.prisma as any).academicYear.findUnique({ where: { id: yearId } });
    if (!year || year.school_id !== schoolId) throw new ForbiddenException('Year not accessible');
    return year;
  }

  async listTerms(yearId: string, adminUserId: string, schoolId: string) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    const year = await (this.prisma as any).academicYear.findUnique({ where: { id: yearId } });
    if (!year || year.school_id !== schoolId) throw new ForbiddenException('Year not accessible');
    return (this.prisma as any).term.findMany({ where: { academic_year_id: yearId }, orderBy: { ordinal: 'asc' } });
  }

  async updateYearStatus(yearId: string, adminUserId: string, schoolId: string, status: 'planned' | 'active' | 'closed') {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    const year = await (this.prisma as any).academicYear.findUnique({ where: { id: yearId } });
    if (!year || year.school_id !== schoolId) throw new ForbiddenException('Year not accessible');
    return (this.prisma as any).academicYear.update({ where: { id: yearId }, data: { status } });
  }
}
