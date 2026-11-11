import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { ResultsService } from './results.service';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';

@Controller('students/:studentId/results')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN', 'PARENT')
export class StudentResultsController {
  constructor(private readonly resultsService: ResultsService) { }

  @Get()
  getGrades(
    @Param('studentId') studentId: string,
    @Query('yearId') yearId: string,
    @Query('termItemId') termItemId: string,
    @Query('subjectId') subjectId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user) throw new ForbiddenException('Authentication required');
    return this.resultsService.getStudentGradesForViewer(
      studentId,
      req.user,
      yearId,
      termItemId,
      subjectId,
    );
  }

  @Get('summary')
  getAcademicSummary(
    @Param('studentId') studentId: string,
    @Query('yearId') yearId: string,
    @Query('termItemId') termItemId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user) throw new ForbiddenException('Authentication required');
    if (!yearId || !termItemId) throw new BadRequestException('yearId and termItemId query parameters are required');
    return this.resultsService.getStudentAcademicSummaryForViewer(
      studentId,
      req.user,
      yearId,
      termItemId,
    );
  }
}
