import { Controller, ForbiddenException, Get, Param, Query, Request, UseGuards } from '@nestjs/common';
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
    @Query('termId') termId: string,
    @Query('subjectId') subjectId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    // TODO: Add parent permission check (can only view their own children's results)
    return this.resultsService.getStudentGrades(studentId, req.user.id, termId, subjectId);
  }

  @Get('summary')
  getAcademicSummary(@Param('studentId') studentId: string, @Query('termId') termId: string, @Request() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    if (!termId) {
      throw new ForbiddenException('termId query parameter is required');
    }
    // TODO: Add parent permission check
    return this.resultsService.getStudentAcademicSummary(studentId, req.user.id, termId);
  }
}

