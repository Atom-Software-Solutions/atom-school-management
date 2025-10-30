import { BadRequestException, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ClassroomsService } from './classrooms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';

interface AuthenticatedRequest extends Request { user: any }

@Controller('classrooms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class ClassroomsController {
  constructor(private readonly classroomsService: ClassroomsService) {}

  @Get()
  list(@Query('schoolId') schoolId: string, @Request() req: AuthenticatedRequest) {
    const adminUserId = (req as any).user?.id as string;
    if (!schoolId || schoolId.trim() === '') throw new BadRequestException('Missing required query parameter: schoolId');
    return this.classroomsService.list(schoolId, adminUserId);
  }

  @Post()
  create(@Query('schoolId') schoolId: string, @Query('name') name: string, @Request() req: AuthenticatedRequest) {
    const adminUserId = (req as any).user?.id as string;
    if (!schoolId || schoolId.trim() === '') throw new BadRequestException('Missing required query parameter: schoolId');
    if (!name || name.trim() === '') throw new BadRequestException('Missing required query parameter: name');
    return this.classroomsService.create(schoolId, adminUserId, { name: name.trim() });
  }
}
