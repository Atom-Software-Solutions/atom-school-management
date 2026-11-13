import { Controller, Get, Param, ParseUUIDPipe, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';
import { PrismaService } from '../prisma/prisma.service';
import { BillingAccessService } from './billing-access.service';

/** Lookup data for billing forms: years with term ids, classes and categories in one request. */
@ApiTags('Billing - Options')
@ApiBearerAuth()
@Controller('schools/:schoolId/billing/options')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN', 'SUPER_ADMIN')
export class BillingOptionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BillingAccessService,
  ) {}

  @Get()
  async options(@Param('schoolId', ParseUUIDPipe) schoolId: string, @Request() req: AuthenticatedRequest) {
    await this.access.assertCanRead(schoolId, req.user);
    const [school, years, classrooms, categories] = await Promise.all([
      this.prisma.school.findUnique({ where: { id: schoolId }, select: { currency: true } }),
      this.prisma.academicYear.findMany({
        where: { school_id: schoolId },
        orderBy: { start_date: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          start_date: true,
          end_date: true,
          term_template: {
            select: {
              term_template_items: {
                orderBy: { ordinal: 'asc' },
                select: { id: true, name: true, ordinal: true, start_date: true, end_date: true },
              },
            },
          },
        },
      }),
      this.prisma.classroomDefinition.findMany({
        where: { school_id: schoolId, is_archived: false },
        orderBy: [{ ordinal: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, level: true },
      }),
      this.prisma.feeCategory.findMany({
        where: { school_id: schoolId },
        orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, code: true, is_active: true },
      }),
    ]);

    return {
      currency: school?.currency ?? 'UGX',
      years: years.map(({ term_template, ...y }) => ({ ...y, terms: term_template.term_template_items })),
      classrooms,
      categories,
    };
  }
}
