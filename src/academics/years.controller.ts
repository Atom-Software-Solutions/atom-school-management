import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { AcademicsService } from './academics.service';

interface AuthenticatedRequest extends Request { user: any }

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class YearsController {
  constructor(private readonly academics: AcademicsService) {}

  @Get('schools/:schoolId/years')
  list(@Param('schoolId') schoolId: string, @Request() req: AuthenticatedRequest) {
    const adminUserId = (req as any).user?.id as string;
    if (!schoolId) throw new BadRequestException('Missing schoolId');
    return this.academics.listYears(schoolId, adminUserId);
  }

  @Post('schools/:schoolId/years')
  create(
    @Param('schoolId') schoolId: string,
    @Body() body: { name?: string; startDate?: string; endDate?: string; termTemplateId?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    if (!schoolId) throw new BadRequestException('Missing schoolId');
    if (!body?.name || !body.startDate || !body.endDate || !body.termTemplateId) throw new BadRequestException('Missing required fields');
    return this.academics.createYear(
      schoolId,
      adminUserId,
      { name: body.name, startDate: new Date(body.startDate), endDate: new Date(body.endDate), termTemplateId: body.termTemplateId },
    );
  }

  @Get('years/:yearId')
  get(@Param('yearId') yearId: string, @Query('schoolId') schoolId: string, @Request() req: AuthenticatedRequest) {
    const adminUserId = (req as any).user?.id as string;
    if (!yearId) throw new BadRequestException('Missing yearId');
    if (!schoolId) throw new BadRequestException('Missing schoolId');
    return this.academics.getYear(yearId, adminUserId, schoolId);
  }

  @Get('years/:yearId/terms')
  listTerms(@Param('yearId') yearId: string, @Query('schoolId') schoolId: string, @Request() req: AuthenticatedRequest) {
    const adminUserId = (req as any).user?.id as string;
    if (!yearId) throw new BadRequestException('Missing yearId');
    if (!schoolId) throw new BadRequestException('Missing schoolId');
    return this.academics.listTerms(yearId, adminUserId, schoolId);
  }

  @Patch('years/:yearId/status')
  updateStatus(
    @Param('yearId') yearId: string,
    @Query('schoolId') schoolId: string,
    @Body() body: { status?: 'planned' | 'active' | 'closed' },
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    if (!yearId) throw new BadRequestException('Missing yearId');
    if (!schoolId) throw new BadRequestException('Missing schoolId');
    if (!body?.status) throw new BadRequestException('Missing status');
    return this.academics.updateYearStatus(yearId, adminUserId, schoolId, body.status);
  }
}
