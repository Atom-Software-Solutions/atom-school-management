import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { AcademicsService } from './academics.service';

interface AuthenticatedRequest extends Request { user: any }

@Controller('schools/:schoolId/term-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class TermTemplatesController {
  constructor(private readonly academics: AcademicsService) {}

  @Get()
  list(@Param('schoolId') schoolId: string, @Request() req: AuthenticatedRequest) {
    const adminUserId = (req as any).user?.id as string;
    if (!schoolId) throw new BadRequestException('Missing schoolId');
    return this.academics.listTermTemplates(schoolId, adminUserId);
  }

  @Post()
  create(
    @Param('schoolId') schoolId: string,
    @Body() body: { name?: string; structure?: Array<{ ordinal: number; name: string }> },
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    if (!schoolId) throw new BadRequestException('Missing schoolId');
    if (!body?.name) throw new BadRequestException('Missing body.name');
    if (!Array.isArray(body.structure)) throw new BadRequestException('Missing body.structure');
    return this.academics.createTermTemplate(schoolId, adminUserId, { name: body.name, structure: body.structure });
  }

  @Patch(':id/lock')
  lock(
    @Param('schoolId') schoolId: string,
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    if (!schoolId) throw new BadRequestException('Missing schoolId');
    if (!id) throw new BadRequestException('Missing id');
    return this.academics.lockTemplate(id, adminUserId, schoolId);
  }
}
