import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { ClassroomsService } from './classrooms.service';
import { BulkEnrollStudentsDto } from './dto/bulk-enroll-students.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class EnrollmentsController {
  constructor(private readonly classroomsService: ClassroomsService) { }

  private resolveTenantSchoolId(
    req: AuthenticatedRequest,
    providedSchoolId?: string,
  ): string {
    const tenantSchoolId = req.user?.school_id as string | undefined;
    if (!tenantSchoolId) {
      throw new ForbiddenException(
        'Tenant context not available for this user',
      );
    }
    if (providedSchoolId && providedSchoolId !== tenantSchoolId) {
      throw new ForbiddenException('Cross-tenant access is not allowed');
    }
    return tenantSchoolId;
  }

  @Post('years/:yearId/classroom-definitions/:definitionId/enrollments')
  enroll(
    @Param('yearId') yearId: string,
    @Param('definitionId') definitionId: string,
    @Query('schoolId') schoolId: string,
    @Body() body: { studentId?: string; startDate?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = req.user?.id as string;
    if (!yearId) throw new BadRequestException('Missing yearId');
    if (!definitionId) throw new BadRequestException('Missing definitionId');
    if (!body?.studentId)
      throw new BadRequestException('Missing body.studentId');
    const tenantSchoolId = this.resolveTenantSchoolId(req, schoolId);
    const startDate = body.startDate ? new Date(body.startDate) : undefined;
    return this.classroomsService.enrollStudent(
      yearId,
      definitionId,
      body.studentId,
      adminUserId,
      tenantSchoolId,
      startDate,
    );
  }

  @Post('years/:yearId/classroom-definitions/:definitionId/enrollments/bulk')
  bulkEnroll(
    @Param('yearId') yearId: string,
    @Param('definitionId') definitionId: string,
    @Query('schoolId') schoolId: string,
    @Body() body: BulkEnrollStudentsDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = req.user?.id as string;
    if (!yearId) throw new BadRequestException('Missing yearId');
    if (!definitionId) throw new BadRequestException('Missing definitionId');
    if (!body?.enrollments || body.enrollments.length === 0)
      throw new BadRequestException('Missing or empty enrollments array');
    const tenantSchoolId = this.resolveTenantSchoolId(req, schoolId);
    const enrollments = body.enrollments.map((e) => ({
      studentId: e.studentId,
      startDate: e.startDate ? new Date(e.startDate) : undefined,
    }));
    return this.classroomsService.bulkEnrollStudents(
      yearId,
      definitionId,
      enrollments,
      adminUserId,
      tenantSchoolId,
    );
  }

  @Patch('enrollments/:id/complete')
  complete(
    @Param('id') id: string,
    @Query('schoolId') schoolId: string,
    @Body() body: { endDate?: string; status?: 'completed' | 'withdrawn' },
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = req.user?.id as string;
    if (!id) throw new BadRequestException('Missing id');
    const tenantSchoolId = this.resolveTenantSchoolId(req, schoolId);
    const endDate = body?.endDate ? new Date(body.endDate) : undefined;
    const status = body?.status ?? 'completed';
    return this.classroomsService.completeEnrollment(
      id,
      adminUserId,
      tenantSchoolId,
      endDate,
      status,
    );
  }

  @Patch('enrollments/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Query('schoolId') schoolId: string,
    @Body() body: { status: 'pending' | 'active' | 'completed' | 'withdrawn' },
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = req.user?.id as string;
    if (!id) throw new BadRequestException('Missing id');
    if (!body?.status) throw new BadRequestException('Missing status');
    const tenantSchoolId = this.resolveTenantSchoolId(req, schoolId);
    return this.classroomsService.updateEnrollmentStatus(
      id,
      body.status,
      adminUserId,
      tenantSchoolId,
    );
  }

  @Delete('enrollments/:id')
  async delete(
    @Param('id') id: string,
    @Query('schoolId') schoolId: string,
    @Query('reason') reason: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const adminUserId = req.user?.id as string;
    if (!id) throw new BadRequestException('Missing id');
    const tenantSchoolId = this.resolveTenantSchoolId(req, schoolId);
    return this.classroomsService.deleteEnrollment(
      id,
      adminUserId,
      tenantSchoolId,
      reason,
    );
  }
}
