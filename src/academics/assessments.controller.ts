import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { ResultsService } from './results.service';

@Controller('schools/:schoolId/assessments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class AssessmentsController {
  constructor(private readonly resultsService: ResultsService) { }

  @Get()
  async list(
    @Param('schoolId') schoolId: string,
    @Query('yearId') yearId: string,
    @Query('termItemId') termItemId: string,
    @Request() req: AuthenticatedRequest,
    @Query('componentId') componentId?: string,
    @Query('definitionId') definitionId?: string,
  ) {
    if (!req.user) throw new ForbiddenException('Authentication required');

    if (!yearId || !termItemId) {
      throw new BadRequestException('yearId and termItemId are required');
    }

    if (definitionId) {
      const res = await this.resultsService.listAssessmentsByDefinition(
        schoolId,
        req.user.id,
        yearId,
        termItemId,
        definitionId,
      );
      return res;
    }
    const res = await this.resultsService.listAssessments(
      schoolId,
      req.user.id,
      yearId,
      termItemId,
      componentId,
    );
    return res;
  }

  @Post()
  async create(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateAssessmentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user) throw new ForbiddenException('Authentication required');
    // Optionally, check for componentId here if you want extra validation
    if (!dto.componentId) {
      throw new BadRequestException('componentId is required');
    }
    const created = await this.resultsService.createAssessment(schoolId, req.user.id, dto);
    return created;
  }

  @Get(':id')
  async get(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    if (!req.user) throw new ForbiddenException('Authentication required');
    const res = await this.resultsService.getAssessment(id, req.user.id);
    return res;
  }

  @Get(':id/enrolled-students')
  async getEnrolledStudents(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user) throw new ForbiddenException('Authentication required');
    return this.resultsService.getEnrolledStudentsForAssessment(
      id,
      req.user.id,
    );
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user) throw new ForbiddenException('Authentication required');
    const res = await this.resultsService.updateAssessment(id, req.user.id, dto);
    return res;
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    if (!req.user) throw new ForbiddenException('Authentication required');
    return this.resultsService.deleteAssessment(id, req.user.id);
  }

  @Get('by-component/:componentId')
  async listByComponent(
    @Param('schoolId') schoolId: string,
    @Param('componentId') componentId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user) throw new ForbiddenException('Authentication required');
    const res = await this.resultsService.listAssessmentsByComponent(schoolId, req.user.id, componentId);
    return res;
  }
}
