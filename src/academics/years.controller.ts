import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { AcademicsService } from './academics.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateYearStatusDto } from './dto/update-year-status.dto';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class YearsController {
  constructor(private readonly academics: AcademicsService) {}

  @Get('schools/:schoolId/years')
  list(@Param('schoolId') schoolId: string, @Request() req: AuthenticatedRequest) {
    const adminUserId = req.user?.id as string;
    return this.academics.listYears(schoolId, adminUserId);
  }

  @Post('schools/:schoolId/years')
  create(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateAcademicYearDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = req.user?.id as string;
    return this.academics.createYear(
      schoolId,
      adminUserId,
      {
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        termTemplateId: dto.termTemplateId,
      },
    );
  }

  @Get('years/:yearId')
  get(@Param('yearId') yearId: string, @Request() req: AuthenticatedRequest) {
    const adminUserId = req.user?.id as string;
    return this.academics.getYear(yearId, adminUserId);
  }

  @Get('years/:yearId/terms')
  listTerms(@Param('yearId') yearId: string, @Request() req: AuthenticatedRequest) {
    const adminUserId = req.user?.id as string;
    return this.academics.listTerms(yearId, adminUserId);
  }

  @Patch('years/:yearId/status')
  updateStatus(
    @Param('yearId') yearId: string,
    @Body() dto: UpdateYearStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = req.user?.id as string;
    return this.academics.updateYearStatus(yearId, adminUserId, dto.status);
  }
}
