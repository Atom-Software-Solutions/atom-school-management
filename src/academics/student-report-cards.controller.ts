import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { ResultsService } from './results.service';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';

@Controller('students/:studentId/report-cards')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN', 'PARENT')
export class StudentReportCardsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Get()
  list(
    @Param('studentId') studentId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user) throw new ForbiddenException('Authentication required');
    return this.resultsService.listStudentReportCardsForViewer(
      studentId,
      req.user,
    );
  }
}
