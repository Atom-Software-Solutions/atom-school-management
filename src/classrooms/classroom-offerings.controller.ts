import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { ClassroomsService } from './classrooms.service';
import { Request } from 'express';

interface AuthenticatedRequest extends Request { user: any }

@Controller('years/:yearId/classroom-offerings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class ClassroomOfferingsController {
  constructor(private readonly classroomsService: ClassroomsService) {}

  @Get()
  list(
    @Param('yearId') yearId: string,
    @Query('schoolId') schoolId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    if (!yearId) throw new BadRequestException('Missing yearId');
    if (!schoolId) throw new BadRequestException('Missing schoolId');
    return this.classroomsService.listOfferings(yearId, adminUserId, schoolId);
  }

  @Post()
  create(
    @Param('yearId') yearId: string,
    @Query('schoolId') schoolId: string,
    @Body() body: { classroomDefinitionId: string; displayName?: string | null },
    @Req() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    if (!yearId) throw new BadRequestException('Missing yearId');
    if (!schoolId) throw new BadRequestException('Missing schoolId');
    if (!body?.classroomDefinitionId) throw new BadRequestException('Missing body.classroomDefinitionId');
    return this.classroomsService.createOffering(yearId, adminUserId, schoolId, body);
  }

  @Patch(':id')
  update(
    @Param('yearId') yearId: string,
    @Param('id') id: string,
    @Query('schoolId') schoolId: string,
    @Body() body: { displayName?: string | null; isActive?: boolean },
    @Req() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    if (!yearId) throw new BadRequestException('Missing yearId');
    if (!schoolId) throw new BadRequestException('Missing schoolId');
    if (!id) throw new BadRequestException('Missing id');
    return this.classroomsService.updateOffering(id, adminUserId, schoolId, body);
  }
}
