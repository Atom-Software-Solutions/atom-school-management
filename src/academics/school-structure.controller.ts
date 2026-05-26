import {
  Controller,
  Get,
  Param,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';

@Controller('schools/:schoolId/structure')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class SchoolStructureController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getStructure(
    @Param('schoolId') schoolId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    // Fetch years
    const years = await this.prisma.academicYear.findMany({
      where: { school_id: schoolId },
      orderBy: { name: 'asc' },
    });
    // Fetch terms for all years
    const yearIds = years.map((y) => y.id);
    const terms = await this.prisma.termTemplateItem.findMany({
      where: {
        term_template: { academic_years: { some: { id: { in: yearIds } } } },
      },
      orderBy: { ordinal: 'asc' },
    });
    // Fetch classroom definitions and join with assessments
    const classroomDefinitions = await this.prisma.classroomDefinition.findMany(
      {
        where: { school_id: schoolId },
        orderBy: { name: 'asc' },
      },
    );
    // Fetch all assessments for this school
    const assessments = await this.prisma.assessment.findMany({
      where: {
        component: {
          subject: {
            school_id: schoolId,
          },
        },
      },
      include: {
        academic_year: true,
        term_template_item: true,
        component: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
    // Fetch all subjects for this school
    const subjects = await this.prisma.subject.findMany({
      where: { school_id: schoolId },
      orderBy: { name: 'asc' },
    });
    // Map classroom definitions to include their assessments
    const classroomDefsWithAssessments = classroomDefinitions.map((def) => {
      const defAssessments = assessments.filter(
        (a) => a.classroom_definition_id === def.id,
      );
      return {
        ...def,
        assessments: defAssessments,
      };
    });
    return {
      years,
      terms,
      classroomDefinitions: classroomDefsWithAssessments,
      subjects,
    };
  }
}
