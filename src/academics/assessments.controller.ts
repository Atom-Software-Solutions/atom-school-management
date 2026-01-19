import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { ResultsService } from './results.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';

@Controller('schools/:schoolId/assessments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class AssessmentsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Get()
  list(
    @Param('schoolId') schoolId: string,
    @Query('termId') termId: string,
    @Query('subjectId') subjectId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    return this.resultsService.listAssessments(schoolId, req.user.id, termId, subjectId);
  }

  @Post()
  create(@Param('schoolId') schoolId: string, @Body() dto: CreateAssessmentDto, @Request() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    return this.resultsService.createAssessment(schoolId, req.user.id, dto);
  }

  @Get(':id')
  get(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    return this.resultsService.getAssessment(id, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAssessmentDto, @Request() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    return this.resultsService.updateAssessment(id, req.user.id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    return this.resultsService.deleteAssessment(id, req.user.id);
  }
}

