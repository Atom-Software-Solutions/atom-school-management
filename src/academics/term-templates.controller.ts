import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { AcademicsService } from './academics.service';
import { CreateTermTemplateDto } from './dto/create-term-template.dto';
import { UpdateTermTemplateDto } from './dto/update-term-template.dto';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';

@Controller('schools/:schoolId/term-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class TermTemplatesController {
  constructor(private readonly academics: AcademicsService) {}

  @Get()
  list(@Param('schoolId') schoolId: string, @Request() req: AuthenticatedRequest) {
    const adminUserId = req.user?.id as string;
    return this.academics.listTermTemplates(schoolId, adminUserId);
  }

  @Post()
  create(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateTermTemplateDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = req.user?.id as string;
    return this.academics.createTermTemplate(schoolId, adminUserId, dto);
  }

  @Patch(':id')
  update(
    @Param('schoolId') schoolId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTermTemplateDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = req.user?.id as string;
    return this.academics.updateTermTemplate(id, adminUserId, dto);
  }

  @Get(':id')
  get(
    @Param('schoolId') schoolId: string,
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = req.user?.id as string;
    return this.academics.getTermTemplate(id, adminUserId);
  }

  @Delete(':id')
  remove(
    @Param('schoolId') schoolId: string,
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = req.user?.id as string;
    return this.academics.deleteTermTemplate(id, adminUserId);
  }
}
