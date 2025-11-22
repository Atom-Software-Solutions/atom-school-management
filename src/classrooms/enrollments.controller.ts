import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { ClassroomsService } from './classrooms.service';

interface AuthenticatedRequest extends Request { user: any }

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class EnrollmentsController {
  constructor(private readonly classroomsService: ClassroomsService) {}

  @Post('classroom-offerings/:offeringId/enrollments')
  enroll(
    @Param('offeringId') offeringId: string,
    @Query('schoolId') schoolId: string,
    @Body() body: { studentId?: string; startDate?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    if (!offeringId) throw new BadRequestException('Missing offeringId');
    if (!schoolId) throw new BadRequestException('Missing schoolId');
    if (!body?.studentId) throw new BadRequestException('Missing body.studentId');
    const startDate = body.startDate ? new Date(body.startDate) : undefined;
    return this.classroomsService.enrollStudent(offeringId, body.studentId, adminUserId, schoolId, startDate);
  }

  @Patch('enrollments/:id/complete')
  complete(
    @Param('id') id: string,
    @Query('schoolId') schoolId: string,
    @Body() body: { endDate?: string; status?: 'completed' | 'withdrawn' },
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = (req as any).user?.id as string;
    if (!id) throw new BadRequestException('Missing id');
    if (!schoolId) throw new BadRequestException('Missing schoolId');
    const endDate = body?.endDate ? new Date(body.endDate) : undefined;
    const status = (body?.status ?? 'completed') as 'completed' | 'withdrawn';
    return this.classroomsService.completeEnrollment(id, adminUserId, schoolId, endDate, status);
  }
}
