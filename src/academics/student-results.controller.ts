import { BadRequestException, Controller, ForbiddenException, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { ResultsService } from './results.service';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';

@Controller('students/:studentId/results')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN', 'PARENT')
export class StudentResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Get()
  getGrades(
    @Param('studentId') studentId: string,
    @Query('yearId') yearId: string,
    @Query('termName') termName: string,
    @Query('subjectId') subjectId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    return this.resultsService.getStudentGradesForViewer(studentId, req.user, yearId, termName, subjectId);
  }

  @Get('summary')
  getAcademicSummary(@Param('studentId') studentId: string, @Query('yearId') yearId: string, @Query('termName') termName: string, @Request() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    if (!yearId || !termName) {
      throw new BadRequestException('yearId and termName query parameters are required');
    }
    return this.resultsService.getStudentAcademicSummaryForViewer(studentId, req.user, yearId, termName);
  }
}

