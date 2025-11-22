import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { ClassroomsService } from './classrooms.service';

interface AuthenticatedRequest extends Request { user: any }

@Controller('schools/:schoolId/classroom-definitions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class ClassroomDefinitionsController {
  constructor(private readonly classroomsService: ClassroomsService) {}

  @Get()
  list(@Param('schoolId') schoolId: string, @Request() req: AuthenticatedRequest) {
    const adminUserId = (req as any).user?.id as string;
    if (!schoolId) throw new BadRequestException('Missing schoolId');
    return this.classroomsService.listDefinitions(schoolId, adminUserId);
  }

  @Post()
  create(
    @Param('schoolId') schoolId: string,
    @Body() body: { name?: string; level?: string | null },
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    if (!schoolId) throw new BadRequestException('Missing schoolId');
    if (!body?.name || body.name.trim() === '') throw new BadRequestException('Missing body.name');
    return this.classroomsService.createDefinition(schoolId, adminUserId, { name: body.name.trim(), level: body.level ?? null });
  }

  @Patch(':id')
  update(
    @Param('schoolId') schoolId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; level?: string | null; is_archived?: boolean },
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    if (!schoolId) throw new BadRequestException('Missing schoolId');
    if (!id) throw new BadRequestException('Missing id');
    return this.classroomsService.updateDefinition(id, adminUserId, schoolId, body ?? {});
  }
}
