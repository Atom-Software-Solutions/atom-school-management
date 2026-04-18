import {
  Body,
  Controller,
  Delete,
  BadRequestException,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
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
    @Query('yearId') yearId: string,
    @Query('termItemId') termItemId: string,
    @Request() req: AuthenticatedRequest,
    @Query('definitionId') definitionId?: string,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }

    // This endpoint requires both yearId and termItemId and returns assessments grouped by classroom definition.
    if (!yearId || !termItemId) {
      throw new BadRequestException('yearId and termItemId are required');
    }

    if (definitionId) {
      return this.resultsService.listAssessmentsByDefinition(
        schoolId,
        req.user.id,
        yearId,
        termItemId,
        definitionId,
      );
    }
    return this.resultsService.listAssessments(
      schoolId,
      req.user.id,
      yearId,
      termItemId,
    );
  }

  @Post()
  create(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateAssessmentDto,
    @Request() req: AuthenticatedRequest,
  ) {
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

  @Get(':id/enrolled-students')
  async getEnrolledStudents(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    return this.resultsService.getEnrolledStudentsForAssessment(
      id,
      req.user.id,
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentDto,
    @Request() req: AuthenticatedRequest,
  ) {
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
