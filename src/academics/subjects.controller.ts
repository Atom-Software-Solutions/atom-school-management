import { Body, Controller, Delete, ForbiddenException, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { ResultsService } from './results.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';

@Controller('schools/:schoolId/subjects')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class SubjectsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Get()
  list(
    @Param('schoolId') schoolId: string,
    @Query('includeInactive') includeInactive: string,
    @Request() req: AuthenticatedRequest,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    return this.resultsService.listSubjects(schoolId, req.user.id, includeInactive === 'true');
  }

  @Post()
  create(@Param('schoolId') schoolId: string, @Body() dto: CreateSubjectDto | CreateSubjectDto[], @Request() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    // Support both single subject and array of subjects
    if (Array.isArray(dto)) {
      return this.resultsService.createSubjects(schoolId, req.user.id, dto);
    }
    return this.resultsService.createSubject(schoolId, req.user.id, dto);
  }

  @Get(':id')
  get(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    return this.resultsService.getSubject(id, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSubjectDto, @Request() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    return this.resultsService.updateSubject(id, req.user.id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    return this.resultsService.deleteSubject(id, req.user.id);
  }
}
